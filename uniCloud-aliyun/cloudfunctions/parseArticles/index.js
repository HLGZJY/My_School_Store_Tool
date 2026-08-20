'use strict';

const db = uniCloud.database();
const dbCmd = db.command;

// Import common utilities (per D-13) - use local common/ copy for uniCloud deployment
const { ERROR_CODES } = require('./common/constants');
const httpGet = require('./common/httpGet');
const { requireAdmin } = require('./common/verifyAdmin');
const extractSourceIdFromUrl = require('./common/extractSourceIdFromUrl');
const getSourceNameFromDb = require('./common/getSourceNameFromDb');
const getSourcePriorityTier = require('./common/getSourcePriorityTier');

// Import strategy factory (per D-07)
const { getStrategy } = require('./strategies');

// ============ 进度任务管理 ============

/**
 * 创建处理任务
 * Per D-12: Keep full task progress tracking for large batches
 */
async function createTask(linkIds) {
    const now = Date.now();
    const taskId = 'task_' + now + '_' + Math.random().toString(36).substr(2, 9);

    console.log('[parseArticles] 创建任务:', taskId, '共', linkIds.length, '个链接');

    if (linkIds.length > 0) {
        try {
            const existing = await db.collection('url_queue').doc(linkIds[0]).get();
            if (existing.data && existing.data[0]) {
                await db.collection('url_queue').doc(linkIds[0]).update({
                    taskId: taskId,
                    taskInfo: {
                        taskId: taskId,
                        total: linkIds.length,
                        currentIndex: 0,
                        startTime: now,
                        status: 'processing',
                        results: [],
                        linkIds: linkIds,
                        successCount: 0,
                        failedCount: 0
                    }
                });
                console.log('[parseArticles] 任务创建成功');
            }
        } catch (e) {
            console.error('[parseArticles] 创建任务失败:', e);
        }
    }

    return taskId;
}

/**
 * 更新任务进度
 * Per D-12: Task progress tracking is independent of parsing logic
 */
async function updateTaskProgress(linkId, progressInfo) {
    try {
        await db.collection('url_queue').doc(linkId).update({
            taskInfo: progressInfo
        });
    } catch (e) {
        console.error('[parseArticles] 更新任务进度失败:', e);
    }
}

/**
 * 获取任务进度
 * Per D-12: Full task progress tracking preserved
 */
async function getTaskProgress(taskToken, linkIds) {
    if (!taskToken || !linkIds || linkIds.length === 0) {
        return null;
    }

    try {
        const processedCount = await db.collection('url_queue')
            .where({
                _id: dbCmd.in(linkIds),
                status: 'processed'
            })
            .count();

        const processingCount = await db.collection('url_queue')
            .where({
                _id: dbCmd.in(linkIds),
                status: 'processing'
            })
            .count();

        const failedCount = await db.collection('url_queue')
            .where({
                _id: dbCmd.in(linkIds),
                status: 'failed'
            })
            .count();

        const total = linkIds.length;
        const completedCount = processedCount.total + failedCount.total;
        const currentIndex = completedCount;
        const status = currentIndex >= total ? 'completed' : 'processing';

        let currentUrl = '';
        const processingLinks = await db.collection('url_queue')
            .where({
                _id: dbCmd.in(linkIds),
                status: 'processing'
            })
            .limit(1)
            .get();

        if (processingLinks.data && processingLinks.data.length > 0) {
            currentUrl = processingLinks.data[0].url;
        }

        let startTime = Date.now();
        let successCount = processedCount.total;
        const result = await db.collection('url_queue').doc(taskToken).get();
        if (result.data && result.data[0] && result.data[0].taskInfo) {
            startTime = result.data[0].taskInfo.startTime || startTime;
            successCount = result.data[0].taskInfo.successCount || processedCount.total;
        }

        console.log('[parseArticles] 进度: completed=', completedCount, '/', total, 'processing=', processingCount.total);

        return {
            taskId: taskToken,
            total: total,
            currentIndex: currentIndex,
            startTime: startTime,
            status: status,
            successCount: successCount,
            failedCount: failedCount.total,
            currentUrl: currentUrl,
            linkIds: linkIds
        };
    } catch (e) {
        console.error('[parseArticles] 获取任务进度失败:', e);
    }
    return null;
}

/**
 * 清理任务信息
 */
async function clearTaskProgress(linkIds) {
    if (!linkIds || linkIds.length === 0) return;

    try {
        await db.collection('url_queue').doc(linkIds[0]).update({
            taskInfo: dbCmd.remove()
        });
    } catch (e) {
        console.error('[parseArticles] 清理任务进度失败:', e);
    }
}

// ============ 工具函数 (只剩下saveArticle和getCategoryName，不再有重复的httpGet/verifyAdmin等) ============

// Tier retention periods (per D-02): tier1=permanent(null), tier2=2years, tier3=6months
const TIER_RETENTION_MS = {
    tier1: null,
    tier2: 2 * 365 * 24 * 60 * 60 * 1000,
    tier3: 6 * 30 * 24 * 60 * 60 * 1000
};

function computeExpireAt(publishTime, priorityTier) {
    if (!priorityTier || priorityTier === 'tier1') return null;
    const retentionMs = TIER_RETENTION_MS[priorityTier];
    if (!retentionMs) return null;
    return publishTime + retentionMs;
}

/**
 * Strip HTML tags and decode HTML entities to get plain text.
 * Used as a safety net when strategies don't clean content properly.
 */
function stripHtml(html) {
    if (!html || typeof html !== 'string') return '';

    let text = html
        // Remove unwanted structural elements
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/<form[\s\S]*?<\/form>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
        // Remove all remaining HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Decode common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&#\d+;/g, '')
        .replace(/&[a-z]+;/gi, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();

    return text;
}

/**
 * Generate summary from plain text if strategy didn't provide one.
 */
function generateSummary(plainText) {
    if (!plainText) return '';
    const clean = plainText.replace(/\s+/g, ' ').trim();
    return clean.substring(0, 200);
}

/**
 * 保存文章到 articles 集合
 */
async function saveArticle(item, url, sourceIdFromQueue, sourceNameFromQueue, existingArticleUrls = new Set(), queuePublishTime = null) {
    const now = Date.now();

    const extractedSourceId = extractSourceIdFromUrl(url);
    console.log('[parseArticles] 提取的sourceId:', extractedSourceId);

    const finalSourceId = sourceIdFromQueue || extractedSourceId;

    let finalSourceName = sourceNameFromQueue;
    if (!finalSourceName && finalSourceId) {
        const dbSourceName = await getSourceNameFromDb(finalSourceId);
        if (dbSourceName) {
            finalSourceName = dbSourceName;
            console.log('[parseArticles] 从数据库获取sourceName:', finalSourceName);
        }
    }

    if (!finalSourceName) {
        finalSourceName = finalSourceId || '未知来源';
    }

    // Compute expireAt based on source priorityTier (per D-02)
    const priorityTier = await getSourcePriorityTier(finalSourceId);
    // 优先使用 url_queue 中 extractUrls 传过来的时间（从 Last-Modified header 提取），不经过 AI 解析
    // queuePublishTime 是 url_queue 中原始的时间
    let publishTime = now;
    if (queuePublishTime) {
        const parsedTime = new Date(queuePublishTime).getTime();
        if (!isNaN(parsedTime)) {
            publishTime = parsedTime;
        }
    } else if (item.publishTime) {
        // fallback 到 AI 解析的时间（仅当 url_queue 没有时间时）
        const parsedTime = new Date(item.publishTime).getTime();
        if (!isNaN(parsedTime)) {
            publishTime = parsedTime;
        }
    }
    const expireAt = computeExpireAt(publishTime, priorityTier);
    console.log('[parseArticles] priorityTier:', priorityTier, 'expireAt:', expireAt);

    // Use pre-fetched Set for O(1) existence check instead of per-item DB query
    if (existingArticleUrls.has(url)) {
        const isExpired = expireAt && Date.now() > expireAt;
        if (!isExpired) {
            return { exists: true, articleId: null };
        }
        // Delete expired article to allow re-save
        await db.collection('articles').where({ originalUrl: url }).remove();
    }

    console.log('[parseArticles] 准备保存文章:', {
        title: item.title,
        category: item.category,
        publishTime: publishTime,
        expireAt: expireAt
    });

    // Strip HTML from content as a safety net (some strategies may pass raw HTML)
    const rawContent = item.content || '';
    const plainText = stripHtml(rawContent);
    // If strategy didn't provide summary, generate from plainText
    const finalSummary = item.summary || generateSummary(plainText);

    const addResult = await db.collection('articles').add({
        title: item.title || '无标题',
        content: plainText,   // Always store plain text, never raw HTML
        plainText: plainText,
        summary: finalSummary,
        category: item.category || 'notice',
        categoryName: getCategoryName(item.category || 'notice'),
        tags: {
            source: [finalSourceName],
            role: ['通用'],
            custom: item.tags || []
        },
        urgency: item.urgency || 'low',
        sourceId: finalSourceId,
        sourceName: finalSourceName,
        originalUrl: url,
        publishTime: publishTime,
        expireAt: expireAt,
        isExpired: false,
        stats: { viewCount: 0, collectCount: 0, shareCount: 0 },
        status: item.isValid ? 'pending' : 'draft',
        createdAt: now,
        updatedAt: now
    });

    console.log('[parseArticles] 文章保存成功, id:', addResult.id);

    return { exists: false, articleId: addResult.id };
}

/**
 * 获取分类显示名称
 */
function getCategoryName(category) {
    const map = {
        notice: '通知公告',
        academic: '学术动态',
        activity: '活动赛事',
        service: '生活服务',
        other: '其他'
    };
    return map[category] || '其他';
}

/**
 * 根据sourceId获取parseStrategy
 * Per D-07: Strategy selection is automatic by source.parseStrategy
 * 兼容两种存储位置：顶层 parseStrategy 和 legacy classification.parseStrategy
 */
async function getSourceParseStrategy(sourceId) {
    if (!sourceId) return 'no-parse'; // Default to raw parse if no sourceId

    try {
        const sourceResult = await db.collection('sources').where({ sourceId }).get();
        if (sourceResult.data && sourceResult.data.length > 0) {
            const source = sourceResult.data[0];
            // 优先读取顶层 parseStrategy（新版）
            if (source.parseStrategy) {
                return source.parseStrategy;
            }
            // 兼容 classification.parseStrategy（legacy 旧版）
            if (source.classification?.parseStrategy) {
                return source.classification.parseStrategy;
            }
        }
    } catch (e) {
        console.error('[parseArticles] 查询source parseStrategy失败:', e.message);
    }
    return 'no-parse';
}

// ============ 主入口 ============

exports.main = async (event, context) => {
    const { action, sourceId, limit = 10, startIndex = 0, openid, linkIds } = event;

    // 获取待处理链接列表（按 sourceUrl 分组）
    if (action === 'getPendingList') {
        try {
            // 先用 count 查询总数
            const countResult = await db.collection('url_queue')
                .where({ status: 'pending' })
                .count();
            const totalPending = countResult.total;
            console.log('[getPendingList] 待处理总数:', totalPending);

            // 分页获取（uniCloud get() 每次最多100条，需迭代）
            const PAGE_SIZE = 100;
            let allPending = [];
            for (let skip = 0; skip < totalPending; skip += PAGE_SIZE) {
                const batch = await db.collection('url_queue')
                    .where({ status: 'pending' })
                    .skip(skip)
                    .limit(PAGE_SIZE)
                    .get();
                if (batch.data && batch.data.length > 0) {
                    allPending = allPending.concat(batch.data);
                }
                if (batch.data.length < PAGE_SIZE) break; // 已取完
            }

            console.log('[getPendingList] 实际获取:', allPending.length);

            const groupMap = new Map();
            for (const item of allPending) {
                const key = item.sourceUrl;
                if (!groupMap.has(key)) {
                    groupMap.set(key, {
                        sourceUrl: item.sourceUrl,
                        sourceId: item.sourceId,
                        sourceName: item.sourceName,
                        category: item.category,
                        links: []
                    });
                }
                groupMap.get(key).links.push({
                    _id: item._id,
                    url: item.url,
                    urlSuffix: item.urlSuffix || null,
                    fetchTime: item.fetchTime,
                    title: item.title || null,
                    publishTime: item.publishTime || null
                });
            }

            return {
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: Array.from(groupMap.values()).map(g => ({
                    ...g,
                    totalCount: g.links.length
                }))
            };
        } catch (e) {
            console.error('[parseArticles] 获取待处理列表失败:', e);
            return {
                code: ERROR_CODES.SYSTEM_ERROR,
                message: e.message,
                data: null
            };
        }
    }

    // 获取失败链接列表（按 sourceUrl 分组）
    if (action === 'getFailedList') {
        try {
            const countResult = await db.collection('url_queue')
                .where({ status: 'failed' })
                .count();
            const totalFailed = countResult.total;

            const PAGE_SIZE = 100;
            let allFailed = [];
            for (let skip = 0; skip < totalFailed; skip += PAGE_SIZE) {
                const batch = await db.collection('url_queue')
                    .where({ status: 'failed' })
                    .skip(skip)
                    .limit(PAGE_SIZE)
                    .get();
                if (batch.data && batch.data.length > 0) {
                    allFailed = allFailed.concat(batch.data);
                }
                if (batch.data.length < PAGE_SIZE) break;
            }

            const groupMap = new Map();
            for (const item of allFailed) {
                const key = item.sourceUrl;
                if (!groupMap.has(key)) {
                    groupMap.set(key, {
                        sourceUrl: item.sourceUrl,
                        sourceId: item.sourceId,
                        sourceName: item.sourceName,
                        category: item.category,
                        links: []
                    });
                }
                groupMap.get(key).links.push({
                    _id: item._id,
                    url: item.url,
                    urlSuffix: item.urlSuffix || null,
                    fetchTime: item.fetchTime,
                    title: item.title || null,
                    publishTime: item.publishTime || null,
                    error: item.error || '',
                    retryCount: item.retryCount || 0
                });
            }

            return {
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: Array.from(groupMap.values()).map(g => ({
                    ...g,
                    totalCount: g.links.length
                }))
            };
        } catch (e) {
            console.error('[getFailedList] 获取失败列表失败:', e);
            return {
                code: ERROR_CODES.SYSTEM_ERROR,
                message: e.message,
                data: null
            };
        }
    }

    // 重试失败链接（将 status 从 failed 改为 pending）
    if (action === 'retryFailed') {
        const { linkIds } = event;
        if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
            return {
                code: ERROR_CODES.PARAM_ERROR,
                message: '缺少 linkIds',
                data: null
            };
        }
        try {
            const now = Date.now();
            let retried = 0;
            for (const linkId of linkIds) {
                await db.collection('url_queue').doc(linkId).update({
                    status: 'pending',
                    error: db.command.remove(),
                    updateTime: now
                });
                retried++;
            }
            return {
                code: ERROR_CODES.SUCCESS,
                message: `成功重试 ${retried} 条失败链接`,
                data: { retried }
            };
        } catch (e) {
            console.error('[retryFailed] 重试失败:', e);
            return {
                code: ERROR_CODES.SYSTEM_ERROR,
                message: e.message,
                data: null
            };
        }
    }

    // 获取处理进度
    if (action === 'getProgress') {
        const { taskToken, linkIds } = event;
        if (!taskToken) {
            return {
                code: ERROR_CODES.PARAM_ERROR,
                message: '缺少 taskToken',
                data: null
            };
        }

        let allLinkIds = linkIds;
        if (!allLinkIds || allLinkIds.length === 0) {
            try {
                const result = await db.collection('url_queue').doc(taskToken).get();
                if (result.data && result.data[0] && result.data[0].taskInfo) {
                    allLinkIds = result.data[0].taskInfo.linkIds || [taskToken];
                }
            } catch (e) {
                allLinkIds = [taskToken];
            }
        }

        try {
            const taskInfo = await getTaskProgress(taskToken, allLinkIds);
            if (!taskInfo) {
                return {
                    code: ERROR_CODES.SUCCESS,
                    message: 'success',
                    data: { status: 'idle', current: 0, total: 0 }
                };
            }

            const now = Date.now();
            const usedTime = now - taskInfo.startTime;
            const avgSpeed = taskInfo.currentIndex > 0 ? Math.round(usedTime / taskInfo.currentIndex) : 0;
            const remaining = taskInfo.total - taskInfo.currentIndex;
            const estimatedLeft = avgSpeed > 0 ? avgSpeed * remaining : 0;

            return {
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: {
                    status: taskInfo.status,
                    current: taskInfo.currentIndex,
                    total: taskInfo.total,
                    usedTime: usedTime,
                    speed: avgSpeed,
                    estimatedLeft: estimatedLeft,
                    currentUrl: taskInfo.currentUrl || '',
                    successCount: taskInfo.successCount || 0,
                    failedCount: taskInfo.failedCount || 0
                }
            };
        } catch (e) {
            console.error('[parseArticles] 获取进度失败:', e);
            return {
                code: ERROR_CODES.SYSTEM_ERROR,
                message: e.message,
                data: null
            };
        }
    }

    // 开始批量处理（支持进度查询）
    if (action === 'startBatchProcess') {
        console.log('[parseArticles] ===== startBatchProcess 开始 =====');
        console.log('[parseArticles] 接收参数:', { linkIds, openid, linkIdsCount: linkIds?.length });

        if (!linkIds || linkIds.length === 0) {
            console.error('[parseArticles] linkIds 为空');
            return {
                code: ERROR_CODES.PARAM_ERROR,
                message: '请选择要处理的链接',
                data: null
            };
        }

        if (!openid) {
            console.warn('[parseArticles] openid 为空');
            return {
                code: ERROR_CODES.NOT_LOGIN,
                message: '未登录',
                data: null
            };
        }

        // Verify admin using common utility (per D-14)
        try {
            await requireAdmin(openid);
        } catch (e) {
            return {
                code: e.code || ERROR_CODES.NO_PERMISSION,
                message: e.message,
                data: null
            };
        }

        const taskToken = linkIds[0];
        const startTime = Date.now();

        console.log('[parseArticles] taskToken:', taskToken);
        console.log('[parseArticles] 开始处理, linkIds count:', linkIds.length);

        try {
            // 初始化任务信息
            console.log('[parseArticles] 调用 createTask');
            await createTask(linkIds);
            console.log('[parseArticles] createTask 完成');

            const results = [];
            let successCount = 0;
            let failedCount = 0;

            // Pre-fetch unique source parse strategies (per D-07)
            const sourceStrategyCache = new Map();

            // Pre-fetch all linkInfo to get URLs for batch article existence check
            const linkInfos = await Promise.all(linkIds.map(id =>
                db.collection('url_queue').doc(id).get()
            ));
            const validLinkInfos = linkInfos.filter(info => info.data.length > 0).map(info => info.data[0]);
            const urlsToProcess = validLinkInfos.map(info => info.url);

            // Batch query existing articles to avoid N individual queries
            const existingArticles = await db.collection('articles')
                .where({ originalUrl: db.command.in(urlsToProcess) })
                .field({ originalUrl: true })
                .get();
            const existingArticleUrls = new Set(existingArticles.data.map(a => a.originalUrl));

            for (let i = 0; i < validLinkInfos.length; i++) {
                const linkId = validLinkInfos[i]._id;
                const item = validLinkInfos[i];
                const effectiveUrl = item.url;
                const itemStartTime = Date.now();

                console.log(`[parseArticles] [${i+1}/${validLinkInfos.length}] 开始处理 URL: ${effectiveUrl}`);

                // 更新状态为处理中
                await db.collection('url_queue').doc(linkId).update({
                    status: 'processing',
                    updateTime: Date.now()
                });

                // Get HTML using common httpGet utility
                console.log(`[parseArticles] [${i+1}] 调用 httpGet...`);
                const httpRes = await httpGet(item.url);
                console.log(`[parseArticles] [${i+1}] httpGet完成: code=${httpRes.code}, contentLength=${httpRes.data?.content?.length || 0}`);

                if (httpRes.code !== ERROR_CODES.SUCCESS) {
                    console.log(`[parseArticles] [${i+1}] HTTP获取失败: ${httpRes.message}`);
                    await db.collection('url_queue').doc(linkId).update({
                        status: 'failed',
                        error: httpRes.message,
                        updateTime: Date.now()
                    });
                    results.push({ url: item.url, status: 'fetch_failed', error: httpRes.message });
                    failedCount++;

                    await updateTaskProgress(linkId, {
                        taskId: taskToken,
                        linkIds: linkIds,
                        total: linkIds.length,
                        currentIndex: i + 1,
                        startTime: startTime,
                        status: 'processing',
                        results: results,
                        successCount: successCount,
                        failedCount: failedCount,
                        linkIds: linkIds
                    });
                    continue;
                }

                const htmlContent = httpRes.data.content;
                console.log(`[parseArticles] [${i+1}] htmlContent长度: ${htmlContent?.length || 0}`);

                // Get parseStrategy for this source (per D-07)
                let parseStrategy = sourceStrategyCache.get(item.sourceId);
                if (parseStrategy === undefined) {
                    parseStrategy = await getSourceParseStrategy(item.sourceId);
                    sourceStrategyCache.set(item.sourceId, parseStrategy);
                    console.log(`[parseArticles] [${i+1}] 获取parseStrategy: ${parseStrategy}`);
                }

                // Select and execute strategy (per D-07)
                let parseResult;
                try {
                    const strategy = getStrategy(parseStrategy);
                    console.log(`[parseArticles] [${i+1}] 执行策略: ${parseStrategy}`);
                    parseResult = await strategy.parse(htmlContent, {
                        url: item.url,
                        sourceId: item.sourceId,
                        sourceName: item.sourceName,
                        title: item.title,
                        httpHeaders: httpRes.data.headers
                    });
                    console.log(`[parseArticles] [${i+1}] 解析结果: title="${parseResult?.title}", content长度=${parseResult?.content?.length || 0}`);
                } catch (e) {
                    console.error(`[parseArticles] [${i+1}] Strategy parse error:`, e.message);
                    await db.collection('url_queue').doc(linkId).update({
                        status: 'failed',
                        error: e.message || 'Parse strategy failed',
                        retryCount: (item.retryCount || 0) + 1,
                        updateTime: Date.now()
                    });
                    results.push({ url: item.url, status: 'parse_failed', error: e.message });
                    failedCount++;

                    await updateTaskProgress(linkId, {
                        taskId: taskToken,
                        linkIds: linkIds,
                        total: linkIds.length,
                        currentIndex: i + 1,
                        startTime: startTime,
                        status: 'processing',
                        results: results,
                        successCount: successCount,
                        failedCount: failedCount,
                        linkIds: linkIds
                    });
                    continue;
                }

                // 保存文章（传入 queuePublishTime 优先使用 url_queue 中的时间，不经过 AI 解析）
                console.log(`[parseArticles] [${i+1}] 调用 saveArticle...`);
                const saveRes = await saveArticle(parseResult, item.url, item.sourceId, item.sourceName, existingArticleUrls, item.publishTime);
                console.log(`[parseArticles] [${i+1}] saveArticle完成: exists=${saveRes.exists}, articleId=${saveRes.articleId}`);

                // 更新链接状态
                console.log(`[parseArticles] [${i+1}] 更新url_queue状态为processed`);
                await db.collection('url_queue').doc(linkId).update({
                    status: 'processed',
                    processTime: Date.now(),
                    articleId: saveRes.articleId,
                    title: parseResult.title,
                    publishTime: parseResult.publishTime,
                    titleTime: Date.now(),
                    updateTime: Date.now()
                });

                results.push({
                    url: effectiveUrl,
                    status: saveRes.exists ? 'exists' : 'saved',
                    title: parseResult?.title,
                    articleId: saveRes.articleId
                });

                if (!saveRes.exists) successCount++;

                // 更新进度
                await updateTaskProgress(linkId, {
                    taskId: taskToken,
                    linkIds: linkIds,
                    total: linkIds.length,
                    currentIndex: i + 1,
                    startTime: startTime,
                    status: 'processing',
                    results: results,
                    successCount: successCount,
                    failedCount: failedCount,
                    linkIds: linkIds
                });

                const itemUsedTime = Date.now() - itemStartTime;
                console.log(`[parseArticles] 处理 ${i + 1}/${linkIds.length}: ${effectiveUrl} (${itemUsedTime}ms)`);
            }

            // 任务完成
            const now = Date.now();
            const totalUsedTime = now - startTime;
            const avgSpeed = Math.round(totalUsedTime / linkIds.length);

            console.log(`[parseArticles] ===== 任务完成 =====`);
            console.log(`[parseArticles] 总处理: ${linkIds.length}, 成功: ${successCount}, 失败: ${failedCount}`);
            console.log(`[parseArticles] 总耗时: ${totalUsedTime}ms, 平均速度: ${avgSpeed}ms/条`);

            await updateTaskProgress(linkIds[0], {
                taskId: taskToken,
                linkIds: linkIds,
                total: linkIds.length,
                currentIndex: linkIds.length,
                startTime: startTime,
                status: 'completed',
                results: results,
                successCount: successCount,
                failedCount: failedCount,
                linkIds: linkIds,
                totalUsedTime: totalUsedTime,
                avgSpeed: avgSpeed
            });

            const remainingCount = await db.collection('url_queue').where({ status: 'pending' }).count();
            console.log(`[parseArticles] 剩余待处理: ${remainingCount.total} 条`);

            const response = {
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: {
                    status: 'completed',
                    taskToken: taskToken,
                    processed: linkIds.length,
                    success: successCount,
                    failed: failedCount,
                    results: results,
                    remainingCount: remainingCount.total,
                    usedTime: totalUsedTime,
                    avgSpeed: avgSpeed,
                    message: `处理完成：成功 ${successCount} 个，失败 ${failedCount} 个`
                }
            };
            console.log(`[parseArticles] ===== 返回响应 =====`, JSON.stringify(response.data, null, 2));
            return response;
        } catch (e) {
            console.error('[parseArticles] 批量处理失败:', e);
            return {
                code: e.code || ERROR_CODES.SYSTEM_ERROR,
                message: e.message,
                data: null
            };
        }
    }

    if (!openid) {
        return {
            code: ERROR_CODES.NOT_LOGIN,
            message: '未登录',
            data: null
        };
    }

    // Verify admin using common utility
    try {
        await requireAdmin(openid);
    } catch (e) {
        return {
            code: e.code || ERROR_CODES.NO_PERMISSION,
            message: e.message,
            data: null
        };
    }

    // 如果传入了 linkIds，则只处理指定的链接（兼容旧版）
    if (linkIds && linkIds.length > 0) {
        try {
            const results = [];
            let successCount = 0;
            let failedCount = 0;
            const now = Date.now();
            const sourceStrategyCache = new Map();

            for (const linkId of linkIds) {
                const linkInfo = await db.collection('url_queue').doc(linkId).get();
                if (!linkInfo.data.length) {
                    continue;
                }
                const item = linkInfo.data[0];

                await db.collection('url_queue').doc(item._id).update({
                    status: 'processing',
                    updateTime: now
                });

                // Get HTML using common httpGet utility
                const httpRes = await httpGet(effectiveUrl);
                if (httpRes.code !== ERROR_CODES.SUCCESS) {
                    await db.collection('url_queue').doc(item._id).update({
                        status: 'failed',
                        error: httpRes.message,
                        updateTime: now
                    });
                    results.push({ url: effectiveUrl, status: 'fetch_failed', error: httpRes.message });
                    failedCount++;
                    continue;
                }

                const htmlContent = httpRes.data.content;

                // Get parseStrategy for this source
                let parseStrategy = sourceStrategyCache.get(item.sourceId);
                if (parseStrategy === undefined) {
                    parseStrategy = await getSourceParseStrategy(item.sourceId);
                    sourceStrategyCache.set(item.sourceId, parseStrategy);
                }

                // Select and execute strategy
                let parseResult;
                try {
                    const strategy = getStrategy(parseStrategy);
                    parseResult = await strategy.parse(htmlContent, {
                        url: effectiveUrl,
                        sourceId: item.sourceId,
                        sourceName: item.sourceName,
                        title: item.title,
                        httpHeaders: httpRes.data.headers
                    });
                } catch (e) {
                    await db.collection('url_queue').doc(item._id).update({
                        status: 'failed',
                        error: e.message || 'Parse strategy failed',
                        retryCount: (item.retryCount || 0) + 1,
                        updateTime: now
                    });
                    results.push({ url: effectiveUrl, status: 'parse_failed', error: e.message });
                    failedCount++;
                    continue;
                }

                const saveRes = await saveArticle(parseResult, effectiveUrl, item.sourceId, item.sourceName, new Set(), item.publishTime);

                await db.collection('url_queue').doc(item._id).update({
                    status: 'processed',
                    processTime: now,
                    articleId: saveRes.articleId,
                    title: parseResult.title,
                    publishTime: parseResult.publishTime,
                    titleTime: now,
                    updateTime: now
                });

                results.push({
                    url: effectiveUrl,
                    status: saveRes.exists ? 'exists' : 'saved',
                    title: parseResult?.title,
                    articleId: saveRes.articleId
                });

                if (!saveRes.exists) successCount++;
            }

            const remainingCount = await db.collection('url_queue').where({ status: 'pending' }).count();

            return {
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: {
                    mode: 'parse',
                    processed: linkIds.length,
                    success: successCount,
                    failed: failedCount,
                    results,
                    remainingCount: remainingCount.total,
                    message: `处理完成：成功 ${successCount} 个，失败 ${failedCount} 个`
                }
            };
        } catch (e) {
            console.error('[parseArticles] 错误:', e);
            return {
                code: e.code || ERROR_CODES.SYSTEM_ERROR,
                message: e.message,
                data: null
            };
        }
    }

    // 原有逻辑：获取待处理链接并处理
    try {
        let query = db.collection('url_queue').where({ status: 'pending' });
        if (sourceId) {
            query = db.collection('url_queue').where({
                status: 'pending',
                sourceId: sourceId
            });
        }

        const queueResult = await query.skip(startIndex).limit(limit * 2).get();
        let pendingLinks = queueResult.data || [];

        const filteredLinks = [];
        const existingUrls = new Set();

        for (const link of pendingLinks) {
            const existing = await db.collection('articles').where({ originalUrl: link.url }).get();
            if (existing.data.length > 0) {
                await db.collection('url_queue').doc(link._id).update({
                    status: 'processed',
                    articleId: existing.data[0]._id,
                    processTime: Date.now(),
                    updateTime: Date.now()
                });
                existingUrls.add(link.url);
                console.log(`[parseArticles] 跳过已存在链接: ${link.url}`);
            } else {
                filteredLinks.push(link);
            }
        }

        pendingLinks = filteredLinks.slice(0, limit);

        if (existingUrls.size > 0) {
            console.log(`[parseArticles] 过滤掉 ${existingUrls.size} 个已存在链接`);
        }

        if (pendingLinks.length === 0) {
            return {
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: {
                    mode: 'parse',
                    processed: 0,
                    success: 0,
                    failed: 0,
                    filtered: existingUrls.size,
                    message: existingUrls.size > 0
                        ? `过滤掉 ${existingUrls.size} 个已存在链接，没有新链接需要处理`
                        : '没有待处理的链接'
                }
            };
        }

        console.log(`[parseArticles] 获取到 ${pendingLinks.length} 个待处理链接`);

        const results = [];
        const now = Date.now();
        let successCount = 0;
        let failedCount = 0;
        const sourceStrategyCache = new Map();

        for (let i = 0; i < pendingLinks.length; i++) {
            const item = pendingLinks[i];

            const effectiveUrl = item.url;
            console.log(`[parseArticles] 处理 ${i + 1}/${pendingLinks.length}: ${effectiveUrl}`);

            await db.collection('url_queue').doc(item._id).update({
                status: 'processing',
                updateTime: now
            });

            const httpRes = await httpGet(effectiveUrl);
            if (httpRes.code !== ERROR_CODES.SUCCESS) {
                await db.collection('url_queue').doc(item._id).update({
                    status: 'failed',
                    error: httpRes.message,
                    updateTime: now
                });
                results.push({ url: effectiveUrl, status: 'fetch_failed', error: httpRes.message });
                failedCount++;
                continue;
            }

            const htmlContent = httpRes.data.content;

            let parseStrategy = sourceStrategyCache.get(item.sourceId);
            if (parseStrategy === undefined) {
                parseStrategy = await getSourceParseStrategy(item.sourceId);
                sourceStrategyCache.set(item.sourceId, parseStrategy);
            }

            let parseResult;
            try {
                const strategy = getStrategy(parseStrategy);
                parseResult = await strategy.parse(htmlContent, {
                    url: effectiveUrl,
                    sourceId: item.sourceId,
                    sourceName: item.sourceName,
                    title: item.title,
                    httpHeaders: httpRes.data.headers
                });
            } catch (e) {
                await db.collection('url_queue').doc(item._id).update({
                    status: 'failed',
                    error: e.message || 'Parse strategy failed',
                    retryCount: item.retryCount + 1,
                    updateTime: now
                });
                results.push({ url: effectiveUrl, status: 'parse_failed', error: e.message });
                failedCount++;
                continue;
            }

            const saveRes = await saveArticle(parseResult, effectiveUrl, item.sourceId, item.sourceName, new Set(), item.publishTime);

            await db.collection('url_queue').doc(item._id).update({
                status: 'processed',
                processTime: now,
                articleId: saveRes.articleId,
                title: parseResult.title,
                publishTime: parseResult.publishTime,
                titleTime: now,
                updateTime: now
            });

            results.push({
                url: effectiveUrl,
                status: saveRes.exists ? 'exists' : 'saved',
                title: parseResult?.title,
                articleId: saveRes.articleId
            });

            if (!saveRes.exists) successCount++;
        }

        const remainingQuery = db.collection('url_queue').where({ status: 'pending' });
        const remainingCount = await remainingQuery.count();

        return {
            code: ERROR_CODES.SUCCESS,
            message: 'success',
            data: {
                mode: 'parse',
                processed: pendingLinks.length,
                success: successCount,
                failed: failedCount,
                filtered: existingUrls.size,
                results,
                remainingCount: remainingCount.total,
                message: existingUrls.size > 0
                    ? `过滤已存在 ${existingUrls.size} 个，处理成功 ${successCount} 个，失败 ${failedCount} 个`
                    : `处理完成：成功 ${successCount} 个，失败 ${failedCount} 个，剩余 ${remainingCount.total} 个待处理`
            }
        };
    } catch (e) {
        console.error('[parseArticles] 错误:', e);
        return {
            code: e.code || ERROR_CODES.SYSTEM_ERROR,
            message: e.message,
            data: null
        };
    }
};

'use strict';

const db = uniCloud.database();
const dbCmd = db.command;
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
let MOONSHOT_API_KEY = '';
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';
const TIMEOUT = 300000;

// 读取配置文件
function loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.moonshot?.apiKey) {
                MOONSHOT_API_KEY = config.moonshot.apiKey;
            }
        } catch (e) {
            console.error('[parseArticles] 配置加载失败:', e.message);
        }
    }
}
loadConfig();

// ============ 进度任务管理 ============

/**
 * 创建处理任务
 */
async function createTask(linkIds) {
    const now = Date.now();
    const taskId = 'task_' + now + '_' + Math.random().toString(36).substr(2, 9);

    console.log('[parseArticles] 创建任务:', taskId, '共', linkIds.length, '个链接');

    if (linkIds.length > 0) {
        try {
            // 检查记录是否存在
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
 * @param {string} taskToken - 任务token（第一个链接ID）
 * @param {Array} linkIds - 所有链接ID列表
 */
async function getTaskProgress(taskToken, linkIds) {
    if (!taskToken || !linkIds || linkIds.length === 0) {
        return null;
    }

    try {
        // 查询所有相关链接的状态
        // 使用 where IN 查询
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

        // 获取当前正在处理的 URL
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

        // 从 taskInfo 获取开始时间
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

// ============ 工具函数 ============

/**
 * 从URL中提取sourceId
 * 例如: https://www.scuec.edu.cn/bwc/tztg.htm → "bwc"
 *       https://www.scuec.edu.cn/cxcy/scss/info.htm → "scss"
 */
function extractSourceIdFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // 去掉末尾的文件名，获取目录路径
        // 例如: /bwc/tztg.htm → /bwc/
        // 例如: /cxcy/scss/info.htm → /cxcy/scss/
        const dirPath = pathname.substring(0, pathname.lastIndexOf('/') + 1);

        // 获取最后一个目录名
        // 例如: /bwc/ → bwc
        // 例如: /cxcy/scss/ → scss
        const parts = dirPath.split('/').filter(p => p);
        const sourceId = parts[parts.length - 1] || '';

        return sourceId;
    } catch (e) {
        console.error('[parseArticles] 提取sourceId失败:', e.message);
        return '';
    }
}

/**
 * 根据sourceId从sources表获取中文名称
 */
async function getSourceNameFromDb(sourceId) {
    if (!sourceId) return null;

    try {
        const result = await db.collection('sources').where({ sourceId: sourceId }).get();
        if (result.data && result.data.length > 0) {
            return result.data[0].sourceName;
        }
    } catch (e) {
        console.error('[parseArticles] 查询sources表失败:', e.message);
    }
    return null;
}

/**
 * HTTP GET 请求
 */
async function httpGet(url) {
    try {
        const res = await axios.get(url, {
            timeout: TIMEOUT,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        return { success: true, content: res.data, status: res.status };
    } catch (e) {
        const status = e.response?.status || 'network error';
        return { success: false, error: `HTTP ${status}: ${e.message}`, status };
    }
}

/**
 * Kimi AI 解析文章
 */
async function aiParse(content) {
    if (!MOONSHOT_API_KEY) return { success: false, error: 'API Key 未配置' };

    // 提取发布时间的关键字段
    const timePatterns = [
        '发布时间',
        '发布日期',
        '发布于',
        '日期',
        'time',
        'datetime',
        'createTime',
        'pubDate'
    ];

    const prompt = `分析网页内容，提取校园通知信息。

重要任务：必须从网页HTML中准确提取"发布时间"。

时间提取技巧：
1. 查找HTML中的以下模式：
   - <span class="time">2024-01-15</span>
   - <div class="date">2024年1月15日</div>
   - <p>发布时间：2024-01-15</p>
   - <meta name="pubdate" content="2024-01-15">
   - 日期可能在标题下方、页面底部或侧边栏
2. 常见日期格式：YYYY-MM-DD、YYYY年MM月DD日、MM/DD/YYYY
3. 如果找不到具体时间，使用今天的日期

内容片段：${content.substring(0, 10000)}

返回JSON格式：
{
  "title": "文章标题",
  "publishTime": "YYYY-MM-DD（必须使用这个格式，如2024-01-15）",
  "content": "正文内容",
  "summary": "摘要",
  "category": "notice|academic|activity|service|other",
  "tags": ["标签1", "标签2"],
  "urgency": "high|medium|low",
  "isValid": true
}`;

    try {
        const res = await axios.post(
            `${MOONSHOT_BASE_URL}/chat/completions`,
            {
                model: 'kimi-k2-turbo-preview',
                messages: [
                    { role: 'system', content: '返回JSON' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );
        const result = res.data.choices[0]?.message?.content || '{}';
        try {
            return { success: true, data: JSON.parse(result) };
        } catch {
            return { success: false, error: 'JSON解析失败' };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * 保存文章到 articles 集合
 * @param {Object} item - AI解析结果
 * @param {string} url - 文章URL
 * @param {string} sourceIdFromQueue - 从链接池传入的sourceId（可选）
 * @param {string} sourceNameFromQueue - 从链接池传入的sourceName（可选）
 */
async function saveArticle(item, url, sourceIdFromQueue, sourceNameFromQueue) {
    const now = Date.now();

    // 自动从URL提取sourceId
    const extractedSourceId = extractSourceIdFromUrl(url);
    console.log('[parseArticles] 提取的sourceId:', extractedSourceId);

    // 优先使用传入的sourceId，否则使用从URL提取的
    const finalSourceId = sourceIdFromQueue || extractedSourceId;

    // 尝试从数据库获取sourceName
    let finalSourceName = sourceNameFromQueue;
    if (!finalSourceName && finalSourceId) {
        const dbSourceName = await getSourceNameFromDb(finalSourceId);
        if (dbSourceName) {
            finalSourceName = dbSourceName;
            console.log('[parseArticles] 从数据库获取sourceName:', finalSourceName);
        }
    }

    // 如果都没有，使用默认名称
    if (!finalSourceName) {
        finalSourceName = finalSourceId || '未知来源';
    }

    // 计算时效（根据分类设置不同时效）
    const categoryExpireDays = {
        notice: 7,      // 通知公告 7天
        academic: 30,   // 学术动态 30天
        activity: 14,   // 活动赛事 14天
        service: 14,    // 生活服务 14天
        other: 7        // 其他 7天
    };
    const expireDays = categoryExpireDays[item.category] || 7;

    // 安全解析时间
    let publishTime = now;
    if (item.publishTime) {
        const parsedTime = new Date(item.publishTime).getTime();
        if (!isNaN(parsedTime)) {
            publishTime = parsedTime;
        }
    }
    const expireTime = publishTime + expireDays * 24 * 60 * 60 * 1000;

    // 检查是否已存在（通过 originalUrl 查重）
    const existing = await db.collection('articles').where({ originalUrl: url }).get();
    if (existing.data.length > 0) {
        // 如果已存在，检查是否过期，过期则允许更新
        const existingArticle = existing.data[0];
        const isExpired = Date.now() > (existingArticle.expireTime || 0);
        if (!isExpired) {
            return { exists: true, articleId: existingArticle._id };
        }
        // 已过期，删除旧文章，重新创建
        await db.collection('articles').doc(existingArticle._id).delete();
    }

    // 新增文章
    console.log('[parseArticles] 准备保存文章:', {
        title: item.title,
        category: item.category,
        publishTime: publishTime,
        expireTime: expireTime
    });

    const addResult = await db.collection('articles').add({
        title: item.title || '无标题',
        content: item.content || '',
        plainText: item.content?.replace(/<[^>]+>/g, '') || '',
        summary: item.summary || '',
        category: item.category || 'notice',
        categoryName: getCategoryName(item.category || 'notice'),
        tags: {
            source: [finalSourceName],
            role: ['通用'],
            custom: item.tags || []  // 保留AI返回的tags
        },
        urgency: item.urgency || 'low',
        sourceId: finalSourceId,
        sourceName: finalSourceName,
        originalUrl: url,
        publishTime: publishTime,
        expireTime: expireTime,           // 时效截止时间
        isExpired: false,                 // 是否已过期
        stats: { viewCount: 0, collectCount: 0, shareCount: 0 },
        status: item.isValid ? 'pending' : 'draft', // 待审核状态
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

// ============ 主入口 ============

exports.main = async (event, context) => {
    const { action, sourceId, limit = 10, startIndex = 0, openid, linkIds } = event;

    // 获取待处理链接列表（按 sourceUrl 分组）
    if (action === 'getPendingList') {
        try {
            // 查询所有 pending 链接
            const allPending = await db.collection('url_queue')
                .where({ status: 'pending' })
                .get();

            // 按 sourceUrl 分组
            const groupMap = new Map();
            for (const item of allPending.data) {
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
                    fetchTime: item.fetchTime
                });
            }

            return {
                code: 0,
                data: Array.from(groupMap.values()).map(g => ({
                    ...g,
                    totalCount: g.links.length
                }))
            };
        } catch (e) {
            console.error('[parseArticles] 获取待处理列表失败:', e);
            return { code: 500, message: e.message };
        }
    }

    // 获取处理进度
    if (action === 'getProgress') {
        const { taskToken, linkIds } = event;
        if (!taskToken) {
            return { code: 400, message: '缺少 taskToken' };
        }

        // 如果没有传入 linkIds，从 taskInfo 中获取
        let allLinkIds = linkIds;
        if (!allLinkIds || allLinkIds.length === 0) {
            // 尝试从数据库获取
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
                return { code: 0, data: { status: 'idle', current: 0, total: 0 } };
            }

            // 计算速度和预估剩余时间
            const now = Date.now();
            const usedTime = now - taskInfo.startTime;
            const avgSpeed = taskInfo.currentIndex > 0 ? Math.round(usedTime / taskInfo.currentIndex) : 0;
            const remaining = taskInfo.total - taskInfo.currentIndex;
            const estimatedLeft = avgSpeed > 0 ? avgSpeed * remaining : 0;

            return {
                code: 0,
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
            return { code: 500, message: e.message };
        }
    }

    // 开始批量处理（支持进度查询）
    if (action === 'startBatchProcess') {
        console.log('[parseArticles] startBatchProcess 接收参数:', { linkIds, openid });

        if (!linkIds || linkIds.length === 0) {
            console.error('[parseArticles] linkIds 为空');
            return { code: 400, message: '请选择要处理的链接' };
        }

        if (!openid) {
            console.warn('[parseArticles] openid 为空，但继续执行');
            // 暂时不强制验证，继续执行
            // return { code: 401, message: '未登录' };
        }

        const taskToken = linkIds[0]; // 使用第一个链接ID作为 token
        const startTime = Date.now();

        console.log('[parseArticles] 开始处理, linkIds:', linkIds.length);

        try {
            // 初始化任务信息
            console.log('[parseArticles] 调用 createTask');
            await createTask(linkIds);
            console.log('[parseArticles] createTask 完成');

            const results = [];
            let successCount = 0;
            let failedCount = 0;

            // 逐个处理链接
            for (let i = 0; i < linkIds.length; i++) {
                const linkId = linkIds[i];
                const itemStartTime = Date.now();

                // 获取链接信息
                const linkInfo = await db.collection('url_queue').doc(linkId).get();
                if (!linkInfo.data.length) {
                    continue;
                }
                const item = linkInfo.data[0];

                // 更新状态为处理中
                await db.collection('url_queue').doc(linkId).update({
                    status: 'processing',
                    updateTime: Date.now()
                });

                // 获取HTML
                const httpRes = await httpGet(item.url);
                if (!httpRes.success) {
                    await db.collection('url_queue').doc(linkId).update({
                        status: 'failed',
                        error: httpRes.error,
                        updateTime: Date.now()
                    });
                    results.push({ url: item.url, status: 'fetch_failed', error: httpRes.error });
                    failedCount++;

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
                    continue;
                }

                // AI解析
                const aiRes = await aiParse(httpRes.content);
                if (!aiRes.success) {
                    await db.collection('url_queue').doc(linkId).update({
                        status: 'failed',
                        error: aiRes.error,
                        retryCount: (item.retryCount || 0) + 1,
                        updateTime: Date.now()
                    });
                    results.push({ url: item.url, status: 'parse_failed', error: aiRes.error });
                    failedCount++;

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
                    continue;
                }

                // 保存文章
                const saveRes = await saveArticle(aiRes.data, item.url, item.sourceId, item.sourceName);

                // 更新链接状态
                await db.collection('url_queue').doc(linkId).update({
                    status: 'processed',
                    processTime: Date.now(),
                    articleId: saveRes.articleId,
                    updateTime: Date.now()
                });

                results.push({
                    url: item.url,
                    status: saveRes.exists ? 'exists' : 'saved',
                    title: aiRes.data?.title,
                    articleId: saveRes.articleId
                });

                if (!saveRes.exists) successCount++;

                // 更新进度（每处理完一个就更新）
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

                // 记录单个链接处理时间
                const itemUsedTime = Date.now() - itemStartTime;
                console.log(`[parseArticles] 处理 ${i + 1}/${linkIds.length}: ${item.url} (${itemUsedTime}ms)`);
            }

            // 任务完成
            const now = Date.now();
            const totalUsedTime = now - startTime;
            const avgSpeed = Math.round(totalUsedTime / linkIds.length);

            // 更新最终状态
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

            return {
                code: 0,
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
        } catch (e) {
            console.error('[parseArticles] 批量处理失败:', e);
            // 更新任务状态为失败
            if (linkIds && linkIds.length > 0) {
                await updateTaskProgress(linkIds[0], {
                    status: 'failed',
                    error: e.message
                });
            }
            return { code: 500, message: e.message };
        }
    }

    if (!openid) return { code: 401, message: '未登录' };

    // 如果传入了 linkIds，则只处理指定的链接（兼容旧版）
    if (linkIds && linkIds.length > 0) {
        try {
            const results = [];
            let successCount = 0;
            let failedCount = 0;
            const now = Date.now();

            for (const linkId of linkIds) {
                // 获取链接信息
                const linkInfo = await db.collection('url_queue').doc(linkId).get();
                if (!linkInfo.data.length) {
                    continue;
                }
                const item = linkInfo.data[0];

                // 更新状态为处理中
                await db.collection('url_queue').doc(item._id).update({
                    status: 'processing',
                    updateTime: now
                });

                // 获取HTML
                const httpRes = await httpGet(item.url);
                if (!httpRes.success) {
                    await db.collection('url_queue').doc(item._id).update({
                        status: 'failed',
                        error: httpRes.error,
                        updateTime: now
                    });
                    results.push({ url: item.url, status: 'fetch_failed', error: httpRes.error });
                    failedCount++;
                    continue;
                }

                // AI解析
                const aiRes = await aiParse(httpRes.content);
                if (!aiRes.success) {
                    await db.collection('url_queue').doc(item._id).update({
                        status: 'failed',
                        error: aiRes.error,
                        retryCount: (item.retryCount || 0) + 1,
                        updateTime: now
                    });
                    results.push({ url: item.url, status: 'parse_failed', error: aiRes.error });
                    failedCount++;
                    continue;
                }

                // 保存文章
                const saveRes = await saveArticle(aiRes.data, item.url, item.sourceId, item.sourceName);

                // 更新链接状态
                await db.collection('url_queue').doc(item._id).update({
                    status: 'processed',
                    processTime: now,
                    articleId: saveRes.articleId,
                    updateTime: now
                });

                results.push({
                    url: item.url,
                    status: saveRes.exists ? 'exists' : 'saved',
                    title: aiRes.data?.title,
                    articleId: saveRes.articleId
                });

                if (!saveRes.exists) successCount++;
            }

            const remainingCount = await db.collection('url_queue').where({ status: 'pending' }).count();

            return {
                code: 0,
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
            return { code: 500, message: e.message };
        }
    }

    // 原有逻辑：获取待处理链接并处理
    try {
    // 1. 获取待处理链接
        let query = db.collection('url_queue').where({ status: 'pending' });
        if (sourceId) {
            query = db.collection('url_queue').where({
                status: 'pending',
                sourceId: sourceId
            });
        }

        const queueResult = await query.skip(startIndex).limit(limit * 2).get();  // 多查询一些用于过滤
        let pendingLinks = queueResult.data || [];

        // 预检查：过滤掉已在 articles 表中存在的链接
        const filteredLinks = [];
        const existingUrls = new Set();

        for (const link of pendingLinks) {
            const existing = await db.collection('articles').where({ originalUrl: link.url }).get();
            if (existing.data.length > 0) {
                // 已存在，直接标记为 processed
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

        // 只保留真正需要处理的链接
        pendingLinks = filteredLinks.slice(0, limit);

        if (existingUrls.size > 0) {
            console.log(`[parseArticles] 过滤掉 ${existingUrls.size} 个已存在链接`);
        }

        if (pendingLinks.length === 0) {
            const filteredCount = existingUrls ? existingUrls.size : 0;
            return {
                code: 0,
                data: {
                    mode: 'parse',
                    processed: 0,
                    success: 0,
                    failed: 0,
                    filtered: filteredCount,
                    message: filteredCount > 0
                        ? `过滤掉 ${filteredCount} 个已存在链接，没有新链接需要处理`
                        : '没有待处理的链接'
                }
            };
        }

        console.log(`[parseArticles] 获取到 ${pendingLinks.length} 个待处理链接`);

        // 2. 逐个处理
        const results = [];
        const now = Date.now();
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < pendingLinks.length; i++) {
            const item = pendingLinks[i];
            console.log(`[parseArticles] 处理 ${i + 1}/${pendingLinks.length}: ${item.url}`);

            // 更新状态为处理中
            await db.collection('url_queue').doc(item._id).update({
                status: 'processing',
                updateTime: now
            });

            // 获取HTML
            const httpRes = await httpGet(item.url);
            if (!httpRes.success) {
                await db.collection('url_queue').doc(item._id).update({
                    status: 'failed',
                    error: httpRes.error,
                    updateTime: now
                });
                results.push({ url: item.url, status: 'fetch_failed', error: httpRes.error });
                failedCount++;
                continue;
            }

            // AI解析
            const aiRes = await aiParse(httpRes.content);
            if (!aiRes.success) {
                await db.collection('url_queue').doc(item._id).update({
                    status: 'failed',
                    error: aiRes.error,
                    retryCount: item.retryCount + 1,
                    updateTime: now
                });
                results.push({ url: item.url, status: 'parse_failed', error: aiRes.error });
                failedCount++;
                continue;
            }

            // 保存文章
            const saveRes = await saveArticle(aiRes.data, item.url, item.sourceId, item.sourceName);

            // 更新链接状态
            await db.collection('url_queue').doc(item._id).update({
                status: 'processed',
                processTime: now,
                articleId: saveRes.articleId,
                updateTime: now
            });

            results.push({
                url: item.url,
                status: saveRes.exists ? 'exists' : 'saved',
                title: aiRes.data?.title,
                articleId: saveRes.articleId
            });

            if (!saveRes.exists) successCount++;
        }

        // 3. 统计
        const remainingQuery = db.collection('url_queue').where({ status: 'pending' });
        const remainingCount = await remainingQuery.count();

        // 计算过滤掉的已存在链接数
        const filteredCount = existingUrls ? existingUrls.size : 0;

        return {
            code: 0,
            data: {
                mode: 'parse',
                processed: pendingLinks.length,
                success: successCount,
                failed: failedCount,
                filtered: filteredCount,  // 过滤掉的已存在链接数
                results,
                remainingCount: remainingCount.total,
                message: filteredCount > 0
                    ? `过滤已存在 ${filteredCount} 个，处理成功 ${successCount} 个，失败 ${failedCount} 个`
                    : `处理完成：成功 ${successCount} 个，失败 ${failedCount} 个，剩余 ${remainingCount.total} 个待处理`
            }
        };
    } catch (e) {
        console.error('[parseArticles] 错误:', e);
        return { code: 500, message: e.message };
    }
};

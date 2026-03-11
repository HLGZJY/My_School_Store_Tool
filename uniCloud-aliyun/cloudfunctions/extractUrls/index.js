'use strict';

const db = uniCloud.database();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
let MOONSHOT_API_KEY = '';
const TIMEOUT = 300000; // 5分钟

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
            console.error('[extractUrls] 配置加载失败:', e.message);
        }
    }
}
loadConfig();

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
        const dirPath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        const parts = dirPath.split('/').filter(p => p);
        const sourceId = parts[parts.length - 1] || '';
        return sourceId;
    } catch (e) {
        console.error('[extractUrls] 提取sourceId失败:', e.message);
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
        console.error('[extractUrls] 查询sources表失败:', e.message);
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
 * 快速检测URL是否存在（使用GET请求）
 */
async function checkUrlExists(url) {
    try {
        const res = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            maxContentLength: 5000,  // 只获取前5KB
            maxBodyLength: 5000
        });
        return res.status === 200;
    } catch (e) {
        return e.response?.status === 200;
    }
}

// ============ 核心功能 ============

/**
 * 从列表页提取所有文章链接
 */
async function extractLinksFromPage(listUrl, maxPages = 10) {
    console.log('[extractUrls] 提取链接:', listUrl);

    const allLinks = [];
    const seen = new Set();

    // 基础路径
    let baseOrigin = '', basePath = '';
    try {
        const u = new URL(listUrl);
        baseOrigin = u.origin;
        basePath = listUrl.substring(0, listUrl.lastIndexOf('/') + 1);
    } catch {
        basePath = listUrl.substring(0, listUrl.lastIndexOf('/') + 1);
    }

    // 1. 获取当前页
    const currentPageResult = await httpGet(listUrl);
    if (!currentPageResult.success) {
        return { success: false, error: currentPageResult.error };
    }

    const currentLinks = extractPageLinks(currentPageResult.content, baseOrigin, basePath);
    for (const link of currentLinks) {
        if (!seen.has(link)) {
            seen.add(link);
            allLinks.push(link);
        }
    }
    console.log(`[extractUrls] 第1页提取到 ${currentLinks.length} 个链接`);

    // 2. 检测分页
    const page1Url = listUrl.replace(/(\.htm[l]?)$/, '/1$1');
    if (page1Url !== listUrl) {
        const page1Result = await httpGet(page1Url);
        if (page1Result.success) {
            console.log('[extractUrls] 检测到分页，开始遍历');
            for (let page = 2; page <= maxPages; page++) {
                const pageUrl = listUrl.replace(/(\.htm[l]?)$/, `/${page}$1`);
                const pageResult = await httpGet(pageUrl);
                if (!pageResult.success) {
                    console.log(`[extractUrls] 第${page}页不存在，停止`);
                    break;
                }

                const links = extractPageLinks(pageResult.content, baseOrigin, basePath);
                for (const link of links) {
                    if (!seen.has(link)) {
                        seen.add(link);
                        allLinks.push(link);
                    }
                }
            }
        }
    }

    console.log('[extractUrls] 共提取到链接数量:', allLinks.length);
    return { success: true, links: allLinks };
}

/**
 * 从HTML中提取文章链接
 */
function extractPageLinks(content, baseOrigin, basePath) {
    const links = [];
    const seen = new Set();

    // 文章链接格式：四位数字.html（如 1030/1957.htm）
    const articlePattern = /\d+\/(\d{4,})\.(htm|html?)$/i;

    const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)</gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
        let href = match[1].trim();
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

        // 相对路径处理
        let fullUrl = href;
        if (href.startsWith('/')) {
            fullUrl = baseOrigin + href;
        } else if (href.startsWith('../')) {
            let base = basePath;
            const parts = href.split('/');
            for (const p of parts) {
                if (p === '..') base = base.substring(0, base.lastIndexOf('/'));
            }
            fullUrl = base + '/' + parts.filter(x => x && x !== '..').join('/');
        } else if (!href.startsWith('http')) {
            fullUrl = basePath + href;
        }
        fullUrl = fullUrl.split('#')[0].split('?')[0];

        // 修复：处理 /cxcy/scss/info/xxx 格式
        if (fullUrl.includes('/cxcy/')) {
            const infoMatch = fullUrl.match(/\/cxcy\/([^/]+)\/info\/\d+\/\d+\.htm/i);
            if (infoMatch) {
                const wrongPath = '/' + infoMatch[1] + '/info/';
                const correctPath = '/cxcy/info/';
                if (fullUrl.includes(wrongPath)) {
                    fullUrl = fullUrl.replace(wrongPath, correctPath);
                }
            }
        }

        // 过滤：只保留四位数字格式的文章链接
        if (!articlePattern.test(fullUrl)) {
            continue;
        }

        if (!seen.has(fullUrl)) {
            seen.add(fullUrl);
            links.push(fullUrl);
        }
    }
    return links;
}

/**
 * 将新链接存入链接池（查重）
 */
async function saveLinksToQueue(links, sourceUrl, sourceId, sourceName) {
    const now = Date.now();
    let newCount = 0;
    let existCount = 0;

    // 从sourceUrl提取category
    const category = extractSourceIdFromUrl(sourceUrl);

    for (const url of links) {
        // 检查是否已存在
        const existing = await db.collection('url_queue').where({ url }).get();
        if (existing.data.length > 0) {
            existCount++;
            // 更新时间戳（表示再次发现）
            await db.collection('url_queue').doc(existing.data[0]._id).update({
                fetchTime: now,
                updateTime: now
            });
        } else {
            // 新增
            await db.collection('url_queue').add({
                url,
                sourceUrl,
                sourceId: sourceId || null,
                sourceName: sourceName || '未知来源',
                category: category || sourceId || null,  // 分类标识
                status: 'pending',
                fetchTime: now,
                processTime: null,
                error: null,
                articleId: null,
                retryCount: 0,
                createTime: now,
                updateTime: now
            });
            newCount++;
        }
    }

    return { newCount, existCount };
}

/**
 * 预检验：过滤404链接
 */
async function filterValidLinks(links) {
    const validLinks = [];
    for (const link of links) {
        const exists = await checkUrlExists(link);
        if (exists) {
            validLinks.push(link);
        } else {
            console.log(`[extractUrls] 过滤失效链接: ${link}`);
        }
    }
    return validLinks;
}

// ============ 主入口 ============

exports.main = async (event, context) => {
    const { action, sourceUrl, sourceId, sourceName, maxPages = 10, skipCheck = false, openid } = event;

    // 获取提取历史（不需要登录）
    if (action === 'getHistory') {
        try {
            // 按 sourceUrl 分组统计
            const history = await db.collection('url_queue')
                .field({ sourceUrl: true, sourceId: true, sourceName: true, category: true, status: true, fetchTime: true })
                .get();

            // 按 sourceUrl 分组
            const groupMap = new Map();
            for (const item of history.data) {
                const key = item.sourceUrl;
                if (!groupMap.has(key)) {
                    groupMap.set(key, {
                        sourceUrl: item.sourceUrl,
                        sourceId: item.sourceId,
                        sourceName: item.sourceName,
                        category: item.category,
                        totalCount: 0,
                        processedCount: 0,
                        pendingCount: 0,
                        failedCount: 0,
                        lastFetchTime: item.fetchTime
                    });
                }
                const group = groupMap.get(key);
                group.totalCount++;
                if (item.status === 'processed') group.processedCount++;
                else if (item.status === 'pending') group.pendingCount++;
                else if (item.status === 'failed') group.failedCount++;
                if (item.fetchTime > group.lastFetchTime) {
                    group.lastFetchTime = item.fetchTime;
                }
            }

            return {
                code: 0,
                data: Array.from(groupMap.values())
            };
        } catch (e) {
            console.error('[extractUrls] 获取历史失败:', e);
            return { code: 500, message: e.message };
        }
    }

    // ============ 链接池管理功能 ============

    // 获取所有链接（分页）
    if (action === 'getAllLinks') {
        const { page = 1, pageSize = 50, status, sourceUrl } = event;
        try {
            let query = db.collection('url_queue');

            // 按状态筛选
            if (status) {
                query = query.where({ status: status });
            }

            // 按 sourceUrl 筛选
            if (sourceUrl) {
                query = query.where({ sourceUrl: sourceUrl });
            }

            const skip = (page - 1) * pageSize;
            const links = await query.orderBy('fetchTime', 'desc').skip(skip).limit(pageSize).get();
            const total = await query.count();

            // 检测异常长度的链接（正常文章链接应该小于200字符）
            const abnormalLinks = links.data.map(link => ({
                ...link,
                isAbnormal: link.url && (link.url.length < 10 || link.url.length > 200)
            }));

            return {
                code: 0,
                data: {
                    list: abnormalLinks,
                    total: total.total,
                    page: page,
                    pageSize: pageSize
                }
            };
        } catch (e) {
            console.error('[extractUrls] 获取链接列表失败:', e);
            return { code: 500, message: e.message };
        }
    }

    // 删除链接
    if (action === 'deleteLink') {
        const { linkId } = event;
        if (!linkId) {
            return { code: 400, message: 'linkId 不能为空' };
        }

        try {
            await db.collection('url_queue').doc(linkId).delete();
            return { code: 0, message: '删除成功' };
        } catch (e) {
            console.error('[extractUrls] 删除链接失败:', e);
            return { code: 500, message: e.message };
        }
    }

    // 批量删除链接
    if (action === 'deleteLinks') {
        const { linkIds } = event;
        if (!linkIds || linkIds.length === 0) {
            return { code: 400, message: 'linkIds 不能为空' };
        }

        try {
            for (const linkId of linkIds) {
                await db.collection('url_queue').doc(linkId).delete();
            }
            return { code: 0, message: `成功删除 ${linkIds.length} 个链接` };
        } catch (e) {
            console.error('[extractUrls] 批量删除链接失败:', e);
            return { code: 500, message: e.message };
        }
    }

    // 更新链接
    if (action === 'updateLink') {
        const { linkId, newUrl } = event;
        if (!linkId) {
            return { code: 400, message: 'linkId 不能为空' };
        }
        if (!newUrl) {
            return { code: 400, message: 'newUrl 不能为空' };
        }

        try {
            // 重置状态为 pending，允许重新解析
            await db.collection('url_queue').doc(linkId).update({
                url: newUrl,
                status: 'pending',
                error: db.command.remove(),
                updateTime: Date.now()
            });
            return { code: 0, message: '更新成功' };
        } catch (e) {
            console.error('[extractUrls] 更新链接失败:', e);
            return { code: 500, message: e.message };
        }
    }

    // 其他 action 需要 sourceUrl
    if (!sourceUrl) return { code: 400, message: 'sourceUrl 不能为空' };
    if (!openid) return { code: 401, message: '未登录' };

    try {
        // 1. 提取链接
        const extractResult = await extractLinksFromPage(sourceUrl, maxPages);
        if (!extractResult.success) {
            return { code: 500, message: '提取链接失败: ' + extractResult.error };
        }

        let links = extractResult.links || [];
        if (links.length === 0) {
            return { code: 404, message: '未找到文章链接' };
        }

        console.log(`[extractUrls] 提取到 ${links.length} 个链接`);

        // 2. 预检验：过滤404（可选）
        if (!skipCheck) {
            console.log('[extractUrls] 开始URL预检验...');
            links = await filterValidLinks(links);
            console.log(`[extractUrls] 预检验后剩余 ${links.length} 个有效链接`);
        }

        // 3. 自动处理sourceId和sourceName
        let finalSourceId = sourceId;
        let finalSourceName = sourceName;

        // 如果没有传入sourceId，自动从URL提取
        if (!finalSourceId) {
            finalSourceId = extractSourceIdFromUrl(sourceUrl);
            console.log('[extractUrls] 自动提取sourceId:', finalSourceId);
        }

        // 如果没有传入sourceName，尝试从数据库获取
        if (!finalSourceName && finalSourceId) {
            const dbSourceName = await getSourceNameFromDb(finalSourceId);
            if (dbSourceName) {
                finalSourceName = dbSourceName;
                console.log('[extractUrls] 从数据库获取sourceName:', finalSourceName);
            }
        }

        // 如果都没有，使用默认名称
        if (!finalSourceName) {
            finalSourceName = finalSourceId || '未知来源';
        }

        // 4. 查重并存入链接池
        const saveResult = await saveLinksToQueue(links, sourceUrl, finalSourceId, finalSourceName);

        // 5. 自动创建/更新数据源
        try {
            const now = Date.now();
            const existingSource = await db.collection('sources').where({ sourceId: finalSourceId }).get();

            if (existingSource.data.length > 0) {
                // 更新已有数据源
                await db.collection('sources').doc(existingSource.data[0]._id).update({
                    'config.url': sourceUrl,
                    'stats.totalArticles': (existingSource.data[0].stats?.totalArticles || 0) + saveResult.newCount,
                    'stats.lastFetchCount': saveResult.newCount,
                    'stats.lastCheckTime': now,
                    'stats.hasUpdates': saveResult.newCount > 0,
                    updateTime: now
                });
                console.log('[extractUrls] 更新数据源:', finalSourceId);
            } else {
                // 创建新数据源
                await db.collection('sources').add({
                    sourceId: finalSourceId,
                    sourceName: finalSourceName,
                    sourceType: 'website',
                    category: finalSourceId,
                    enabled: true,
                    config: { url: sourceUrl },
                    schedule: {
                        interval: 3600000,
                        lastRunTime: now,
                        nextRunTime: null,
                        autoSync: false
                    },
                    defaultTags: {
                        source: [finalSourceName],
                        role: ['通用'],
                        custom: []
                    },
                    stats: {
                        totalArticles: saveResult.newCount,
                        lastFetchCount: saveResult.newCount,
                        lastCheckTime: now,
                        hasUpdates: saveResult.newCount > 0
                    },
                    createTime: now,
                    updateTime: now
                });
                console.log('[extractUrls] 创建数据源:', finalSourceId, finalSourceName);
            }
        } catch (e) {
            console.error('[extractUrls] 自动创建数据源失败:', e.message);
            // 不影响主流程
        }

        // 6. 统计待处理数量
        const pendingCount = await db.collection('url_queue').where({ status: 'pending' }).count();

        return {
            code: 0,
            data: {
                mode: 'extract',
                totalExtracted: links.length,
                newCount: saveResult.newCount,
                existCount: saveResult.existCount,
                pendingCount: pendingCount.total,
                message: `新增 ${saveResult.newCount} 个链接，已存在 ${saveResult.existCount} 个，共 ${pendingCount.total} 个待处理`
            }
        };
    } catch (e) {
        console.error('[extractUrls] 错误:', e);
        return { code: 500, message: e.message };
    }
};

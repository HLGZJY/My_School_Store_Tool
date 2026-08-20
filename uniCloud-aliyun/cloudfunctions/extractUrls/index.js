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
 * 从URL中提取 baseUrl（origin + 第一层路径）
 * 例如: https://www.scuec.edu.cn/cxcy/info/1002/3364.htm → https://www.scuec.edu.cn/cxcy
 */
function extractBaseUrl(url) {
    try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        u.pathname = '/' + (parts[0] || '');
        return u.origin + u.pathname;
    } catch {
        return url;
    }
}

/**
 * 还原完整URL并校验一致性
 * 若还原结果与原始URL不一致，记录错误日志，保留原始URL降级处理
 */
function reconstructUrl(baseUrl, urlSuffix) {
    const fullUrl = baseUrl + urlSuffix;
    return fullUrl;
}

// ============ 数据源分类辅助函数 ============

/**
 * 根据URL建议tier等级
 * tier1: 关键机关部处 (jwc, xsc, yjs, bwc, rsc, cwc, gzc, zbb, xxb, library, news)
 * tier2: 学院 (含 /xy/, /college/, xueyuan, xy, college)
 * tier3: 其他
 */
function suggestTier(url) {
    if (!url) return 'tier3';
    const lower = url.toLowerCase();
    // tier1: 关键机关部处
    if (lower.includes('jwc') || lower.includes('jiaowu')) return 'tier1';
    if (lower.includes('xsc') || lower.includes('xuesheng')) return 'tier1';
    if (lower.includes('yjs') || lower.includes('yanjiusheng')) return 'tier1';
    if (lower.includes('bwc') || lower.includes('biye')) return 'tier1';
    if (lower.includes('rsc') || lower.includes('renshi')) return 'tier1';
    if (lower.includes('cwc') || lower.includes('caiwu')) return 'tier1';
    if (lower.includes('gzc') || lower.includes('gongzuo')) return 'tier1';
    if (lower.includes('zbb') || lower.includes('zhongbao')) return 'tier1';
    if (lower.includes('xxb') || lower.includes('xinxi')) return 'tier1';
    if (lower.includes('library') || lower.includes('lib.')) return 'tier1';
    if (lower.includes('news') || lower.includes('xwzx')) return 'tier1';
    if (lower.includes('scce') || lower.includes('shenpi')) return 'tier1';
    // tier2: 学院
    if (lower.includes('/xy/') || lower.includes('/college/')) return 'tier2';
    if (lower.includes('xy.scuec') || lower.includes('college.scuec')) return 'tier2';
    const collegeIndicators = ['xueyuan', 'xy', 'college', 'yuanxi'];
    for (const indicator of collegeIndicators) {
        if (lower.includes(indicator)) return 'tier2';
    }
    // tier3: 学生组织社团
    if (lower.includes('/stu/') || lower.includes('/stuent/')) return 'tier3';
    if (lower.includes('stu.scuec')) return 'tier3';
    if (lower.includes('she') && lower.includes('tuan')) return 'tier3';
    if (lower.includes('tuanwei')) return 'tier3';
    return 'tier3';
}

/**
 * 根据URL建议所属组织单位
 */
function suggestOwner(url) {
    if (!url) return '其他/未分类';
    const lower = url.toLowerCase();
    // 机关部处
    if (lower.includes('jwc') || lower.includes('jiaowu')) return '机关部处/教务处';
    if (lower.includes('xsc') || lower.includes('xuesheng')) return '机关部处/学生处';
    if (lower.includes('yjs') || lower.includes('yanjiusheng')) return '机关部处/研究生处';
    if (lower.includes('bwc') || lower.includes('biye')) return '机关部处/毕业生就业指导中心';
    if (lower.includes('rsc') || lower.includes('renshi')) return '机关部处/人事处';
    if (lower.includes('cwc') || lower.includes('caiwu')) return '机关部处/财务处';
    if (lower.includes('gzc') || lower.includes('gongzuo')) return '机关部处/工作处';
    if (lower.includes('zbb') || lower.includes('zhongbao')) return '机关部处/党委办公室';
    if (lower.includes('xxb') || lower.includes('xinxi')) return '机关部处/信息化中心';
    if (lower.includes('lib.') || lower.includes('library')) return '直属单位/图书馆';
    if (lower.includes('news') || lower.includes('xwzx')) return '机关部处/宣传部';
    if (lower.includes('scce') || lower.includes('shenpi')) return '机关部处/信息化中心';
    if (lower.includes('scuec.edu.cn')) {
        const match = lower.match(/\/([a-z]+)\//);
        if (match) {
            const seg = match[1];
            if (['wyxy', 'rwxy', 'waiyu', 'zhifa', 'jingji', 'guanli', 'faxue', 'jiaoyu', 'tiyu', 'meishu', 'yinle', 'xinwen', 'falv', 'jisuanji', 'hudaxinxi'].includes(seg)) {
                return '学院/' + seg;
            }
        }
    }
    return '其他/未分类';
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

/**
 * Semaphore for concurrency control
 */
class Semaphore {
    constructor(concurrency) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    async acquire() {
        return new Promise((resolve) => {
            if (this.running < this.concurrency) {
                this.running++;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    release() {
        const next = this.queue.shift();
        if (next) {
            next();
        } else {
            this.running--;
        }
    }

    async withLock(fn) {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
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

    // 基础路径：只用 origin + 第一层路径
    let baseOrigin = '', basePath = '';
    try {
        const u = new URL(listUrl);
        baseOrigin = u.origin;
        // basePath 固定为第一层路径，保证相对链接拼到正确位置
        // 例如 https://www.scuec.edu.cn/cxcy/scss/jstz.htm → basePath = https://www.scuec.edu.cn/cxcy/
        basePath = extractBaseUrl(listUrl) + '/';
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
        if (!seen.has(link.url)) {
            seen.add(link.url);
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
                    if (!seen.has(link.url)) {
                        seen.add(link.url);
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
            const baseUrl = extractBaseUrl(fullUrl);
            links.push({
                url: fullUrl,
                baseUrl: baseUrl
            });
        }
    }
    return links;
}

/**
 * 将新链接存入链接池（查重）
 * @param {string[]} links - 文章URL列表
 * @param {string} sourceUrl - 列表页URL（用于关联数据源）
 * @param {string} sourceIdHint - 调用方传入的sourceId（仅作后备）
 * @param {string} sourceName - 数据源名称
 */
async function saveLinksToQueue(links, sourceUrl, sourceIdHint, sourceName) {
    const now = Date.now();

    // 通过 sourceUrl 精确查找 sources 表中对应的 sourceId（根治 sourceId 不匹配问题）
    let resolvedSourceId = sourceIdHint;
    let resolvedSourceName = sourceName;
    try {
        const sourceResult = await db.collection('sources').where({ 'config.url': sourceUrl }).get();
        if (sourceResult.data && sourceResult.data.length > 0) {
            const src = sourceResult.data[0];
            resolvedSourceId = src.sourceId || sourceIdHint;
            resolvedSourceName = src.sourceName || sourceName;
            console.log(`[saveLinksToQueue] 通过sourceUrl匹配到sourceId: ${resolvedSourceId}, sourceName: ${resolvedSourceName}`);
        } else {
            console.log(`[saveLinksToQueue] 未找到匹配的source（config.url=${sourceUrl}），使用传入的sourceIdHint: ${sourceIdHint}`);
        }
    } catch (e) {
        console.error('[saveLinksToQueue] 查询sources表失败:', e.message, '，使用后备sourceId:', sourceIdHint);
    }

    const category = resolvedSourceId || extractSourceIdFromUrl(sourceUrl);

    // Step 1: Single query with where.in() to get all existing URLs
    const existingResult = await db.collection('url_queue')
        .where({ url: db.command.in(links) })
        .field({ url: true, _id: true })
        .get();

    // Build Map for O(1) existence lookup
    const existingMap = new Map();
    for (const item of existingResult.data) {
        existingMap.set(item.url, item._id);
    }

    // Separate new vs existing URLs
    const newUrls = [];
    const existingUpdates = [];

    for (const link of links) {
        const originalUrl = link.url;
        const baseUrl = link.baseUrl;

        // 步骤一：提取 urlSuffix
        let urlSuffix;
        if (baseUrl && originalUrl.startsWith(baseUrl)) {
            urlSuffix = originalUrl.substring(baseUrl.length) || '/';
        } else {
            // 降级处理：直接使用原始 URL
            console.warn(`[saveLinksToQueue] baseUrl提取失败，使用原始URL: ${originalUrl}`);
            urlSuffix = '/';
        }

        // 步骤二：拼接 fullUrl 并校验一致性
        const fullUrl = reconstructUrl(baseUrl, urlSuffix);
        if (fullUrl !== originalUrl) {
            console.error(`[saveLinksToQueue] URL还原不一致！原始=${originalUrl}, 还原=${fullUrl}，降级使用原始URL`);
        }

        // 入库 URL：使用还原后的 fullUrl（校验一致），不一致时降级用 originalUrl
        const finalUrl = fullUrl === originalUrl ? fullUrl : originalUrl;

        if (existingMap.has(finalUrl)) {
            existingUpdates.push({ url: finalUrl, _id: existingMap.get(finalUrl) });
        } else {
            newUrls.push({
                url: finalUrl,
                sourceUrl,
                sourceId: resolvedSourceId || null,
                sourceName: resolvedSourceName || '未知来源',
                category: category || resolvedSourceId || null,
                status: 'pending',
                fetchTime: now,
                processTime: null,
                error: null,
                articleId: null,
                retryCount: 0,
                createTime: now,
                updateTime: now
            });
        }
    }

    // Step 2: Promise.all for parallel timestamp updates
    // 同时重置状态为 pending，让已处理过的链接可以被重新解析
    if (existingUpdates.length > 0) {
        await Promise.all(
            existingUpdates.map(item =>
                db.collection('url_queue').doc(item._id).update({
                    fetchTime: now,
                    updateTime: now,
                    status: 'pending',
                    processTime: null,
                    articleId: null
                })
            )
        );
    }

    // Step 3: Single batch insert for new URLs
    let newCount = 0;
    let newIds = [];
    if (newUrls.length > 0) {
        const addRes = await db.collection('url_queue').add(newUrls);
        // uniCloud 返回格式: { id: 'xxx' } 或 { ids: ['xxx', ...] }
        if (Array.isArray(addRes)) {
            newIds = addRes;
        } else if (addRes.ids && Array.isArray(addRes.ids)) {
            newIds = addRes.ids;
        } else if (addRes.id) {
            newIds = [addRes.id];
        }
        newCount = newUrls.length;
    }

    return { newCount, existCount: existingUpdates.length, newIds };
}

/**
 * 预检验：过滤404链接（使用 Semaphore 控制并发）
 */
async function filterValidLinks(links) {
    const semaphore = new Semaphore(10);
    const validLinks = [];

    const promises = links.map(link =>
        semaphore.withLock(async () => {
            const exists = await checkUrlExists(link.url);
            if (exists) {
                validLinks.push(link);
            } else {
                console.log(`[extractUrls] 过滤失效链接: ${link.url}`);
            }
        })
    );

    await Promise.all(promises);
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

            // 转换为数组并按 lastFetchTime 降序排序
            const result = Array.from(groupMap.values())
                .sort((a, b) => (b.lastFetchTime || 0) - (a.lastFetchTime || 0));

            return {
                code: 0,
                data: result
            };
        } catch (e) {
            console.error('[extractUrls] 获取历史失败:', e);
            return { code: 500, message: e.message };
        }
    }

    // ============ 链接池管理功能 ============

    // 获取所有链接（分页）
    if (action === 'getAllLinks') {
        const { page = 1, pageSize = 50, status, sourceUrl, startDate, endDate } = event;
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

            // 按 publishTime 筛选（字符串 YYYY-MM-DD 格式）
            if (startDate || endDate) {
                const timeQuery = {};
                if (startDate) timeQuery.$gte = startDate;
                if (endDate) timeQuery.$lte = endDate;
                query = query.where({ publishTime: timeQuery });
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
            await db.collection('url_queue').doc(linkId).remove();
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
            await db.collection('url_queue').where({ _id: db.command.in(linkIds) }).remove();
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

    // 更新链接状态（支持单个 linkId 或批量 linkIds）
    if (action === 'updateLinkStatus') {
        const { linkId, linkIds, status } = event;
        if (!linkId && (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0)) {
            return { code: 400, message: 'linkId 或 linkIds 不能为空' };
        }
        const allowed = ['pending', 'processing', 'processed', 'failed'];
        if (status && !allowed.includes(status)) {
            return { code: 400, message: '无效的 status 值' };
        }

        try {
            const updateData = { updateTime: Date.now() };
            if (status) updateData.status = status;
            // 重置为 pending 时清除错误
            if (status === 'pending') {
                updateData.error = db.command.remove();
            }
            if (linkIds && Array.isArray(linkIds) && linkIds.length > 0) {
                await db.collection('url_queue').where({ _id: db.command.in(linkIds) }).update(updateData);
                return { code: 0, message: `批量更新 ${linkIds.length} 条链接状态成功` };
            } else {
                await db.collection('url_queue').doc(linkId).update(updateData);
                return { code: 0, message: '状态更新成功' };
            }
        } catch (e) {
            console.error('[extractUrls] 更新链接状态失败:', e);
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

        // 5. 自动并发抓取 Last-Modified Header（只针对新插入的链接）
        if (saveResult.newIds && saveResult.newIds.length > 0) {
            console.log('[extractUrls] 开始并发抓取 Last-Modified，链接数:', saveResult.newIds.length);
            try {
                // 查出新插入记录的 URL
                const newLinks = await db.collection('url_queue')
                    .where({ _id: db.command.in(saveResult.newIds) })
                    .field({ _id: true, url: true })
                    .get();
                // 并发抓取所有 URL 的 Header
                const fetches = newLinks.data.map(link =>
                    (async () => {
                        const res = await httpGet(link.url);
                        if (res.code !== 0) return { _id: link._id, ok: false };
                        const lm = res.data.headers?.['last-modified'];
                        if (!lm) return { _id: link._id, ok: false };
                        const ts = Date.parse(lm);
                        if (!ts || isNaN(ts)) return { _id: link._id, ok: false };
                        const minTime = new Date('2000-01-01').getTime();
                        const maxTime = Date.now() + 86400000;
                        if (ts < minTime || ts > maxTime) return { _id: link._id, ok: false };
                        const isoDate = new Date(ts).toISOString().split('T')[0];
                        return { _id: link._id, ok: true, publishTime: isoDate, titleTime: Date.now() };
                    })()
                );
                const fetchResults = await Promise.all(fetches);
                const updates = fetchResults.filter(r => r.ok);
                if (updates.length > 0) {
                    await Promise.all(updates.map(r =>
                        db.collection('url_queue').doc(r._id).update({
                            publishTime: r.publishTime,
                            titleTime: r.titleTime,
                            updateTime: Date.now()
                        })
                    ));
                }
                console.log('[extractUrls] Last-Modified 抓取完成: 成功', updates.length, '失败', fetchResults.length - updates.length);
            } catch (e) {
                console.error('[extractUrls] Last-Modified 抓取失败（不影响主流程）:', e.message);
            }
        }

        // 6. 自动创建/更新数据源
        try {
            const now = Date.now();
            // 以 config.url 作为查重标准，同一网站不会重复创建
            const existingSource = await db.collection('sources').where({ 'config.url': sourceUrl }).get();

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
                // 创建新数据源 - 添加 classification 字段（tier/owner 分类）
                const suggestedTier = suggestTier(sourceUrl);
                const suggestedOwner = suggestOwner(sourceUrl);
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
                    classification: {
                        crawlStatus: 'crawl',
                        parseStrategy: 'regex-parse',
                        priorityTier: suggestedTier,
                        owner: suggestedOwner,
                        lastQualityCheck: now
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

        // 7. 统计待处理数量
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

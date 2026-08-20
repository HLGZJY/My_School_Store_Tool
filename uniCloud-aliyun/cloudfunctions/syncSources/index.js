'use strict';

const db = uniCloud.database();
const axios = require('axios');

// ============ 配置 ============
const FETCH_TIMEOUT = 30000;   // 30秒，单 source 抓取超时
const HEAD_TIMEOUT = 10000;    // 10秒，HEAD 请求超时
const MAX_CONCURRENCY = 3;     // 最多同时处理 3 个 source

// ============ 工具函数 ============

/**
 * HTTP GET 请求
 */
async function httpGet(url, options = {}) {
    try {
        const res = await axios.get(url, {
            timeout: options.timeout || FETCH_TIMEOUT,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...options.headers
            },
            // 允许跟踪重定向
            maxRedirects: 5,
            // 检查响应状态码
            validateStatus: (status) => status >= 200 && status < 400
        });
        return {
            success: true,
            content: res.data,
            status: res.status,
            headers: res.headers,
            etag: res.headers['etag'] || null,
            lastModified: res.headers['last-modified'] || null
        };
    } catch (e) {
        return {
            success: false,
            error: e.message,
            status: e.response?.status || 'network error'
        };
    }
}

/**
 * HTTP HEAD 请求（只拉 headers，省带宽）
 */
async function httpHead(url, headers = {}) {
    try {
        const res = await axios.head(url, {
            timeout: HEAD_TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...headers
            },
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400
        });
        return {
            success: true,
            status: res.status,
            etag: res.headers['etag'] || null,
            lastModified: res.headers['last-modified'] || null
        };
    } catch (e) {
        // HEAD 失败时，尝试 GET（部分服务器不支持 HEAD）
        if (e.response?.status === 405) {
            return httpHead(url, { ...headers, 'X-HTTP-Method-Override': 'HEAD' });
        }
        return {
            success: false,
            error: e.message,
            status: e.response?.status || 'network error'
        };
    }
}

/**
 * 从URL中提取sourceId
 */
function extractSourceIdFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const dirPath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        const parts = dirPath.split('/').filter(p => p);
        return parts[parts.length - 1] || '';
    } catch {
        return '';
    }
}

/**
 * 从列表页提取所有文章链接
 */
async function extractLinksFromPage(listUrl, maxPages = 10) {
    const allLinks = [];
    const seen = new Set();

    let baseOrigin = '', basePath = '';
    try {
        const u = new URL(listUrl);
        baseOrigin = u.origin;
        basePath = listUrl.substring(0, listUrl.lastIndexOf('/') + 1);
    } catch {
        basePath = listUrl.substring(0, listUrl.lastIndexOf('/') + 1);
    }

    // 获取当前页
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

    // 检测分页
    const page1Url = listUrl.replace(/(\.htm[l]?)$/, '/1$1');
    if (page1Url !== listUrl) {
        const page1Result = await httpGet(page1Url);
        if (page1Result.success) {
            for (let page = 2; page <= maxPages; page++) {
                const pageUrl = listUrl.replace(/(\.htm[l]?)$/, `/${page}$1`);
                const pageResult = await httpGet(pageUrl);
                if (!pageResult.success) break;

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

    return { success: true, links: allLinks };
}

/**
 * 从HTML中提取文章链接
 */
function extractPageLinks(content, baseOrigin, basePath) {
    const links = [];
    const seen = new Set();

    // 文章链接格式：四位数字.html
    const articlePattern = /\d+\/(\d{4,})\.(htm|html?)$/i;

    const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)</gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
        let href = match[1].trim();
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

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

        // 修复 cxcy 路径问题
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

        if (!articlePattern.test(fullUrl)) continue;

        if (!seen.has(fullUrl)) {
            seen.add(fullUrl);
            links.push(fullUrl);
        }
    }
    return links;
}

/**
 * 将新链接写入 url_queue（只写入不存在的，节省资源）
 */
async function saveNewLinks(links, sourceUrl, sourceId, sourceName) {
    const now = Date.now();
    const category = sourceId || extractSourceIdFromUrl(sourceUrl);

    // 批量查询已存在的 URL
    const existingResult = await db.collection('url_queue')
        .where({ url: db.command.in(links) })
        .field({ url: true })
        .get();

    const existingSet = new Set(existingResult.data.map(item => item.url));
    const newLinks = links.filter(url => !existingSet.has(url));

    if (newLinks.length === 0) {
        return { newCount: 0, skippedCount: links.length };
    }

    const queueItems = newLinks.map(url => ({
        url,
        sourceUrl,
        sourceId: sourceId || null,
        sourceName: sourceName || '未知来源',
        category: category || null,
        status: 'pending',
        fetchTime: now,
        processTime: null,
        error: null,
        articleId: null,
        retryCount: 0,
        createTime: now,
        updateTime: now
    }));

    await db.collection('url_queue').add(queueItems);
    return { newCount: newLinks.length, skippedCount: links.length - newLinks.length };
}

// ============ 并发控制器 ============

class Semaphore {
    constructor(concurrency) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    async acquire() {
        return new Promise(resolve => {
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

// ============ 单个 source 同步 ============

/**
 * 同步单个数据源
 * @returns { object } 同步结果
 */
async function syncSource(source, semaphore) {
    return semaphore.withLock(async () => {
        const { _id, sourceId, sourceName, config, schedule } = source;
        const listUrl = config?.url;
        if (!listUrl) {
            return { sourceId, sourceName, status: 'skip', reason: '无URL配置' };
        }

        const now = Date.now();
        const interval = schedule?.interval || 3600000; // 默认 1 小时

        // 检查时间窗口：距上次运行不足 interval 则跳过
        if (schedule?.lastRunTime && (now - schedule.lastRunTime) < interval) {
            return { sourceId, sourceName, status: 'skip', reason: `距上次运行不足 ${interval / 1000 / 60} 分钟` };
        }

        // === 步骤1：条件请求探测页面是否变化 ===
        const condHeaders = {};
        if (schedule?.etag) condHeaders['If-None-Match'] = schedule.etag;
        if (schedule?.lastModified) condHeaders['If-Modified-Since'] = schedule.lastModified;

        let newEtag = schedule?.etag || null;
        let newLastModified = schedule?.lastModified || null;
        let pageChanged = true;

        const headResult = await httpHead(listUrl, condHeaders);

        if (headResult.success && headResult.status === 304) {
            // 304 Not Modified：页面未变，只更新时间戳
            pageChanged = false;
            console.log(`[syncSource] ${sourceName} 页面未变化（304），跳过抓取`);
        } else if (!headResult.success) {
            // HEAD 失败（部分服务器不支持），尝试直接 GET
            console.log(`[syncSource] ${sourceName} HEAD 失败(${headResult.error})，尝试 GET`);
            const getResult = await httpGet(listUrl, { headers: condHeaders });
            if (getResult.success && getResult.status === 304) {
                pageChanged = false;
            } else if (!getResult.success) {
                return {
                    sourceId,
                    sourceName,
                    status: 'error',
                    reason: `HEAD/GET 探测失败: ${headResult.error || getResult.error}`
                };
            } else {
                newEtag = getResult.etag || newEtag;
                newLastModified = getResult.lastModified || newLastModified;
            }
        } else {
            // HEAD 200：有响应头，用它们更新
            newEtag = headResult.etag || newEtag;
            newLastModified = headResult.lastModified || newLastModified;
        }

        // === 步骤2：页面未变化时只更新时间戳 ===
        if (!pageChanged) {
            await db.collection('sources').doc(_id).update({
                'schedule.lastRunTime': now,
                'schedule.nextRunTime': now + interval,
                updateTime: now
            });
            return { sourceId, sourceName, status: 'unchanged', newCount: 0 };
        }

        // === 步骤3：页面变化，完整抓取 ===
        console.log(`[syncSource] ${sourceName} 页面有更新，开始抓取...`);
        const extractResult = await extractLinksFromPage(listUrl, 10);

        if (!extractResult.success) {
            await db.collection('sources').doc(_id).update({
                'schedule.lastRunTime': now,
                'schedule.nextRunTime': now + interval,
                'stats.lastCheckTime': now,
                updateTime: now
            });
            return { sourceId, sourceName, status: 'error', reason: `抓取失败: ${extractResult.error}` };
        }

        const links = extractResult.links || [];
        console.log(`[syncSource] ${sourceName} 提取到 ${links.length} 个链接`);

        // === 步骤4：写入 url_queue（只写入新链接）===
        const saveResult = await saveNewLinks(links, listUrl, sourceId, sourceName);

        // === 步骤5：更新 source 状态 ===
        await db.collection('sources').doc(_id).update({
            'schedule.lastRunTime': now,
            'schedule.nextRunTime': now + interval,
            'schedule.etag': newEtag || '',
            'schedule.lastModified': newLastModified || '',
            'stats.lastFetchCount': saveResult.newCount,
            'stats.lastCheckTime': now,
            'stats.hasUpdates': saveResult.newCount > 0,
            'stats.totalArticles': (source.stats?.totalArticles || 0) + saveResult.newCount,
            updateTime: now
        });

        return {
            sourceId,
            sourceName,
            status: 'success',
            newCount: saveResult.newCount,
            skippedCount: saveResult.skippedCount
        };
    });
}

// ============ 主入口 ============

exports.main = async (event, context) => {
    // 定时触发器会注入 { Time, TriggerName, Type }，需要过滤掉
    // 支持手动触发（传入 sourceIds）和定时触发（全量）
    const { Time, TriggerName, Type, sourceIds, concurrency = MAX_CONCURRENCY } = event;

    console.log('[syncSources] ===== 定时同步开始 =====');
    if (Time) console.log('[syncSources] 触发时间:', Time);
    console.log('[syncSources] 触发方式:', sourceIds ? '手动指定' : '全量定时');

    try {
        // === 查询需要同步的数据源 ===
        let sourcesQuery;
        if (sourceIds && Array.isArray(sourceIds) && sourceIds.length > 0) {
            // 手动触发：只看指定的数据源
            sourcesQuery = db.collection('sources')
                .where({
                    _id: db.command.in(sourceIds),
                    enabled: true,
                    'schedule.autoSync': true
                })
                .get();
        } else {
            // 定时触发：所有启用自动同步的
            sourcesQuery = db.collection('sources')
                .where({
                    enabled: true,
                    'schedule.autoSync': true
                })
                .get();
        }

        const sourcesResult = await sourcesQuery;
        const sources = sourcesResult.data || [];

        if (sources.length === 0) {
            console.log('[syncSources] 没有需要同步的数据源');
            return {
                code: 0,
                message: '没有需要同步的数据源',
                data: { total: 0, success: 0, failed: 0, unchanged: 0, skipped: 0 }
            };
        }

        console.log(`[syncSources] 待处理 ${sources.length} 个数据源`);

        // === 并发同步 ===
        const semaphore = new Semaphore(concurrency);
        const results = await Promise.all(
            sources.map(source => syncSource(source, semaphore))
        );

        // === 统计 ===
        const stats = {
            total: results.length,
            success: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length,
            unchanged: results.filter(r => r.status === 'unchanged').length,
            skipped: results.filter(r => r.status === 'skip').length,
            totalNewLinks: results.reduce((sum, r) => sum + (r.newCount || 0), 0)
        };

        console.log('[syncSources] ===== 同步完成 =====');
        console.log('[syncSources] 统计:', JSON.stringify(stats));
        console.log('[syncSources] 详情:', JSON.stringify(results));

        return {
            code: 0,
            message: `同步完成：${stats.success} 成功，${stats.failed} 失败，${stats.unchanged} 未变，${stats.skipped} 跳过，新增 ${stats.totalNewLinks} 条链接`,
            data: stats,
            details: results
        };

    } catch (e) {
        console.error('[syncSources] 同步异常:', e);
        return {
            code: 500,
            message: '同步异常: ' + e.message
        };
    }
};

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
 * 快速检测URL是否存在（HEAD请求）
 */
async function checkUrlExists(url) {
    try {
        const res = await axios.head(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
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
    const { sourceUrl, sourceId, sourceName, maxPages = 10, skipCheck = false, openid } = event;

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

        // 4. 统计待处理数量
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

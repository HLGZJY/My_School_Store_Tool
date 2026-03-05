'use strict';

const db = uniCloud.database();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
let MOONSHOT_API_KEY = '';
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';
const TIMEOUT = 300000; // 5分钟

// 读取配置文件
function loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.moonshot?.apiKey) {
                MOONSHOT_API_KEY = config.moonshot.apiKey;
                console.log('[simpleFetch] 配置加载成功');
            }
        } catch (e) {
            console.error('[simpleFetch] 配置加载失败:', e.message);
        }
    }
}
loadConfig();

// ============ 工具函数 ============

// HTTP 请求
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
        const statusText = e.response?.statusText || e.message;
        return { success: false, error: `HTTP ${status}: ${statusText}`, status };
    }
}

// 检测URL是否存在（快速HEAD请求）
async function checkUrlExists(url) {
    try {
        const res = await axios.head(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        return res.status === 200;
    } catch (e) {
        // HEAD可能不被支持，尝试GET（快速获取状态码）
        try {
            const res = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' }, maxRedirects: 0 });
            return res.status === 200;
        } catch (getErr) {
            return getErr.response?.status === 200;
        }
    }
}

// Kimi fetch 工具
async function kimiFetch(url) {
    if (!MOONSHOT_API_KEY) return { success: false, error: 'API Key 未配置' };
    try {
        const res = await axios.post(
            `${MOONSHOT_BASE_URL}/formulas/moonshot/fetch:latest/fibers`,
            { name: 'fetch', arguments: JSON.stringify({ url }) },
            { headers: { 'Authorization': `Bearer ${MOONSHOT_API_KEY}`, 'Content-Type': 'application/json' }, timeout: TIMEOUT }
        );
        if (res.data?.status === 'succeeded') {
            return { success: true, content: res.data.context.encrypted_output || res.data.context.output || '' };
        }
        return { success: false, error: 'Kimi fetch 返回异常' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// Kimi Chat 解析
async function aiParse(content) {
    if (!MOONSHOT_API_KEY) return { success: false, error: 'API Key 未配置' };
    const prompt = `分析网页内容，提取校园通知信息。
内容：${content.substring(0, 8000)}
返回JSON：{"title":"标题","publishTime":"YYYY-MM-DD","content":"正文","summary":"摘要","category":"notice|academic|activity|service|other","tags":[],"urgency":"high|medium|low","isValid":true}`;

    try {
        const res = await axios.post(
            `${MOONSHOT_BASE_URL}/chat/completions`,
            { model: 'kimi-k2-turbo-preview', messages: [{ role: 'system', content: '返回JSON' }, { role: 'user', content: prompt }], temperature: 0.3, response_format: { type: 'json_object' } },
            { headers: { 'Authorization': `Bearer ${MOONSHOT_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
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

// 保存文章
async function saveArticle(item, url) {
    const now = Date.now();
    const existing = await db.collection('articles').where({ originalUrl: url }).get();
    if (existing.data.length > 0) return { exists: true };

    await db.collection('articles').add({
        title: item.title || '无标题',
        content: item.content || '',
        plainText: item.content?.replace(/<[^>]+>/g, '') || '',
        summary: item.summary || '',
        category: item.category || 'notice',
        tags: { source: ['URL抓取'], role: ['通用'], custom: item.tags || [] },
        urgency: item.urgency || 'low',
        sourceId: null, sourceName: 'URL抓取',
        originalUrl: url,
        publishTime: item.publishTime ? new Date(item.publishTime).getTime() : now,
        stats: { viewCount: 0, collectCount: 0, shareCount: 0 },
        aiProcess: { processed: true, confidence: item.isValid ? 80 : 30, model: 'moonshot-k2', processTime: now },
        status: item.isValid ? 'pending' : 'draft',
        createTime: now, updateTime: now
    });
    return { exists: false };
}

// ============ 核心功能 ============

// 提取列表页所有目标链接（支持分页）
async function extractLinks(listUrl, maxPages = 10, skipCheck = false) {
    console.log('[simpleFetch] 提取链接:', listUrl);

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

    // 1. 先提取当前页链接
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
    console.log(`[simpleFetch] 第1页提取到 ${currentLinks.length} 个链接`);

    // 2. 检测分页：尝试访问 当前URL + /1.htm
    const page1Url = listUrl.replace(/(\.htm[l]?)$/, '/1$1');
    if (page1Url !== listUrl) {
        console.log('[simpleFetch] 检测分页，尝试:', page1Url);
        const page1Result = await httpGet(page1Url);

        if (page1Result.success) {
            // 有分页，遍历获取后续页面
            console.log('[simpleFetch] 检测到分页，开始遍历');
            for (let page = 2; page <= maxPages; page++) {
                const pageUrl = listUrl.replace(/(\.htm[l]?)$/, `/${page}$1`);
                console.log(`[simpleFetch] 获取第${page}页: ${pageUrl}`);

                const pageResult = await httpGet(pageUrl);
                if (!pageResult.success) {
                    console.log(`[simpleFetch] 第${page}页不存在，停止`);
                    break;
                }

                const links = extractPageLinks(pageResult.content, baseOrigin, basePath);
                console.log(`[simpleFetch] 第${page}页提取到 ${links.length} 个链接`);

                for (const link of links) {
                    if (!seen.has(link)) {
                        seen.add(link);
                        allLinks.push(link);
                    }
                }
            }
        }
    }

    console.log('[simpleFetch] 共提取到链接数量:', allLinks.length);

    let validLinks = allLinks;

    // 预检验：过滤掉404的链接（可选，默认开启）
    if (!skipCheck) {
        console.log('[simpleFetch] 开始URL预检验，过滤404链接...');
        const tempLinks = [];
        for (const link of allLinks) {
            const exists = await checkUrlExists(link);
            if (exists) {
                tempLinks.push(link);
            } else {
                console.log(`[simpleFetch] 过滤失效链接: ${link}`);
            }
        }
        validLinks = tempLinks;
        console.log(`[simpleFetch] 预检验完成: ${validLinks.length}/${allLinks.length} 有效链接`);
    } else {
        console.log('[simpleFetch] 跳过URL预检验');
    }

    return { success: true, links: validLinks };
}

/**
 * 提取单页链接
 * @param {string} content - HTML内容
 * @param {string} baseOrigin - 域名，如 https://www.scuec.edu.cn
 * @param {string} basePath - 当前页面路径，如 https://www.scuec.edu.cn/cxcy/scss/
 * @returns {string[]} 文章链接数组
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
        const text = match[2].replace(/<[^>]+>/g, '').trim();

        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

        // 相对路径处理
        let fullUrl = href;
        if (href.startsWith('/')) {
            // 绝对路径：如 /cxcy/info/1007/2494.htm
            fullUrl = baseOrigin + href;
        } else if (href.startsWith('../')) {
            // 向上跳转的相对路径
            let base = basePath;
            const parts = href.split('/');
            for (const p of parts) {
                if (p === '..') base = base.substring(0, base.lastIndexOf('/'));
            }
            fullUrl = base + '/' + parts.filter(x => x && x !== '..').join('/');
        } else if (!href.startsWith('http')) {
            // 普通相对路径：如 info/1028/2385.htm
            fullUrl = basePath + href;
        }
        fullUrl = fullUrl.split('#')[0].split('?')[0];

        // ========== 关键修复：处理院校网站常见的错误拼接 ==========
        // 问题示例：
        //   列表页: https://www.scuec.edu.cn/cxcy/scss/ppss.htm
        //   提取到: info/1028/2385.htm (相对路径)
        //   错误拼接: https://www.scuec.edu.cn/cxcy/scss/info/1028/2385.htm
        //   正确URL: https://www.scuec.edu.cn/cxcy/info/1028/2385.htm
        //
        // 解决：当 basePath 中间有多余路径（如 /cxcy/scss/）时，
        // 提取到 info/xxx/xxx.htm 格式的链接，应该去掉中间部分
        // 只保留 /cxcy/info/xxx/xxx.htm
        if (fullUrl.includes('/cxcy/')) {
            // 检查是否匹配 info/数字/数字.htm 格式
            const infoMatch = fullUrl.match(/\/cxcy\/([^/]+)\/info\/\d+\/\d+\.htm/i);
            if (infoMatch) {
                // 去掉中间的错误路径，保留正确格式
                // 例如: /cxcy/scss/info/1028/2385.htm -> /cxcy/info/1028/2385.htm
                const wrongPath = '/' + infoMatch[1] + '/info/'; // /scss/info/
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

// ============ 主入口 ============

exports.main = async (event, context) => {
    const { url, mode = 'list', step = 'all', limit = 50, maxPages = 10, links = [], startIndex = 0, openid, skipCheck = false } = event;
    const startTime = Date.now();

    if (!url && links.length === 0) return { code: 400, message: 'URL不能为空' };
    if (!openid) return { code: 401, message: '未登录' };

    try {
        // 简单HTTP请求
        if (mode === 'simple') {
            const result = await httpGet(url);
            return { code: 0, data: { url, ...result } };
        }

        // Kimi fetch（保留但默认不使用）
        if (mode === 'kimi') {
            const result = await kimiFetch(url);
            return { code: 0, data: { url, ...result } };
        }

        // AI解析测试模式：只处理前5篇，返回AI解析结果（不存储）
        if (mode === 'test-ai') {
            const linksResult = await extractLinks(url, maxPages, skipCheck);
            if (!linksResult.success) return { code: 500, message: '获取链接失败: ' + linksResult.error };

            const allLinks = linksResult.links || [];
            if (allLinks.length === 0) return { code: 404, message: '未找到文章链接' };

            // 只处理前5篇
            const testLinks = allLinks.slice(0, 5);
            const results = [];

            for (let i = 0; i < testLinks.length; i++) {
                const articleUrl = testLinks[i];
                console.log(`[simpleFetch] AI测试 ${i + 1}/5: ${articleUrl}`);

                // 获取HTML内容
                const httpRes = await httpGet(articleUrl);
                console.log(`[simpleFetch] 获取结果: ${articleUrl}, success=${httpRes.success}, status=${httpRes.status || 'N/A'}`);
                if (!httpRes.success) {
                    console.log(`[simpleFetch] 获取失败: ${httpRes.error}`);
                    results.push({ url: articleUrl, status: 'fetch_failed', error: httpRes.error, httpStatus: httpRes.status });
                    continue;
                }

                // AI解析
                const aiRes = await aiParse(httpRes.content);
                results.push({
                    url: articleUrl,
                    status: aiRes.success ? 'success' : 'parse_failed',
                    error: aiRes.error,
                    data: aiRes.data
                });
            }

            return {
                code: 0,
                data: {
                    mode: 'test-ai',
                    totalLinks: allLinks.length,
                    tested: results.length,
                    results
                }
            };
        }

        // 列表页抓取
        if (mode === 'list') {
            let allLinks = [];

            // 步骤1：只获取链接列表
            if (step === 'links' || step === 'all') {
                const linksResult = await extractLinks(url, maxPages, skipCheck);
                if (!linksResult.success) return { code: 500, message: '获取链接失败: ' + linksResult.error };

                allLinks = linksResult.links || [];
                if (allLinks.length === 0) return { code: 404, message: '未找到文章链接' };

                // 如果只需要获取链接，直接返回
                if (step === 'links') {
                    const estimatedTime = allLinks.length * 5; // 预计每个5秒
                    return {
                        code: 0,
                        data: {
                            step: 'links',
                            totalFound: allLinks.length,
                            estimatedTime, // 预计总时间（秒）
                            links: allLinks
                        }
                    };
                }
            } else {
                // step === 'process' 时，使用传入的 links
                allLinks = links;
            }

            // 步骤2：处理文章
            const processLinks = allLinks.slice(startIndex, startIndex + limit);
            const results = [];

            // 预计剩余时间
            const totalToProcess = allLinks.length - startIndex;
            const estimatedTime = Math.ceil(totalToProcess * 5); // 每个5秒

            for (let i = 0; i < processLinks.length; i++) {
                const articleUrl = processLinks[i];
                const currentIndex = startIndex + i + 1;
                console.log(`[simpleFetch] 处理 ${currentIndex}/${allLinks.length}: ${articleUrl}`);

                // 获取详情
                const httpRes = await httpGet(articleUrl);
                console.log(`[simpleFetch] 获取: ${articleUrl}, status=${httpRes.status || httpRes.error}`);
                if (!httpRes.success) {
                    results.push({ url: articleUrl, status: 'fetch_failed', error: httpRes.error, httpStatus: httpRes.status });
                    continue;
                }

                // AI解析
                const aiRes = await aiParse(httpRes.content);
                if (!aiRes.success) {
                    results.push({ url: articleUrl, status: 'parse_failed', error: aiRes.error });
                    continue;
                }

                // 保存
                const saveRes = await saveArticle(aiRes.data, articleUrl);
                results.push({ url: articleUrl, status: saveRes.exists ? 'exists' : 'saved', title: aiRes.data?.title });
            }

            // 返回进度信息
            const processedCount = startIndex + results.length;
            const remaining = allLinks.length - processedCount;
            const elapsed = Math.ceil((Date.now() - startTime) / 1000);
            const avgTimePerArticle = processedCount > 0 ? elapsed / processedCount : 5;
            const remainingTime = Math.ceil(remaining * avgTimePerArticle);

            return {
                code: 0,
                data: {
                    step: 'process',
                    listUrl: url,
                    totalFound: allLinks.length,
                    processed: processedCount,
                    remaining, // 剩余数量
                    progress: `${processedCount}/${allLinks.length}`,
                    elapsed, // 已用时间（秒）
                    estimatedRemainingTime: remainingTime, // 预计剩余时间（秒）
                    hasMore: remaining > 0,
                    nextStartIndex: processedCount,
                    results
                }
            };
        }

        return { code: 400, message: '未知模式' };
    } catch (e) {
        console.error('[simpleFetch] 错误:', e);
        return { code: 500, message: e.message };
    }
};

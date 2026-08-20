'use strict';

const db = uniCloud.database();
const axios = require('axios');

// ============ 配置 ============
const TITLE_CACHE_TTL = 2592000000; // 30 days in ms
const FETCH_TIMEOUT = 10000; // 10s
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

// ============ SSRF 防护 ============
function isPrivateUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return true;
        }

        // 10.x.x.x
        if (/^10\./.test(hostname)) {
            return true;
        }

        // 172.16.x.x - 172.31.x.x
        if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) {
            return true;
        }

        // 192.168.x.x
        if (/^192\.168\./.test(hostname)) {
            return true;
        }

        return false;
    } catch (e) {
        return true; // Invalid URL treated as unsafe
    }
}

// ============ 日期提取 ============
const DATE_PATTERNS = [
    /(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?)/,
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4}\/\d{2}\/\d{2})/,
    /(\d{4}\.\d{2}\.\d{2})/,
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
    /<meta\s+(?:property|name)=["'](?:pubdate|publishTime|article:published_time)["']\s+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i
];

function parseDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (cnMatch) {
        const [, year, month, day] = cnMatch;
        return year + "-" + month.padStart(2, "0") + "-" + day.padStart(2, "0");
    }
    if (/\d{4}\/\d{2}\/\d{2}/.test(dateStr)) {
        const normalized = dateStr.replace(/\//g, "-");
        const d = new Date(normalized);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    if (/\d{4}\.\d{2}\.\d{2}/.test(dateStr)) {
        const normalized = dateStr.replace(/\./g, "-");
        const d = new Date(normalized);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
}

function extractPublishTime(html) {
    for (const pattern of DATE_PATTERNS) {
        const match = html.match(pattern);
        if (match && match[1]) {
            const dateStr = match[1].length === 4 ? match[0] : match[1];
            const parsed = parseDate(dateStr);
            if (parsed) return parsed;
        }
    }
    return null;
}

// ============ 标题提取 ============
function extractTitle(html) {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
}

// ============ 主入口 ============
exports.main = async (event, context) => {
    const { url, forceRefresh = false } = event;

    // 1. Validate URL
    if (!url || typeof url !== 'string') {
        return { title: null, url: url || '' };
    }

    if (isPrivateUrl(url)) {
        return { title: null, url, publishTime: null };
    }

    try {
        // 2. Check cache if not force refresh
        if (!forceRefresh) {
            const cached = await db.collection('url_queue')
                .where({ url })
                .field({ title: true, titleTime: true, publishTime: true })
                .get();

            if (cached.data && cached.data.length > 0) {
                const record = cached.data[0];
                const now = Date.now();
                if (record.title && record.titleTime && (now - record.titleTime) < TITLE_CACHE_TTL) {
                    return { title: record.title, url, publishTime: record.publishTime || null };
                }
            }
        }

        // 3. Fetch URL
        let response;
        try {
            response = await axios.get(url, {
                timeout: FETCH_TIMEOUT,
                maxRedirects: MAX_REDIRECTS,
                maxContentLength: MAX_RESPONSE_SIZE,
                maxBodyLength: MAX_RESPONSE_SIZE,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
        } catch (e) {
            console.error('[getUrlTitle] Fetch failed:', e.message);
            return { title: null, url, publishTime: null };
        }

        // 4. Extract title and publishTime
        const html = typeof response.data === 'string' ? response.data : '';
        const title = extractTitle(html);
        const publishTime = extractPublishTime(html);

        if (!title) {
            return { title: null, url, publishTime: null };
        }

        // 5. Upsert to url_queue
        const now = Date.now();
        const existing = await db.collection('url_queue')
            .where({ url })
            .field({ _id: true })
            .get();

        if (existing.data && existing.data.length > 0) {
            await db.collection('url_queue').doc(existing.data[0]._id).update({
                title,
                titleTime: now,
                updateTime: now,
                publishTime: publishTime || null
            });
        }

        return { title, url, publishTime: publishTime || null };
    } catch (e) {
        console.error('[getUrlTitle] Error:', e.message);
        return { title: null, url, publishTime: null };
    }
};

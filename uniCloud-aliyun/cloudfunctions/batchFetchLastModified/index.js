'use strict';

const db = uniCloud.database();
const httpGet = require('../common/httpGet');

/**
 * 并发抓取多个 URL 的 HTTP Last-Modified Header 并写回 url_queue
 * @param {string[]} linkIds - url_queue 记录的 _id 数组
 * @returns {Promise<{success: number, failed: number}>}
 */
async function batchFetchLastModified(linkIds) {
    if (!linkIds || linkIds.length === 0) {
        return { success: 0, failed: 0 };
    }

    // 1. 查出所有 URL
    const links = await db.collection('url_queue')
        .where({ _id: db.command.in(linkIds) })
        .field({ _id: true, url: true })
        .get();

    if (!links.data || links.data.length === 0) {
        return { success: 0, failed: 0 };
    }

    console.log('[batchFetchLastModified] 开始并发抓取，共', links.data.length, '个链接');

    // 2. 并发抓取所有 URL 的 Header
    const fetches = links.data.map(link =>
        (async () => {
            const res = await httpGet(link.url);
            if (res.code !== 0) {
                console.log('[batchFetchLastModified] HTTP 失败:', link.url, res.message);
                return { _id: link._id, ok: false };
            }

            const lm = res.data.headers?.['last-modified'];
            if (!lm) {
                console.log('[batchFetchLastModified] 无 Last-Modified:', link.url);
                return { _id: link._id, ok: false };
            }

            const ts = Date.parse(lm);
            if (!ts || isNaN(ts)) {
                console.log('[batchFetchLastModified] Last-Modified 解析失败:', link.url, lm);
                return { _id: link._id, ok: false };
            }

            // 时间合理性校验：2000-01-01 至 明天
            const minTime = new Date('2000-01-01').getTime();
            const maxTime = Date.now() + 86400000;
            if (ts < minTime || ts > maxTime) {
                console.log('[batchFetchLastModified] Last-Modified 超合理范围:', link.url, lm);
                return { _id: link._id, ok: false };
            }

            const isoDate = new Date(ts).toISOString().split('T')[0];
            console.log('[batchFetchLastModified] 提取成功:', link.url, '->', isoDate);
            return { _id: link._id, ok: true, publishTime: isoDate, titleTime: Date.now() };
        })()
    );

    const results = await Promise.all(fetches);

    // 3. 批量写回 url_queue
    const updates = results.filter(r => r.ok);
    if (updates.length > 0) {
        await Promise.all(updates.map(r =>
            db.collection('url_queue').doc(r._id).update({
                publishTime: r.publishTime,
                titleTime: r.titleTime,
                updateTime: Date.now()
            })
        ));
    }

    console.log('[batchFetchLastModified] 完成: 成功', updates.length, '失败', results.length - updates.length);
    return { success: updates.length, failed: results.length - updates.length };
}

exports.main = async (event, context) => {
    const { linkIds } = event;

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
        return { code: 400, message: 'linkIds 不能为空' };
    }

    try {
        const result = await batchFetchLastModified(linkIds);
        return { code: 0, data: result };
    } catch (e) {
        console.error('[batchFetchLastModified] 错误:', e.message);
        return { code: 500, message: e.message };
    }
};

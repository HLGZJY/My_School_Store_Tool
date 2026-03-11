'use strict';

const db = uniCloud.database();
const dbCmd = db.command;

/**
 * 获取统计数据
 */
async function getStats() {
    try {
        // 获取文章总数
        const articlesCount = await db.collection('articles').count();
        console.log('[adminStats] 文章总数:', articlesCount.total);

        // 获取今日新增文章数
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayArticles = await db.collection('articles')
            .where({
                createdAt: dbCmd.gte(todayStart.getTime())
            })
            .count();
        console.log('[adminStats] 今日新增:', todayArticles.total);

        // 获取待审核文章数
        const pendingReview = await db.collection('articles')
            .where({ status: 'pending' })
            .count();
        console.log('[adminStats] 待审核:', pendingReview.total);

        // 获取数据源数量
        const sourcesCount = await db.collection('sources').count();
        console.log('[adminStats] 数据源:', sourcesCount.total);

        // 获取链接池待处理数量
        const pendingLinks = await db.collection('url_queue')
            .where({ status: 'pending' })
            .count();
        console.log('[adminStats] 待处理链接:', pendingLinks.total);

        return {
            totalArticles: articlesCount.total || 0,
            todayArticles: todayArticles.total || 0,
            pendingReview: pendingReview.total || 0,
            sources: sourcesCount.total || 0,
            pendingLinks: pendingLinks.total || 0
        };
    } catch (e) {
        console.error('[adminStats] 获取统计数据失败:', e);
        // 返回默认值而不是抛出错误
        return {
            totalArticles: 0,
            todayArticles: 0,
            pendingReview: 0,
            sources: 0,
            pendingLinks: 0
        };
    }
}

/**
 * 获取最近采集日志
 */
async function getRecentLogs() {
    try {
        const logs = await db.collection('url_queue')
            .orderBy('fetchTime', 'desc')
            .limit(10)
            .get();

        // 按 fetchTime 分组，获取每次提取的结果
        const logMap = new Map();
        for (const item of logs.data) {
            const key = item.fetchTime || item.updateTime;
            if (!key) continue;

            const date = new Date(key);
            const dateStr = `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

            if (!logMap.has(key)) {
                logMap.set(key, {
                    time: key,
                    dateStr: dateStr,
                    sourceName: item.sourceName || item.sourceId || '未知',
                    processed: 0,
                    failed: 0
                });
            }

            if (item.status === 'processed') {
                logMap.get(key).processed++;
            } else if (item.status === 'failed') {
                logMap.get(key).failed++;
            }
        }

        // 转换为数组并返回
        return Array.from(logMap.values())
            .sort((a, b) => b.time - a.time)
            .slice(0, 5)
            .map(log => ({
                time: log.dateStr,
                message: `从 ${log.sourceName} 提取链接`,
                status: log.failed > 0 ? 'error' : 'success',
                statusText: log.failed > 0 ? `${log.processed}成功/${log.failed}失败` : `${log.processed}条`
            }));
    } catch (e) {
        console.error('[adminStats] 获取日志失败:', e);
        return [];
    }
}

exports.main = async (event, context) => {
    const { action } = event;

    try {
        // 获取统计数据
        if (action === 'getStats' || !action) {
            const stats = await getStats();
            return {
                code: 0,
                message: '获取成功',
                data: stats
            };
        }

        // 获取最近日志
        if (action === 'getLogs') {
            const logs = await getRecentLogs();
            return {
                code: 0,
                message: '获取成功',
                data: logs
            };
        }

        return {
            code: 400,
            message: '未知操作'
        };

    } catch (error) {
        console.error('adminStats error:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

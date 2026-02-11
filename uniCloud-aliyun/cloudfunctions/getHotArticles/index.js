'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { days = 7, limit = 5 } = event;
        const now = Date.now();

        console.log('=== getHotArticles 云函数开始 ===');
        console.log('当前时间:', now);
        console.log('days:', days, 'limit:', limit);

        try {
            // 计算7天前的时间戳
            const sevenDaysAgo = now - days * 24 * 60 * 60 * 1000;
            console.log('sevenDaysAgo:', sevenDaysAgo, new Date(sevenDaysAgo).toISOString());

            // 从 articles 表获取热门文章（按浏览量排序）
            const res = await db.collection('articles')
                .where({
                    status: 'published',
                    publishTime: db.command.gte(sevenDaysAgo)
                })
                .orderBy('publishTime', 'desc')
                .limit(100)
                .get();

            console.log('getHotArticles: 获取到文章数量', res.data.length);

            // 按浏览量排序（没有则按发布时间）
            const sortedData = res.data
                .sort((a, b) => (b.stats?.viewCount || 0) - (a.stats?.viewCount || 0))
                .slice(0, limit);

            console.log('getHotArticles: 返回文章数量', sortedData.length);

            return {
                code: 0,
                message: 'success',
                data: sortedData.map(item => ({
                    _id: item._id,
                    title: item.title,
                    count: item.stats?.viewCount || 0
                }))
            };
        } catch (error) {
            console.error('获取热门排行失败:', error);
            return {
                code: -1,
                message: '获取热门排行失败',
                data: []
            };
        }
    }
};

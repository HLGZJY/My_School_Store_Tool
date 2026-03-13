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
            // 从 articles 表获取热门文章（按浏览量排序），不限制时间
            const res = await db.collection('articles')
                .where({
                    status: db.command.in(['published', 'pending'])
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

'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const now = Date.now();
        console.log('=== getTimeline 云函数开始 ===');
        console.log('当前时间:', now);

        try {
            // 获取最近7天的文章，按日期分组
            const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
            console.log('sevenDaysAgo:', sevenDaysAgo, new Date(sevenDaysAgo).toISOString());

            const res = await db.collection('articles')
                .where({
                    status: 'published',
                    publishTime: db.command.gte(sevenDaysAgo)
                })
                .orderBy('publishTime', 'desc')
                .get();

            console.log('getTimeline: 获取到文章数量', res.data.length);

            // 按日期分组
            const dateGroupMap = {};

            res.data.forEach(article => {
                const date = new Date(article.publishTime);
                const dateKey = `${date.getMonth() + 1}-${date.getDate()}`;
                const timestamp = new Date(date.toDateString()).getTime();

                if (!dateGroupMap[dateKey]) {
                    dateGroupMap[dateKey] = {
                        timestamp,
                        date: dateKey,
                        count: 0,
                        expanded: false,
                        articles: []
                    };
                }
                dateGroupMap[dateKey].count++;
                dateGroupMap[dateKey].articles.push({
                    _id: article._id,
                    title: article.title,
                    publishTime: article.publishTime
                });
            });

            // 转换为数组
            const timeline = Object.values(dateGroupMap)
                .sort((a, b) => b.timestamp - a.timestamp);

            return {
                code: 0,
                message: 'success',
                data: timeline
            };
        } catch (error) {
            console.error('获取时间轴失败:', error);
            return {
                code: -1,
                message: '获取时间轴失败',
                data: []
            };
        }
    }
};

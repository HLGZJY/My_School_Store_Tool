'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const now = Date.now();
        const { range = 'week' } = event;
        console.log('=== getTimeline 云函数开始 ===');
        console.log('当前时间:', now);
        console.log('请求的时间范围:', range);

        try {
            // 根据时间范围计算开始时间
            let startTime = 0;
            const nowDate = new Date();

            if (range === 'week') {
                // 本周一开始
                const dayOfWeek = nowDate.getDay() || 7; // 周日为0转成7
                startTime = new Date(nowDate.setDate(nowDate.getDate() - dayOfWeek + 1)).setHours(0, 0, 0, 0);
            } else if (range === 'month') {
                // 本月1日
                startTime = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
            }
            // 'all' 范围 startTime 为 0，不限制

            // 构建查询条件
            const queryCondition = {
                status: db.command.in(['published', 'pending'])
            };

            // 如果不是全部范围，添加时间条件
            if (startTime > 0) {
                queryCondition.publishTime = db.command.gte(startTime);
            }

            const res = await db.collection('articles')
                .where(queryCondition)
                .orderBy('publishTime', 'desc')
                .limit(100)
                .get();

            console.log('getTimeline: 获取到文章数量', res.data.length);

            // 按日期分组
            const dateGroupMap = {};

            res.data.forEach(article => {
                const date = new Date(article.publishTime);
                const year = date.getFullYear();
                const dateKey = `${date.getMonth() + 1}-${date.getDate()}`;
                const timestamp = new Date(date.toDateString()).getTime();

                if (!dateGroupMap[dateKey]) {
                    dateGroupMap[dateKey] = {
                        timestamp,
                        date: dateKey,
                        year: `${year}年`,
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

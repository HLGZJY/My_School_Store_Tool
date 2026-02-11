'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid, page = 1, pageSize = 20 } = event;

        console.log('=== getReadingHistory ===');
        console.log('openid:', openid, 'page:', page, 'pageSize:', pageSize);

        try {
            if (!openid) {
                return {
                    code: -1,
                    message: '参数不完整',
                    data: { history: [], hasMore: false }
                };
            }

            const collection = db.collection('readHistory');

            // 查询该用户的阅读历史
            const res = await collection
                .where({ openid: openid })
                .orderBy('readTime', 'desc')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .get();

            // 计算总数
            const countRes = await collection.where({ openid: openid }).count();
            const total = countRes.total;

            console.log('查询到阅读历史:', res.data.length, '总条数:', total);

            return {
                code: 0,
                message: 'success',
                data: {
                    history: res.data,
                    total: total,
                    hasMore: (page - 1) * pageSize + pageSize < total
                }
            };
        } catch (error) {
            console.error('获取阅读历史失败:', error);
            return {
                code: -1,
                message: '获取阅读历史失败',
                data: { history: [], hasMore: false }
            };
        }
    }
};

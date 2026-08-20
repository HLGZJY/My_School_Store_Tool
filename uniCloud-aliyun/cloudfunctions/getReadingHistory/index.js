'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid, sourceId, page = 1, pageSize = 20 } = event;

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
            let query = { openid: openid };
            let res, countRes;

            if (sourceId) {
                // 如果指定来源，需要先获取所有数据再过滤
                const allRes = await collection
                    .where({ openid: openid })
                    .orderBy('readTime', 'desc')
                    .get();

                // 过滤来源
                let filteredData = allRes.data;
                if (sourceId) {
                    filteredData = filteredData.filter(h =>
                        h.article && h.article.sourceId === sourceId
                    );
                }

                // 分页
                const startIndex = (page - 1) * pageSize;
                const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

                res = { data: paginatedData };
                countRes = { total: filteredData.length };
            } else {
                // 无来源筛选，直接查询
                res = await collection
                    .where({ openid: openid })
                    .orderBy('readTime', 'desc')
                    .skip((page - 1) * pageSize)
                    .limit(pageSize)
                    .get();

                countRes = await collection.where({ openid: openid }).count();
            }

            const total = countRes.total;

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

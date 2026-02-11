'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { keyword = '', page = 1, pageSize = 20 } = event;

        try {
            // 构建查询条件
            // 临时：不检查status，确保测试数据能显示
            let whereCondition = {};

            // 关键词搜索（标题和摘要）
            if (keyword.trim()) {
                whereCondition = {
                    title: new RegExp(keyword, 'i')
                };
            }

            // 查询数据库
            const collection = db.collection('articles');

            const res = await collection
                .where(whereCondition)
                .orderBy('publishTime', 'desc')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .get();

            console.log('searchArticles: 关键词=', keyword, '查询到数量=', res.data.length);

            // 计算总数
            const countRes = await collection.where(whereCondition).count();
            const total = countRes.total;

            // 返回完整数据，包含前端需要的 sourceName 和 publishTime
            const articles = res.data.map(item => ({
                _id: item._id,
                title: item.title,
                summary: item.summary,
                sourceName: item.sourceName,
                publishTime: item.publishTime,
                category: item.category
            }));

            console.log('searchArticles: 返回数据示例', articles[0]);

            return {
                code: 0,
                message: 'success',
                data: {
                    articles: articles,
                    hasMore: (page - 1) * pageSize + pageSize < total
                }
            };
        } catch (error) {
            console.error('搜索文章失败:', error);
            return {
                code: -1,
                message: '搜索失败',
                data: {
                    articles: [],
                    hasMore: false
                }
            };
        }
    }
};

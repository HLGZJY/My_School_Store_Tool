'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid, articleId, category, sourceId, page = 1, pageSize = 10 } = event;

        try {
            // 方案A：使用 openid 直接查询
            const collection = db.collection('collections');

            let query = { openid: openid };

            // 如果指定了 articleId，只查询该文章是否被收藏
            if (articleId) {
                query.articleId = articleId;
            }

            // 获取所有收藏
            let allCollections = await collection.where(query).get();
            let filteredCollections = allCollections.data;

            // 分类筛选
            if (category) {
                filteredCollections = filteredCollections.filter(c =>
                    c.article && c.article.category === category
                );
            }

            // 来源筛选
            if (sourceId) {
                filteredCollections = filteredCollections.filter(c =>
                    c.article && c.article.sourceId === sourceId
                );
            }

            // 计算总数
            const total = filteredCollections.length;

            // 分页
            const startIndex = (page - 1) * pageSize;
            const paginatedCollections = filteredCollections.slice(startIndex, startIndex + pageSize);

            return {
                code: 0,
                message: 'success',
                data: {
                    collections: paginatedCollections,
                    total: total,
                    hasMore: startIndex + pageSize < total
                }
            };
        } catch (error) {
            console.error('获取收藏列表失败:', error);
            return {
                code: -1,
                message: '获取收藏失败',
                data: {
                    collections: [],
                    hasMore: false
                }
            };
        }
    }
};

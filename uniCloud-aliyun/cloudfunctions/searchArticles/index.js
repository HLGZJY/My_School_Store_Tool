'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const {
            keyword = '',
            page = 1,
            pageSize = 20,
            sourceId = '',
            tag = '',
            startDate = 0,
            endDate = 0
        } = event;

        try {
            // 构建查询条件
            let whereCondition = {};

            // 关键词搜索（标题）
            if (keyword.trim()) {
                whereCondition.title = new RegExp(keyword, 'i');
            }

            // 来源筛选
            if (sourceId) {
                whereCondition.sourceId = sourceId;
            }

            // 标签筛选
            if (tag) {
                whereCondition['tags.source'] = tag;
            }

            // 时间范围筛选
            if (startDate > 0 && endDate > 0) {
                whereCondition.publishTime = db.command.and(
                    db.command.gte(startDate),
                    db.command.lte(endDate)
                );
            } else if (startDate > 0) {
                whereCondition.publishTime = db.command.gte(startDate);
            } else if (endDate > 0) {
                whereCondition.publishTime = db.command.lte(endDate);
            }

            // 查询数据库
            const collection = db.collection('articles');

            const res = await collection
                .where(whereCondition)
                .orderBy('publishTime', 'desc')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .get();

            // 计算总数
            const countRes = await collection.where(whereCondition).count();
            const total = countRes.total;

            // 返回完整数据
            const articles = res.data.map(item => ({
                _id: item._id,
                title: item.title,
                summary: item.summary,
                sourceName: item.sourceName,
                publishTime: item.publishTime,
                category: item.category
            }));

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

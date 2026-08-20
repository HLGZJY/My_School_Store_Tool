'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const {
            page = 1,
            pageSize = 10,
            category = '',
            sourceId = '',
            sourceIds = [],
            tag = '',
            startDate = 0,
            endDate = 0
        } = event;

        console.log('[getArticles] Called with params:', JSON.stringify({
            page, pageSize, category, sourceId,
            sourceIdsLength: sourceIds ? sourceIds.length : 0,
            tag, startDate, endDate
        }));

        try {
            // 构建查询条件 - 只查询已发布的文章
            const whereCondition = {
                status: 'published'
            };

            // 分类筛选
            if (category) {
                whereCondition.category = category;
                console.log('[getArticles] Category filter:', category);
            }

            // 来源筛选（支持单个 sourceId 或多个 sourceIds 数组）
            if (sourceId) {
                whereCondition.sourceId = sourceId;
                console.log('[getArticles] SourceId filter:', sourceId);
            } else if (sourceIds && sourceIds.length > 0) {
                whereCondition.sourceId = db.command.in(sourceIds);
                console.log('[getArticles] SourceIds filter (in):', sourceIds);
            } else {
                console.log('[getArticles] No source filter - querying all published articles');
            }

            // 标签筛选 - 查询 tags.custom 字段（存储 AI/正则提取的分类标签）
            if (tag) {
                whereCondition['tags.custom'] = tag;
                console.log('[getArticles] Tag filter:', tag);
            }

            // 时间范围筛选
            if (startDate > 0 && endDate > 0) {
                whereCondition.publishTime = db.command.and(
                    db.command.gte(startDate),
                    db.command.lte(endDate)
                );
                console.log('[getArticles] Date range:', startDate, 'to', endDate);
            } else if (startDate > 0) {
                whereCondition.publishTime = db.command.gte(startDate);
                console.log('[getArticles] Start date:', startDate);
            } else if (endDate > 0) {
                whereCondition.publishTime = db.command.lte(endDate);
                console.log('[getArticles] End date:', endDate);
            }

            console.log('[getArticles] Final whereCondition:', JSON.stringify(whereCondition));

            // 查询数据库
            const collection = db.collection('articles');

            const res = await collection
                .where(whereCondition)
                .orderBy('publishTime', 'desc')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .get();

            console.log('[getArticles] Query returned', res.data.length, 'articles');
            if (res.data.length > 0) {
                console.log('[getArticles] First article:', JSON.stringify(res.data[0]).substring(0, 200));
            }

            // 计算总数
            const countRes = await collection.where(whereCondition).count();
            const total = countRes.total;
            console.log('[getArticles] Total articles matching:', total);

            // 获取推荐文章（最新发布的5条）
            const recommendRes = await collection
                .where({ status: 'published' })
                .orderBy('publishTime', 'desc')
                .limit(5)
                .get();

            console.log('[getArticles] Recommendations:', recommendRes.data.length, 'articles');

            return {
                code: 0,
                message: 'success',
                data: {
                    list: res.data,
                    recommendations: recommendRes.data.map(item => ({
                        _id: item._id,
                        title: item.title,
                        sourceName: item.sourceName,
                        publishTime: item.publishTime,
                        matchReason: '最新发布'
                    })),
                    hasMore: (page - 1) * pageSize + pageSize < total,
                    total
                }
            };
        } catch (error) {
            console.error('[getArticles] Error:', error.message, error.stack);
            return {
                code: -1,
                message: '获取文章失败: ' + error.message,
                data: null
            };
        }
    }
};

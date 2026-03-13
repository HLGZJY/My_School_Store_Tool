'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const {
            page = 1,
            pageSize = 10,
            category = '',
            userRole = 'student',
            sourceId = '',
            sourceIds = [],  // 支持多个来源筛选
            tag = '',
            startDate = 0,
            endDate = 0
        } = event;

        try {
            // 构建查询条件
            const whereCondition = {};

            // 支持前端传入的 status 筛选（管理员审核页面需要）
            if (event.where && event.where.status) {
                whereCondition.status = event.where.status;
            } else if (!event.where) {
                // 默认只查询已发布的文章（只有传入 where 时才不过滤）
                whereCondition.status = 'published';
            }

            // 关键字搜索
            if (event.where && event.where.title && event.where.title.$regex) {
                whereCondition.title = event.where.title;
            }

            // 分类筛选
            if (category) {
                whereCondition.category = category;
            }

            // 来源筛选（支持单个 sourceId 或多个 sourceIds 数组）
            if (sourceId) {
                whereCondition.sourceId = sourceId;
            } else if (sourceIds && sourceIds.length > 0) {
                whereCondition.sourceId = db.command.in(sourceIds);
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

            // 按角色过滤（如果有role标签且不是"通用"）
            // 暂不处理，留给前端展示时过滤

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

            // 获取推荐文章（最新发布的5条）
            const recommendRes = await collection
                .where({ status: 'published' })
                .orderBy('publishTime', 'desc')
                .limit(5)
                .get();

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
            console.error('获取文章失败:', error);
            return {
                code: -1,
                message: '获取文章失败',
                data: null
            };
        }
    }
};

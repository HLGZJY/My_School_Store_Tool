'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { articleId } = event;

        console.log('=== getArticleDetail ===');
        console.log('articleId:', articleId);

        try {
            // 获取文章详情
            const articleRes = await db.collection('articles')
                .where({ _id: articleId })
                .get();

            if (articleRes.data.length === 0) {
                return {
                    code: -1,
                    message: '文章不存在',
                    data: null
                };
            }

            const article = articleRes.data[0];

            // 获取相关推荐（同一来源的最新文章）
            const relatedRes = await db.collection('articles')
                .where({
                    _id: db.command.neq(articleId),
                    sourceId: article.sourceId,
                    status: 'published'
                })
                .orderBy('publishTime', 'desc')
                .limit(3)
                .get();

            // 增加浏览量
            await db.collection('articles')
                .where({ _id: articleId })
                .update({
                    'stats.viewCount': db.command.inc(1)
                });

            // 处理返回数据
            const articleData = {
                _id: article._id,
                title: article.title,
                summary: article.summary,
                content: article.content,
                sourceName: article.sourceName,
                sourceId: article.sourceId,
                category: article.category,
                categoryName: article.categoryName,
                tags: article.tags,
                urgency: article.urgency,
                publishTime: article.publishTime,
                originalUrl: article.originalUrl,
                stats: article.stats || { viewCount: 0, collectCount: 0 },
                relatedArticles: relatedRes.data.map(item => ({
                    _id: item._id,
                    title: item.title,
                    sourceName: item.sourceName,
                    publishTime: item.publishTime
                }))
            };

            console.log('返回文章数据:', articleData._id, articleData.title);

            return {
                code: 0,
                message: 'success',
                data: articleData
            };
        } catch (error) {
            console.error('获取文章详情失败:', error);
            return {
                code: -1,
                message: '获取文章详情失败',
                data: null
            };
        }
    }
};

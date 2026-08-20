'use strict';

const db = uniCloud.database();
const collection = db.collection('collections');

module.exports = {
    async main(event) {
        const { userId: openid, articleId, action } = event;

        console.log('=== collectArticle ===');
        console.log('openid:', openid, 'articleId:', articleId, 'action:', action);

        try {
            if (!openid || !articleId) {
                return {
                    code: -1,
                    message: '参数不完整',
                    data: null
                };
            }

            // 检查是否已收藏
            const existRes = await collection
                .where({
                    openid: openid,
                    articleId: articleId
                })
                .get();

            if (action === 'collect') {
                if (existRes.data.length > 0) {
                    return {
                        code: -1,
                        message: '已收藏',
                        data: null
                    };
                }

                // 获取文章信息
                const articleRes = await db.collection('articles')
                    .where({ _id: articleId })
                    .get();

                const articleData = articleRes.data[0] || {};

                // 添加收藏
                await collection.add({
                    openid: openid,
                    articleId: articleId,
                    article: {
                        title: articleData.title || '',
                        sourceName: articleData.sourceName || '',
                        publishTime: articleData.publishTime || Date.now(),
                        category: articleData.category || ''
                    },
                    collectTime: Date.now()
                });

                // 更新文章收藏数
                await db.collection('articles')
                    .where({ _id: articleId })
                    .update({
                        'stats.collectCount': db.command.inc(1)
                    });

                // 更新用户收藏计数
                await db.collection('users')
                    .where({ openid: openid })
                    .update({
                        'stats.collectCount': db.command.inc(1)
                    });

                console.log('收藏成功');
                return {
                    code: 0,
                    message: '收藏成功',
                    data: { collected: true }
                };
            } else {
                if (existRes.data.length === 0) {
                    return {
                        code: -1,
                        message: '未收藏',
                        data: null
                    };
                }

                // 取消收藏
                await collection
                    .where({
                        openid: openid,
                        articleId: articleId
                    })
                    .remove();

                // 减少文章收藏数
                await db.collection('articles')
                    .where({ _id: articleId })
                    .update({
                        'stats.collectCount': db.command.inc(-1)
                    });

                // 减少用户收藏计数
                await db.collection('users')
                    .where({ openid: openid })
                    .update({
                        'stats.collectCount': db.command.inc(-1)
                    });

                console.log('取消收藏成功');
                return {
                    code: 0,
                    message: '取消收藏成功',
                    data: { collected: false }
                };
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            return {
                code: -1,
                message: '操作失败',
                data: null
            };
        }
    }
};

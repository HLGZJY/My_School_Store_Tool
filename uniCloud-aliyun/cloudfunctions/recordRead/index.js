'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid, articleId, duration } = event;

        console.log('=== recordRead ===');
        console.log('openid:', openid, 'articleId:', articleId, 'duration:', duration);

        try {
            if (!articleId) {
                return {
                    code: -1,
                    message: '参数不完整',
                    data: null
                };
            }

            // 方案A：直接使用前端传来的 openid（后续应改为用户数据库文档ID）
            // 获取文章信息
            const articleRes = await db.collection('articles')
                .where({ _id: articleId })
                .get();

            if (!articleRes.data || articleRes.data.length === 0) {
                return {
                    code: -1,
                    message: '文章不存在',
                    data: null
                };
            }

            const articleData = articleRes.data[0];

            // 检查是否已存在阅读记录
            const existRes = await db.collection('readHistory')
                .where({
                    openid: openid,
                    articleId: articleId
                })
                .get();

            if (existRes.data.length > 0) {
                // 更新阅读时间和时长
                await db.collection('readHistory')
                    .where({
                        openid: openid,
                        articleId: articleId
                    })
                    .update({
                        readTime: Date.now(),
                        duration: duration || 0
                    });
            } else {
                // 添加阅读记录
                await db.collection('readHistory').add({
                    openid: openid,
                    articleId: articleId,
                    article: {
                        title: articleData.title,
                        sourceName: articleData.sourceName,
                        publishTime: articleData.publishTime
                    },
                    readTime: Date.now(),
                    duration: duration || 0
                });

                // 更新用户阅读计数
                await db.collection('users')
                    .where({ openid: openid })
                    .update({
                        'stats.readCount': db.command.inc(1)
                    });
            }

            console.log('阅读记录成功');
            return {
                code: 0,
                message: 'success',
                data: null
            };
        } catch (error) {
            console.error('记录阅读失败:', error);
            return {
                code: -1,
                message: '记录失败',
                data: null
            };
        }
    }
};

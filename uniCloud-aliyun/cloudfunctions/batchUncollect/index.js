'use strict';

const db = uniCloud.database();
const collection = db.collection('collections');

module.exports = {
    async main(event) {
        const { userId: openid, articleIds } = event;

        console.log('=== batchUncollect ===');
        console.log('openid:', openid, 'articleIds:', articleIds);

        try {
            if (!openid || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
                return {
                    code: -1,
                    message: '参数不完整',
                    data: null
                };
            }

            // 批量取消收藏
            const res = await collection
                .where({
                    openid: openid,
                    articleId: db.command.in(articleIds)
                })
                .remove();

            console.log('批量取消收藏结果:', res);

            // 批量减少文章收藏数
            await db.collection('articles')
                .where({ _id: db.command.in(articleIds) })
                .update({
                    'stats.collectCount': db.command.inc(-articleIds.length)
                });

            // 减少用户收藏计数
            await db.collection('users')
                .where({ openid: openid })
                .update({
                    'stats.collectCount': db.command.inc(-articleIds.length)
                });

            return {
                code: 0,
                message: '取消收藏成功',
                data: { deletedCount: res.deleted }
            };
        } catch (error) {
            console.error('批量取消收藏失败:', error);
            return {
                code: -1,
                message: '操作失败',
                data: null
            };
        }
    }
};

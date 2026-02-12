'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        // 注意：userId 是前端存储的 users 表 _id
        // 但其他表存储的是 openid（微信标识）
        const { userId, openid } = event;

        console.log('=== deleteUserAccount ===');
        console.log('userId (users表的_id):', userId);
        console.log('openid (微信标识):', openid);

        if (!openid) {
            return {
                code: -1,
                message: '参数不完整'
            };
        }

        try {
            // 删除用户的收藏记录
            await db.collection('collections').where({ openid }).remove();

            // 删除用户的阅读历史
            await db.collection('readHistory').where({ openid }).remove();

            // 删除用户的搜索历史
            await db.collection('searchHistory').where({ openid }).remove();

            // 删除用户的消息通知
            await db.collection('messages').where({ openid }).remove();

            // 删除用户表中的用户记录
            await db.collection('users').doc(userId).remove();

            console.log('账号注销成功');

            return {
                code: 0,
                message: '账号注销成功'
            };
        } catch (error) {
            console.error('注销账号失败:', error);
            return {
                code: -1,
                message: '注销失败: ' + error.message
            };
        }
    }
};

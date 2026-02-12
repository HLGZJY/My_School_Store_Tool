'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId } = event;

        console.log('=== deleteUserAccount ===');
        console.log('userId (users表的_id):', userId);

        if (!userId) {
            return {
                code: -1,
                message: '参数不完整'
            };
        }

        try {
            // 删除用户的收藏记录
            await db.collection('collections').where({ userId }).remove();

            // 删除用户的阅读历史
            await db.collection('readHistory').where({ userId }).remove();

            // 删除用户的搜索历史
            await db.collection('searchHistory').where({ userId }).remove();

            // 删除用户的消息通知
            await db.collection('messages').where({ userId }).remove();

            // 删除用户表中的用户记录（使用 _id 直接删除）
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

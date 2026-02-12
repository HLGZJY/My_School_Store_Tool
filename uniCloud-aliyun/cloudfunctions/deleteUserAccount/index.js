'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid } = event;

        console.log('=== deleteUserAccount ===');
        console.log('openid:', openid);

        if (!openid) {
            return {
                code: -1,
                message: '用户未登录'
            };
        }

        try {
            // 删除用户的收藏记录
            const collectionsRes = await db.collection('collections').where({ openid }).remove();
            console.log('删除收藏记录:', collectionsRes);

            // 删除用户的阅读历史
            const historyRes = await db.collection('readHistory').where({ openid }).remove();
            console.log('删除阅读历史:', historyRes);

            // 删除用户的搜索历史
            const searchRes = await db.collection('searchHistory').where({ openid }).remove();
            console.log('删除搜索历史:', searchRes);

            // 删除用户的消息通知
            const messagesRes = await db.collection('messages').where({ openid }).remove();
            console.log('删除消息通知:', messagesRes);

            // 删除用户的订阅记录
            const subsRes = await db.collection('subscriptions').where({ openid }).remove();
            console.log('删除订阅记录:', subsRes);

            // 删除用户表中的用户记录
            const userRes = await db.collection('users').where({ openid: openid }).get();
            console.log('查询用户记录:', userRes);
            if (userRes.data && userRes.data.length > 0) {
                const userDocId = userRes.data[0]._id;
                await db.collection('users').doc(userDocId).remove();
                console.log('删除用户记录成功, _id:', userDocId);
            } else {
                console.log('未找到用户记录');
            }

            console.log('账号注销成功');

            return {
                code: 0,
                message: '账号注销成功'
            };
        } catch (error) {
            console.error('注销账号失败:', error);
            return {
                code: -1,
                message: '注销失败，请重试'
            };
        }
    }
};

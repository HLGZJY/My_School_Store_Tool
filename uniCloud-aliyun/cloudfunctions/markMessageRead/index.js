'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid, messageId, all } = event;

        console.log('=== markMessageRead ===');
        console.log('openid:', openid, 'messageId:', messageId, 'all:', all);

        try {
            if (!openid) {
                return {
                    code: -1,
                    message: '参数不完整',
                    data: null
                };
            }

            if (all) {
                // 标记全部为已读
                await db.collection('messages')
                    .where({ openid: openid, isRead: false })
                    .update({
                        isRead: true
                    });

                console.log('全部标记为已读');
            } else if (messageId) {
                // 标记单条为已读
                await db.collection('messages')
                    .where({ _id: messageId, openid: openid })
                    .update({
                        isRead: true
                    });

                console.log('标记单条已读:', messageId);
            }

            return {
                code: 0,
                message: 'success',
                data: null
            };
        } catch (error) {
            console.error('标记已读失败:', error);
            return {
                code: -1,
                message: '操作失败',
                data: null
            };
        }
    }
};

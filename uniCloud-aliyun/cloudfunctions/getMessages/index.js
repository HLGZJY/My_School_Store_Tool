'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid, type = 'all', page = 1, pageSize = 20 } = event;

        console.log('=== getMessages ===');
        console.log('openid:', openid, 'type:', type, 'page:', page);

        try {
            // 方案A：直接使用 openid
            let query = { openid: openid };

            if (type === 'unread') {
                query.isRead = false;
            } else if (type === 'system') {
                query.type = 'system';
            }

            // 获取消息列表
            const res = await db.collection('messages')
                .where(query)
                .orderBy('createTime', 'desc')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .get();

            // 获取未读总数
            const unreadRes = await db.collection('messages')
                .where({ openid: openid, isRead: false })
                .count();

            console.log('获取消息数量:', res.data.length);

            return {
                code: 0,
                message: 'success',
                data: {
                    messages: res.data,
                    unreadCount: unreadRes.total || 0,
                    hasMore: (page - 1) * pageSize + pageSize < unreadRes.total
                }
            };
        } catch (error) {
            console.error('获取消息失败:', error);
            return {
                code: -1,
                message: '获取消息失败',
                data: {
                    messages: [],
                    unreadCount: 0,
                    hasMore: false
                }
            };
        }
    }
};

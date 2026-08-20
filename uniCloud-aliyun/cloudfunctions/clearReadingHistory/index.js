'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid } = event;

        console.log('=== clearReadingHistory ===');
        console.log('openid:', openid);

        try {
            if (!openid) {
                return {
                    code: -1,
                    message: '参数不完整',
                    data: null
                };
            }

            // 删除该用户的所有阅读历史
            const res = await db.collection('readHistory')
                .where({ openid: openid })
                .remove();

            // 重置用户的阅读计数
            await db.collection('users')
                .where({ openid: openid })
                .update({
                    'stats.readCount': 0
                });

            console.log('清空阅读历史成功:', res.deleted);

            return {
                code: 0,
                message: '清空成功',
                data: { deletedCount: res.deleted }
            };
        } catch (error) {
            console.error('清空阅读历史失败:', error);
            return {
                code: -1,
                message: '清空失败',
                data: null
            };
        }
    }
};

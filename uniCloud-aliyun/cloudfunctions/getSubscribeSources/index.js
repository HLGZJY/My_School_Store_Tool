'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid } = event;

        console.log('=== getSubscribeSources ===');
        console.log('openid:', openid);

        try {
            // 获取订阅的数据源
            const userRes = await db.collection('users')
                .where({ openid: openid })
                .get();

            if (!userRes.data || userRes.data.length === 0) {
                return {
                    code: -1,
                    message: '用户不存在',
                    data: { sources: [] }
                };
            }

            const subscribeSources = userRes.data[0].subscribeSources || [];

            // 获取这些数据源的详细信息
            if (subscribeSources.length === 0) {
                return {
                    code: 0,
                    message: 'success',
                    data: { sources: [] }
                };
            }

            const sourcesRes = await db.collection('sources')
                .where({ _id: db.command.in(subscribeSources) })
                .get();

            return {
                code: 0,
                message: 'success',
                data: { sources: sourcesRes.data }
            };
        } catch (error) {
            console.error('获取订阅数据源失败:', error);
            return {
                code: -1,
                message: '获取失败',
                data: { sources: [] }
            };
        }
    }
};

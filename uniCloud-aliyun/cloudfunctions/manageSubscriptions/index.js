'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event, context) {
        const openid = context.OPENID;
        const { action, data } = event;

        console.log('=== manageSubscriptions 云函数 ===');
        console.log('action:', action, 'openid:', openid);

        try {
            // action: get - 获取用户所有订阅
            if (action === 'get') {
                if (!openid) {
                    return { code: 401, message: '未登录' };
                }

                const res = await db.collection('subscriptions')
                    .where({ openid })
                    .get();

                return {
                    code: 0,
                    data: res.data || []
                };
            }

            // action: add - 添加订阅
            if (action === 'add') {
                if (!openid) {
                    return { code: 401, message: '未登录' };
                }

                const { sourceId, sourceName } = data;
                if (!sourceId) {
                    return { code: 400, message: 'sourceId不能为空' };
                }

                // 检查是否已订阅
                const exist = await db.collection('subscriptions')
                    .where({ openid, sourceId })
                    .get();

                if (exist.data && exist.data.length > 0) {
                    return { code: 400, message: '已订阅' };
                }

                // 添加订阅
                const now = Date.now();
                const result = await db.collection('subscriptions').add({
                    openid,
                    sourceId,
                    sourceName: sourceName || '',
                    subscribeTime: now,
                    createTime: now,
                    updateTime: now
                });

                return {
                    code: 0,
                    message: '订阅成功',
                    data: { id: result.id }
                };
            }

            // action: remove - 取消订阅
            if (action === 'remove') {
                if (!openid) {
                    return { code: 401, message: '未登录' };
                }

                const { sourceId } = data;
                if (!sourceId) {
                    return { code: 400, message: 'sourceId不能为空' };
                }

                // 删除订阅
                await db.collection('subscriptions')
                    .where({ openid, sourceId })
                    .remove();

                return {
                    code: 0,
                    message: '取消订阅成功'
                };
            }

            // action: list - 获取所有可用数据源（供订阅选择）
            if (action === 'list') {
                const sources = await db.collection('sources')
                    .where({ enabled: true })
                    .get();

                return {
                    code: 0,
                    data: (sources.data || []).map(s => ({
                        id: s.sourceId,
                        name: s.sourceName,
                        type: s.sourceType || 'website'
                    }))
                };
            }

            return { code: 400, message: '无效的操作' };

        } catch (error) {
            console.error('订阅管理失败:', error);
            return {
                code: 500,
                message: error.message || '系统错误'
            };
        }
    }
};

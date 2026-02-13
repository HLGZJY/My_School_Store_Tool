'use strict';

const db = uniCloud.database();

/**
 * 验证管理员权限
 */
async function verifyAdmin(openid) {
    const admin = await db.collection('admins')
        .where({ openid, status: 'active' })
        .get();

    if (!admin.data.length) {
        throw new Error('无管理员权限');
    }

    const permissions = admin.data[0].permissions || [];
    if (!permissions.includes('sources') && !permissions.includes('all')) {
        throw new Error('无数据源管理权限');
    }

    return admin.data[0];
}

exports.main = async (event, context) => {
    const openid = context.OPENID;
    const { action, ...data } = event;

    try {
        if (!openid) {
            return { code: 401, message: '未登录' };
        }

        // 验证管理员
        await verifyAdmin(openid);

        switch (action) {
            case 'list': {
                const sources = await db.collection('sources').get();
                return {
                    code: 0,
                    data: sources.data || []
                };
            }

            case 'create': {
                const { name, type, config, schedule, defaultTags } = data;

                if (!name || !type) {
                    return { code: 400, message: '参数不完整' };
                }

                const now = Date.now();
                const result = await db.collection('sources').add({
                    name,
                    type,
                    enabled: true,
                    config: config || {},
                    schedule: {
                        interval: schedule?.interval || 3600000,
                        lastRunTime: null
                    },
                    defaultTags: defaultTags || {
                        source: [],
                        role: ['通用'],
                        custom: []
                    },
                    stats: {
                        totalArticles: 0,
                        lastFetchCount: 0
                    },
                    createTime: now,
                    updateTime: now
                });

                return {
                    code: 0,
                    message: '创建成功',
                    data: { id: result.id }
                };
            }

            case 'update': {
                const { sourceId, ...updateData } = data;

                if (!sourceId) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                // 过滤允许更新的字段
                const allowedFields = ['name', 'type', 'enabled', 'config', 'schedule', 'defaultTags'];
                const filteredData = {};
                for (const key of allowedFields) {
                    if (updateData[key] !== undefined) {
                        filteredData[key] = updateData[key];
                    }
                }
                filteredData.updateTime = Date.now();

                await db.collection('sources').doc(sourceId).update(filteredData);

                return {
                    code: 0,
                    message: '更新成功'
                };
            }

            case 'delete': {
                const { sourceId } = data;

                if (!sourceId) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                await db.collection('sources').doc(sourceId).remove();

                return {
                    code: 0,
                    message: '删除成功'
                };
            }

            default:
                return { code: 400, message: '无效的操作' };
        }

    } catch (error) {
        console.error('数据源管理失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

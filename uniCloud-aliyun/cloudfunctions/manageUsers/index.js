'use strict';

const db = uniCloud.database();
const dbCmd = db.command;

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
    if (!permissions.includes('users') && !permissions.includes('all')) {
        throw new Error('无用户管理权限');
    }

    return admin.data[0];
}

exports.main = async (event, context) => {
    const openid = context.OPENID;
    const { action, keyword, page = 1, pageSize = 20 } = event;

    try {
        if (!openid) {
            return { code: 401, message: '未登录' };
        }

        // 验证管理员
        await verifyAdmin(openid);

        switch (action) {
            case 'list': {
                let query = db.collection('users');

                // 关键字搜索
                if (keyword) {
                    query = query.where(
                        dbCmd.or({
                            nickname: new RegExp(keyword, 'i')
                        }, {
                            openid: new RegExp(keyword, 'i')
                        })
                    );
                }

                // 分页
                const skip = (page - 1) * pageSize;
                const result = await query
                    .skip(skip)
                    .limit(pageSize)
                    .orderBy('createTime', 'desc')
                    .get();

                // 获取总数
                const countResult = await query.count();

                return {
                    code: 0,
                    data: {
                        list: result.data || [],
                        total: countResult.total,
                        page,
                        pageSize
                    }
                };
            }

            case 'detail': {
                const { userId } = event;

                if (!userId) {
                    return { code: 400, message: '缺少用户ID' };
                }

                const user = await db.collection('users').doc(userId).get();

                if (!user.data) {
                    return { code: 404, message: '用户不存在' };
                }

                return {
                    code: 0,
                    data: user.data
                };
            }

            case 'delete': {
                const { userId } = event;

                if (!userId) {
                    return { code: 400, message: '缺少用户ID' };
                }

                await db.collection('users').doc(userId).remove();

                // 同时删除相关数据
                await db.collection('collections').where({ openid: userId }).remove();
                await db.collection('readHistory').where({ openid: userId }).remove();
                await db.collection('searchHistory').where({ openid: userId }).remove();

                return {
                    code: 0,
                    message: '删除成功'
                };
            }

            default:
                return { code: 400, message: '无效的操作' };
        }

    } catch (error) {
        console.error('用户管理失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

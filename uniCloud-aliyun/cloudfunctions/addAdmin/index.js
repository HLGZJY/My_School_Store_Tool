'use strict';

const db = uniCloud.database();

/**
 * 临时添加管理员接口（测试用）
 * 正式环境应删除此接口
 */
exports.main = async (event, context) => {
    const { openid, nickname, permissions } = event;

    // 简单的密钥验证，生产环境应删除
    const SECRET_KEY = 'test_admin_key_2024';
    if (event.secret !== SECRET_KEY) {
        return {
            code: 403,
            message: '密钥错误'
        };
    }

    if (!openid) {
        return {
            code: 400,
            message: '缺少openid参数'
        };
    }

    try {
        // 检查是否已存在
        const existing = await db.collection('admins')
            .where({ openid })
            .get();

        if (existing.data.length > 0) {
            // 更新
            await db.collection('admins').doc(existing.data[0]._id).update({
                nickname: nickname || existing.data[0].nickname,
                permissions: permissions || existing.data[0].permissions,
                updateTime: Date.now()
            });

            return {
                code: 0,
                message: '管理员更新成功'
            };
        } else {
            // 创建
            const adminId = 'admin_' + openid.substring(0, 8);
            await db.collection('admins').add({
                _id: adminId,
                openid,
                nickname: nickname || '测试管理员',
                avatar: '',
                permissions: permissions || ['sync', 'approve', 'users', 'sources', 'all'],
                status: 'active',
                createTime: Date.now(),
                updateTime: Date.now()
            });

            return {
                code: 0,
                message: '管理员添加成功',
                data: { adminId }
            };
        }

    } catch (error) {
        return {
            code: 500,
            message: error.message
        };
    }
};

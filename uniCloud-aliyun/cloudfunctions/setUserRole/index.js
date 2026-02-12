/**
 * 设置用户角色云函数
 * 功能：保存用户选择的角色和详细信息
 */

'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
    const { userId:openid, role, roleDetail } = event;

    try {
        // 1. 校验参数
        if (!userId) {
            return {
                code: 1001,
                message: '参数错误：缺少userId'
            };
        }

        if (!role) {
            return {
                code: 1002,
                message: '参数错误：缺少role'
            };
        }

        // 2. 验证角色值
        const validRoles = ['student', 'teacher', 'admin'];
        if (!validRoles.includes(role)) {
            return {
                code: 1003,
                message: '参数错误：无效的角色值'
            };
        }

        // 3. 更新用户角色
        const updateData = {
            role: role,
            roleDetail: roleDetail || {},
            updateTime: Date.now()
        };

        await db.collection('users').doc(userId).update(updateData);

        // 4. 记录操作日志
        await db.collection('operation_logs').add({
            userId,
            action: 'set_role',
            target: 'user',
            detail: {
                role: role,
                roleDetail: roleDetail
            },
            createTime: Date.now()
        });

        console.log('用户角色设置成功:', userId, role);

        return {
            code: 0,
            message: '角色设置成功',
            data: {
                userId,
                role,
                roleDetail
            }
        };

    } catch (error) {
        console.error('设置角色失败:', error);
        return {
            code: 1000,
            message: '系统错误: ' + error.message
        };
    }
};

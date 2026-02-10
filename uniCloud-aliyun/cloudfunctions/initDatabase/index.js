/**
 * 数据库初始化云函数
 * 功能：初始化登录功能所需的集合和索引
 *
 * 注意：
 * 1. users 和 operation_logs 集合会在首次登录时自动创建
 * 2. 索引需要在云数据库控制台手动创建
 * 3. 本云函数主要用于验证和预创建集合
 */

'use strict';

exports.main = async (event, context) => {
    const db = uniCloud.database();
    const $ = db.command.aggregate;

    try {
        // 1. 检查并初始化 users 集合
        const usersCheck = await db.collection('users').limit(1).get();
        console.log('users 集合状态:', usersCheck.data.length > 0 ? '已存在' : '新创建');

        // 2. 检查并初始化 operation_logs 集合
        const logsCheck = await db.collection('operation_logs').limit(1).get();
        console.log('operation_logs 集合状态:', logsCheck.data.length > 0 ? '已存在' : '新创建');

        // 3. 初始化系统配置（用于登录功能）
        const configCheck = await db.collection('system_config').where({
            key: db.command.in(['login_token_expire', 'login_max_retry_count'])
        }).get();

        if (configCheck.data.length === 0) {
            // 添加登录相关配置
            await db.collection('system_config').add([
                {
                    key: 'login_token_expire',
                    value: 604800000, // 7天 = 7 * 24 * 60 * 60 * 1000
                    description: '登录令牌有效期（毫秒），默认7天',
                    updateTime: Date.now()
                },
                {
                    key: 'login_max_retry_count',
                    value: 5,
                    description: '登录最大重试次数',
                    updateTime: Date.now()
                }
            ]);
            console.log('登录系统配置初始化完成');
        } else {
            console.log('登录系统配置已存在');
        }

        // 4. 返回初始化结果
        return {
            code: 0,
            message: '数据库初始化成功',
            data: {
                users: 'ready',
                operation_logs: 'ready',
                system_config: 'ready'
            }
        };

    } catch (error) {
        console.error('数据库初始化失败:', error);
        return {
            code: 1000,
            message: '系统错误',
            error: error.message
        };
    }
};

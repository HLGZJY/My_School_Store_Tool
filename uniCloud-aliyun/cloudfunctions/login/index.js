/**
 * 微信登录云函数
 * 功能：获取用户OpenID，创建或更新用户信息
 *
 * 注意：个人备案小程序仅支持微信登录，不支持手机号、邮箱等方式
 * 注意：正式环境中 openid 通过 context.OPENID 自动获取
 * 注意：本地调试时使用 code2Session API 换取 openid
 */

'use strict';

const db = uniCloud.database();

// 微信小程序配置
const WX_APPID = 'wx21bdaa579562ec11';
const WX_APPSECRET = '1efd7d7a175d83ec611cac4758db9f51';

/**
 * 调用微信接口获取 openid（小程序登录）
 * @param {string} code - 微信登录 code
 * @returns {Promise<string>} openid
 */
async function getOpenidByCode(code) {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_APPSECRET}&js_code=${code}&grant_type=authorization_code`;

    const res = await uniCloud.httpclient.request(url, {
        method: 'GET',
        dataType: 'json'
    });

    if (res.status === 200 && res.data && res.data.openid) {
        return res.data.openid;
    } else {
        throw new Error(res.data?.errmsg || '获取openid失败');
    }
}

/**
 * 查询用户信息（只查询，不创建）
 * @param {string} openid - 微信 openid
 */
async function queryUser(openid) {
    const userQuery = await db.collection('users')
        .where({ openid })
        .get();

    if (userQuery.data && userQuery.data.length > 0) {
        const userData = userQuery.data[0];
        return {
            exists: true,
            user: {
                userId: userData._id,
                openid: userData.openid,
                hasRole: !!userData.role,
                userInfo: {
                    _id: userData._id,
                    nickname: userData.nickname,
                    avatar: userData.avatar,
                    role: userData.role
                }
            }
        };
    }
    return { exists: false };
}

/**
 * 查询管理员信息
 * @param {string} openid - 微信 openid
 */
async function queryAdmin(openid) {
    const adminQuery = await db.collection('admins')
        .where({ openid, status: 'active' })
        .get();

    if (adminQuery.data && adminQuery.data.length > 0) {
        const adminData = adminQuery.data[0];
        return {
            exists: true,
            admin: {
                adminId: adminData._id,
                openid: adminData.openid,
                permissions: adminData.permissions || [],
                nickname: adminData.nickname,
                avatar: adminData.avatar
            }
        };
    }
    return { exists: false };
}

exports.main = async (event, context) => {
    const { code, userInfo } = event;

    try {
        // 1. 校验参数
        if (!code) {
            return {
                code: 1001,
                message: '参数错误：缺少code'
            };
        }

        // 2. 获取 openid
        // 优先使用 context.OPENID（正式环境自动注入）
        let openid = context.OPENID;

        // 如果 context.OPENID 为空，使用 code 换取（本地调试或特殊场景）
        if (!openid) {
            console.log('context.OPENID 为空，尝试通过 code 换取...');
            openid = await getOpenidByCode(code);
        }

        console.log('用户openid:', openid);

        // 校验 openid
        if (!openid) {
            return {
                code: 2001,
                message: '微信登录失败，无法获取用户标识'
            };
        }

        // 3. 只查询模式（userInfo 为 null 或 undefined）
        // 用于自动登录检测，不创建新用户
        if (!userInfo) {
            // 同时查询用户表和管理员表
            const queryResult = await queryUser(openid);
            const adminResult = await queryAdmin(openid);

            // 决定返回什么
            const isInUsers = queryResult.exists;
            const isInAdmins = adminResult.exists;
            const needSelect = isInUsers && isInAdmins;

            if (!isInUsers && !isInAdmins) {
                // 两者都不存在，需要前端提供用户信息
                return {
                    code: 1002,
                    message: '用户不存在',
                    data: { needsUserInfo: true }
                };
            }

            // 生成 token
            const token = Buffer.from(JSON.stringify({
                userId: isInUsers ? queryResult.user.userId : adminResult.admin.adminId,
                openid,
                type: needSelect ? null : (isInAdmins ? 'admin' : 'user'),
                exp: Date.now() + 7 * 24 * 60 * 60 * 1000
            })).toString('base64');

            // 如果需要选择入口
            if (needSelect) {
                return {
                    code: 0,
                    message: '需要选择入口',
                    data: {
                        needSelect: true,
                        isInUsers: true,
                        isInAdmins: true,
                        userInfo: queryResult.user,
                        adminInfo: adminResult.admin,
                        token,
                        isNewUser: false
                    }
                };
            }

            // 只在一个表中存在，直接返回
            if (isInAdmins) {
                return {
                    code: 0,
                    message: '管理员登录成功',
                    data: {
                        ...adminResult.admin,
                        token,
                        isNewUser: false,
                        entryType: 'admin'
                    }
                };
            }

            return {
                code: 0,
                message: '获取成功',
                data: {
                    ...queryResult.user,
                    token,
                    isNewUser: false,
                    entryType: 'user'
                }
            };
        }

        // 4. 查询用户是否已存在
        const userQuery = await db.collection('users')
            .where({ openid })
            .get();

        // 同时查询管理员表
        const adminQuery = await db.collection('admins')
            .where({ openid, status: 'active' })
            .get();

        const isInUsers = userQuery.data.length > 0;
        const isInAdmins = adminQuery.data.length > 0;
        const needSelect = isInUsers && isInAdmins;

        let userId;
        let isNewUser = false;

        if (!isInUsers) {
            // 5. 新用户：创建用户记录，使用 openid 作为 _id
            await db.collection('users').doc(openid).set({
                openid,
                nickname: userInfo?.nickName || '微信用户',
                avatar: userInfo?.avatarUrl || '',
                role: null,  // 还未选择角色
                roleDetail: {},
                settings: {
                    fontSize: 'medium',
                    darkMode: false
                },
                stats: {
                    readCount: 0,
                    collectCount: 0,
                    searchCount: 0
                },
                subscribeSources: [],
                createTime: Date.now(),
                updateTime: Date.now(),
                lastLoginTime: Date.now()
            });

            userId = openid;  // _id 就是 openid
            isNewUser = true;
            console.log('新用户创建成功:', userId);
        } else {
            // 6. 老用户：更新登录信息
            const existingUser = userQuery.data[0];
            userId = existingUser._id;  // 保持 _id 不变

            // 确保 stats 字段存在
            const updateData = {
                nickname: userInfo?.nickName || existingUser.nickname,
                avatar: userInfo?.avatarUrl || existingUser.avatar,
                lastLoginTime: Date.now(),
                updateTime: Date.now()
            };

            if (!existingUser.stats) {
                updateData.stats = {
                    readCount: 0,
                    collectCount: 0,
                    searchCount: 0
                };
            }

            await db.collection('users').doc(userId).update(updateData);
            console.log('老用户登录更新时间:', userId);
        }

        // 如果同时是管理员，更新管理员登录时间
        if (isInAdmins) {
            await db.collection('admins').doc(adminQuery.data[0]._id).update({
                lastLoginTime: Date.now(),
                updateTime: Date.now()
            });
        }

        // 7. 生成简单的访问令牌（实际项目中可使用JWT）
        const token = Buffer.from(JSON.stringify({
            userId,
            openid,
            type: needSelect ? null : (isInAdmins ? 'admin' : 'user'),
            exp: Date.now() + 7 * 24 * 60 * 60 * 1000  // 7天过期
        })).toString('base64');

        // 8. 记录登录日志
        await db.collection('operation_logs').add({
            userId,
            action: 'login',
            target: 'user',
            createTime: Date.now()
        });

        // 9. 获取完整的用户信息
        const userData = await db.collection('users').doc(userId).get();

        // 需要选择入口
        if (needSelect) {
            return {
                code: 0,
                message: '需要选择入口',
                data: {
                    needSelect: true,
                    isInUsers: true,
                    isInAdmins: true,
                    userInfo: {
                        _id: userData.data._id,
                        nickname: userData.data.nickname,
                        avatar: userData.data.avatar,
                        role: userData.data.role
                    },
                    adminInfo: {
                        adminId: adminQuery.data[0]._id,
                        openid: adminQuery.data[0].openid,
                        permissions: adminQuery.data[0].permissions || [],
                        nickname: adminQuery.data[0].nickname,
                        avatar: adminQuery.data[0].avatar
                    },
                    token,
                    isNewUser
                }
            };
        }

        // 10. 返回登录结果
        if (isInAdmins) {
            return {
                code: 0,
                message: '管理员登录成功',
                data: {
                    adminId: adminQuery.data[0]._id,
                    openid,
                    token,
                    isNewUser,
                    entryType: 'admin',
                    adminInfo: {
                        permissions: adminQuery.data[0].permissions || [],
                        nickname: adminQuery.data[0].nickname,
                        avatar: adminQuery.data[0].avatar
                    }
                }
            };
        }

        return {
            code: 0,
            message: '登录成功',
            data: {
                userId,
                openid,
                token,
                isNewUser,
                entryType: 'user',
                hasRole: !!userData.data.role,
                userInfo: {
                    _id: userData.data._id,
                    nickname: userData.data.nickname,
                    avatar: userData.data.avatar,
                    role: userData.data.role
                }
            }
        };

    } catch (error) {
        console.error('登录失败:', error);
        return {
            code: 1000,
            message: '系统错误: ' + error.message
        };
    }
};

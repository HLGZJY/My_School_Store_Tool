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

        // 3. 恢复模式查询（不需要 openid）
        if (code === 'restore' && event.userId) {
            const userQuery = await db.collection('users')
                .doc(event.userId)
                .get();

            if (userQuery.data) {
                return {
                    code: 0,
                    message: '获取成功',
                    data: {
                        userId: userQuery.data._id,
                        openid: userQuery.data.openid,
                        hasRole: !!userQuery.data.role,
                        userInfo: {
                            _id: userQuery.data._id,
                            nickname: userQuery.data.nickname,
                            avatar: userQuery.data.avatar,
                            role: userQuery.data.role
                        }
                    }
                };
            } else {
                return {
                    code: 1002,
                    message: '用户不存在'
                };
            }
        }

        // 4. 查询用户是否已存在
        const userQuery = await db.collection('users')
            .where({ openid })
            .get();

        let userId;
        let isNewUser = false;

        if (userQuery.data.length === 0) {
            // 5. 新用户：创建用户记录
            const addResult = await db.collection('users').add({
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

            userId = addResult.id;
            isNewUser = true;
            console.log('新用户创建成功:', userId);
        } else {
            // 6. 老用户：更新登录信息
            const existingUser = userQuery.data[0];
            userId = existingUser._id;

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

        // 7. 生成简单的访问令牌（实际项目中可使用JWT）
        const token = Buffer.from(JSON.stringify({
            userId,
            openid,
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

        return {
            code: 0,
            message: '登录成功',
            data: {
                userId,
                openid,
                token,
                isNewUser,
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

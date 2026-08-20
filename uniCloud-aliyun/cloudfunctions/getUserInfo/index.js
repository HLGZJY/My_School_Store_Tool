'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { userId: openid } = event;

        console.log('=== getUserInfo ===');
        console.log('openid:', openid);

        try {
            // 直接使用 openid 查询
            const res = await db.collection('users')
                .where({ openid: openid })
                .get();

            if (!res.data || res.data.length === 0) {
                return {
                    code: -1,
                    message: '用户不存在',
                    data: null
                };
            }

            const userData = res.data[0];

            console.log('用户信息获取成功:', userData._id);

            return {
                code: 0,
                message: 'success',
                data: {
                    _id: userData._id,
                    openid: userData.openid,
                    nickname: userData.nickname,
                    avatar: userData.avatar,
                    role: userData.role,
                    roleDetail: userData.roleDetail,
                    settings: userData.settings,
                    createTime: userData.createTime,
                    lastLoginTime: userData.lastLoginTime
                }
            };
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return {
                code: -1,
                message: '获取用户信息失败',
                data: null
            };
        }
    }
};

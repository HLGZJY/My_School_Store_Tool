'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { keyword, resultCount, userId: openid } = event;

        console.log('=== reportSearch ===');
        console.log('openid:', openid, 'keyword:', keyword, 'resultCount:', resultCount);

        try {
            if (!keyword) {
                return {
                    code: -1,
                    message: '关键词不能为空',
                    data: null
                };
            }

            // 保存搜索历史到数据库
            await db.collection('searchHistory').add({
                openid: openid || 'anonymous',
                keyword: keyword,
                resultCount: resultCount || 0,
                searchTime: Date.now()
            });

            // 更新用户搜索计数
            if (openid) {
                await db.collection('users')
                    .where({ openid: openid })
                    .update({
                        'stats.searchCount': db.command.inc(1)
                    });
            }

            console.log('搜索记录成功');
            return {
                code: 0,
                message: 'success',
                data: null
            };
        } catch (error) {
            console.error('记录搜索失败:', error);
            return {
                code: -1,
                message: '记录失败',
                data: null
            };
        }
    }
};

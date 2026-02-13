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

    return admin.data[0];
}

/**
 * 获取统计数据
 */
async function getStats(openid) {
    // 验证管理员
    await verifyAdmin(openid);

    // 获取文章总数
    const articlesCount = await db.collection('articles').count();

    // 获取今日新增文章数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayArticles = await db.collection('articles')
        .where({
            createTime: db.command.gte(todayStart.getTime())
        })
        .count();

    // 获取待审核文章数
    const pendingReview = await db.collection('articles')
        .where({ status: 'pending' })
        .count();

    // 获取数据源数量
    const sourcesCount = await db.collection('sources').count();

    return {
        totalArticles: articlesCount.total,
        todayArticles: todayArticles.total,
        pendingReview: pendingReview.total,
        sources: sourcesCount.total
    };
}

exports.main = async (event, context) => {
    const openid = context.OPENID;

    try {
        if (!openid) {
            return {
                code: 401,
                message: '未登录'
            };
        }

        const stats = await getStats(openid);

        return {
            code: 0,
            message: '获取成功',
            data: stats
        };

    } catch (error) {
        console.error('获取统计数据失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

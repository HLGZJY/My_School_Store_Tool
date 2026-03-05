'use strict';

const db = uniCloud.database();

/**
 * 验证管理员权限
 */
async function verifyAdmin(openid) {
    console.log('[approveArticle] 验证管理员, openid:', openid);

    const admin = await db.collection('admins')
        .where({ openid, status: 'active' })
        .get();

    console.log('[approveArticle] 管理员查询结果:', admin.data.length);

    if (!admin.data.length) {
        throw new Error('无管理员权限');
    }

    const permissions = admin.data[0].permissions || [];
    console.log('[approveArticle] 权限列表:', permissions);

    // 有 all 权限，或者有 approve 权限
    if (permissions.includes('all') || permissions.includes('approve')) {
        return admin.data[0];
    }

    throw new Error('无审核权限');
}

exports.main = async (event, context) => {
    // 优先使用前端传入的 openid，fallback 到 context.OPENID
    const paramOpenid = event.openid;
    const openid = paramOpenid || context.OPENID;
    const { articleId, action, note } = event;

    try {
        if (!openid) {
            return { code: 401, message: '未登录' };
        }

        if (!articleId || !action) {
            return { code: 400, message: '参数错误' };
        }

        // 验证管理员
        await verifyAdmin(openid);

        // 获取文章
        const article = await db.collection('articles').doc(articleId).get();

        if (!article.data) {
            return { code: 404, message: '文章不存在' };
        }

        // 执行审核操作
        let updateData = {
            updatedAt: Date.now()
        };

        if (action === 'approve') {
            updateData.status = 'published';
            updateData.reviewNote = note || '审核通过';
        } else if (action === 'reject') {
            updateData.status = 'rejected';
            updateData.reviewNote = note || '审核拒绝';
        } else {
            return { code: 400, message: '无效的操作' };
        }

        await db.collection('articles').doc(articleId).update(updateData);

        // 记录操作日志
        await db.collection('operation_logs').add({
            userId: openid,
            action: 'approve',
            target: 'article',
            targetId: articleId,
            result: { action, note },
            createTime: Date.now()
        });

        return {
            code: 0,
            message: action === 'approve' ? '审核通过' : '已拒绝'
        };

    } catch (error) {
        console.error('审核失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

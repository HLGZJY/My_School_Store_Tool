'use strict';

const db = uniCloud.database();

/**
 * 验证管理员权限
 */
async function verifyAdmin(openid) {
    console.log('[manageArticle] verifyAdmin 开始查询, openid:', openid);
    const admin = await db.collection('admins')
        .where({ openid, status: 'active' })
        .get();
    console.log('[manageArticle] 查询到', admin.data.length, '条管理员记录');
    if (!admin.data.length) {
        console.log('[manageArticle] 未找到管理员记录');
        throw new Error('无管理员权限');
    }
    return admin.data[0];
}

module.exports = {
    async main(event) {
        const { action, articleId, articleIds, title, summary, category } = event;
        const openid = event.openid;

        console.log('[manageArticle] 入参:', JSON.stringify({ action, articleId, articleIds, openid, title, summary, category }));

        try {
            // 验证管理员权限
            if (action === 'batchDelete' || action === 'delete' || action === 'update') {
                console.log('[manageArticle] 需要权限验证, openid:', openid);
                if (!openid) {
                    console.log('[manageArticle] openid 为空，返回未登录');
                    return { code: 401, message: '未登录' };
                }
                await verifyAdmin(openid);
                console.log('[manageArticle] 权限验证通过');
            }

            // 批量删除
            if (action === 'batchDelete') {
                if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
                    return { code: 400, message: '请选择要删除的文章' };
                }

                let successCount = 0;
                for (const id of articleIds) {
                    try {
                        await db.collection('articles').doc(id).remove();
                        successCount++;
                    } catch (e) {
                        console.error('[batchDelete] 删除失败:', id, e);
                    }
                }

                return { code: 0, message: `成功删除 ${successCount} 篇文章` };
            }

            // 删除文章
            if (action === 'delete') {
                if (!articleId) {
                    return { code: 400, message: 'articleId 不能为空' };
                }

                await db.collection('articles').doc(articleId).remove();
                return { code: 0, message: '删除成功' };
            }

            // 更新文章
            if (action === 'update') {
                if (!articleId) {
                    return { code: 400, message: 'articleId 不能为空' };
                }

                const updateData = {};
                if (title !== undefined) updateData.title = title;
                if (summary !== undefined) updateData.summary = summary;
                if (category !== undefined) updateData.category = category;
                updateData.updateTime = Date.now();

                await db.collection('articles').doc(articleId).update(updateData);
                return { code: 0, message: '更新成功' };
            }

            return { code: 400, message: '未知操作' };
        } catch (e) {
            console.error('[manageArticle] 操作失败:', e);
            if (e.message === '无管理员权限') {
                return { code: 401, message: '无管理员权限' };
            }
            return { code: 500, message: e.message || '操作失败' };
        }
    }
};

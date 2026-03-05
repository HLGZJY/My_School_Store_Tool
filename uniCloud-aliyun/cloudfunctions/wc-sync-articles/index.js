'use strict';

const db = uniCloud.database();

/**
 * 从 wc-download-article 获取文章内容
 */
async function downloadArticle(url) {
    try {
        const res = await uniCloud.callFunction({
            name: 'wc-download-article',
            data: { url, format: 'json' }
        });
        return res.result;
    } catch (e) {
        console.error('下载文章失败:', url, e);
        return null;
    }
}

/**
 * 保存文章到数据库
 */
async function saveArticle(article, source) {
    const now = Date.now();

    // 检查是否已存在
    const existing = await db.collection('articles')
        .where({ originalUrl: article.link })
        .get();

    const articleData = {
        title: article.title,
        content: article.content || article.text || '',
        plainText: (article.content || article.text || '').replace(/<[^>]+>/g, ''),
        summary: article.digest || '',
        sourceId: source.sourceId || source.fakeid,
        sourceName: source.name,
        category: source.category || 'notice',
        originalUrl: article.link,
        publishTime: article.publish_time * 1000 || now,
        status: 'published',
        createdAt: now,
        updatedAt: now,
        stats: {
            viewCount: 0,
            collectCount: 0
        },
        tags: {
            role: ['通用'],
            source: [source.name]
        }
    };

    if (existing.data.length > 0) {
        // 更新
        await db.collection('articles').doc(existing.data[0]._id).update({
            ...articleData,
            updatedAt: now
        });
        return { action: 'update', id: existing.data[0]._id };
    } else {
        // 新增
        const result = await db.collection('articles').add(articleData);
        return { action: 'create', id: result.id };
    }
}

exports.main = async (event, context) => {
    const { authKey, fakeid, name, category = 'notice', syncAll = false } = event;

    // 验证管理员权限
    const admin = await db.collection('admins')
        .where({ openid: context.OPENID, status: 'active' })
        .get();

    if (!admin.data.length) {
        return { code: 403, message: '无管理员权限' };
    }

    const permissions = admin.data[0].permissions || [];
    if (!permissions.includes('sync') && !permissions.includes('all')) {
        return { code: 403, message: '无数据采集权限' };
    }

    if (!fakeid || !name) {
        return { code: 400, message: 'fakeid 和 name 不能为空' };
    }

    try {
        // 获取文章列表
        const listRes = await uniCloud.callFunction({
            name: 'wc-article-list',
            data: { authKey, fakeid, begin: 0, size: 20 }
        });

        if (listRes.result.code !== 0) {
            return { code: -1, message: listRes.result.message || '获取文章列表失败' };
        }

        const articles = listRes.result.data.list || [];
        const source = { fakeid, name, sourceId: fakeid, category };

        let created = 0;
        let updated = 0;
        let failed = 0;

        for (const article of articles) {
            // 如果不是全量同步，跳过已发布过的
            if (!syncAll && article.link) {
                const existing = await db.collection('articles')
                    .where({ originalUrl: article.link })
                    .get();
                if (existing.data.length > 0) {
                    continue;
                }
            }

            // 获取文章内容
            const downloadRes = await downloadArticle(article.link);
            if (downloadRes && downloadRes.code === 0) {
                const fullArticle = { ...article, ...downloadRes.data };
                const result = await saveArticle(fullArticle, source);
                if (result.action === 'create') created++;
                else updated++;
            } else {
                failed++;
            }
        }

        // 记录操作日志
        await db.collection('operation_logs').add({
            userId: context.OPENID,
            action: 'wc_sync',
            target: 'wechat',
            result: { fakeid, name, created, updated, failed },
            createTime: Date.now()
        });

        return {
            code: 0,
            data: {
                message: `同步完成：新增 ${created}，更新 ${updated}，失败 ${failed}`,
                created,
                updated,
                failed
            }
        };
    } catch (error) {
        console.error('同步失败:', error);
        return { code: 500, message: error.message || '系统错误' };
    }
};

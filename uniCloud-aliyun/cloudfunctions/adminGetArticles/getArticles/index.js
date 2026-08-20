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

exports.main = async (event, context) => {
    const openid = context.OPENID;
    const { where = {}, page = 1, pageSize = 20 } = event;

    try {
        if (!openid) {
            return { code: 401, message: '未登录' };
        }

        // 验证管理员
        await verifyAdmin(openid);

        // 构建查询
        let query = db.collection('articles');

        // 处理查询条件
        if (where.status) {
            query = query.where({ status: where.status });
        }
        if (where.category) {
            query = query.where({ category: where.category });
        }
        if (where.sourceId) {
            query = query.where({ sourceId: where.sourceId });
        }

        // 分页
        const skip = (page - 1) * pageSize;
        const result = await query
            .skip(skip)
            .limit(pageSize)
            .orderBy('createTime', 'desc')
            .get();

        // 获取总数
        const countResult = await query.count();

        return {
            code: 0,
            data: {
                list: result.data || [],
                total: countResult.total,
                page,
                pageSize
            }
        };

    } catch (error) {
        console.error('获取文章失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

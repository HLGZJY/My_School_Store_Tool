'use strict';

const db = uniCloud.database();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const TIMEOUT = 15000;

// 读取配置文件
function loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config;
        } catch (e) {
            console.error('[manageSources] 配置加载失败:', e.message);
        }
    }
    return {};
}

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

    const permissions = admin.data[0].permissions || [];
    if (!permissions.includes('sources') && !permissions.includes('all')) {
        throw new Error('无数据源管理权限');
    }

    return admin.data[0];
}

// ============ 智能分析函数 ============

/**
 * 从URL中提取分类标识 (category/sourceId)
 * 例如: https://www.scuec.edu.cn/wyxy/index/cxcy.htm → "wyxy"
 *       https://www.scuec.edu.cn/jwc/tztg.htm → "jwc"
 */
function extractCategoryFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const parts = pathname.split('/').filter(p => p && !p.match(/^index\./));

        if (parts.length === 0) return '';

        // 获取最后一级目录（排除 .htm/.html 文件）
        let category = parts[parts.length - 1];
        if (category.match(/\.(htm|html?)$/i)) {
            category = parts.length > 1 ? parts[parts.length - 2] : '';
        }

        return category || '';
    } catch (e) {
        console.error('[extractCategory] 提取失败:', e.message);
        return '';
    }
}

/**
 * 智能获取网页标题（用于 sourceName）
 */
async function fetchPageTitle(url) {
    try {
        const res = await axios.get(url, {
            timeout: TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            maxRedirects: 5
        });

        // 尝试从 <title> 提取
        const titleMatch = res.data.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1].trim();
        }

        // 尝试从 <h1> 提取
        const h1Match = res.data.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match && h1Match[1]) {
            return h1Match[1].trim();
        }

        return null;
    } catch (e) {
        console.error('[fetchPageTitle] 获取失败:', e.message);
        return null;
    }
}

/**
 * 从域名推断来源名称
 */
function inferSourceNameFromDomain(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');

        // 维护一个域名到名称的映射表
        const domainMap = {
            'scuec.edu.cn': '本校',
            'jwc.scuec.edu.cn': '教务处',
            'lib.scuec.edu.cn': '图书馆'
        };

        return domainMap[hostname] || hostname;
    } catch (e) {
        return '未知来源';
    }
}

/**
 * 智能分析URL，返回建议数据
 */
async function analyzeUrl(url) {
    if (!url) {
        return { success: false, error: 'URL不能为空' };
    }

    const category = extractCategoryFromUrl(url);
    console.log('[manageSources] 提取的category:', category);

    // 尝试获取网页标题
    let sourceName = await fetchPageTitle(url);
    console.log('[manageSources] 获取的页面标题:', sourceName);

    // 如果获取失败，从域名推断
    if (!sourceName) {
        sourceName = inferSourceNameFromDomain(url);
    }

    // sourceId 使用 category
    const sourceId = category;

    // 根据URL特征推断类型
    let sourceType = 'website';
    if (url.includes('/rss') || url.includes('.xml')) {
        sourceType = 'rss';
    } else if (url.includes('/api')) {
        sourceType = 'api';
    }

    return {
        success: true,
        data: {
            sourceId,
            sourceName,
            category,
            sourceType,
            suggestedUrl: url
        }
    };
}

// ============ 主入口 ============

exports.main = async (event, context) => {
    const openid = context.OPENID;
    const { action, ...data } = event;

    try {
        // analyze 和 list 不需要验证权限，直接处理
        if (action === 'analyze' || action === 'list') {
            if (action === 'list') {
                const sources = await db.collection('sources').get();
                return {
                    code: 0,
                    data: sources.data || []
                };
            }
            // analyze action
            const { url } = data;
            const result = await analyzeUrl(url);

            if (!result.success) {
                return { code: 400, message: result.error };
            }

            return {
                code: 0,
                data: result.data
            };
        }

        // 其他 action 需要验证登录和权限
        if (!openid) {
            return { code: 401, message: '未登录' };
        }

        await verifyAdmin(openid);

        switch (action) {
            case 'create': {
                const {
                    sourceId,
                    sourceName,
                    sourceType,
                    description,
                    category,
                    config,
                    schedule,
                    defaultTags,
                    enabled = true,
                    autoAnalyze
                } = data;

                let finalSourceId = sourceId;
                let finalSourceName = sourceName;
                let finalCategory = category;

                // 如果需要自动分析URL
                if (autoAnalyze && config?.url) {
                    const analysis = await analyzeUrl(config.url);
                    if (analysis.success) {
                        finalSourceId = sourceId || analysis.data.sourceId;
                        finalSourceName = sourceName || analysis.data.sourceName;
                        finalCategory = category || analysis.data.category;
                    }
                }

                // 验证必填字段
                if (!finalSourceId) {
                    return { code: 400, message: 'sourceId不能为空' };
                }
                if (!finalSourceName) {
                    return { code: 400, message: 'sourceName不能为空' };
                }

                const now = Date.now();
                const result = await db.collection('sources').add({
                    sourceId: finalSourceId,
                    sourceName: finalSourceName,
                    sourceType: sourceType || 'website',
                    description: description || '',
                    category: finalCategory || finalSourceId,
                    enabled,
                    config: config || { url: '' },
                    schedule: {
                        interval: schedule?.interval || 3600000,
                        lastRunTime: null,
                        nextRunTime: null,
                        autoSync: schedule?.autoSync || false
                    },
                    defaultTags: defaultTags || {
                        source: [],
                        role: ['通用'],
                        custom: []
                    },
                    stats: {
                        totalArticles: 0,
                        lastFetchCount: 0,
                        lastCheckTime: null,
                        hasUpdates: false
                    },
                    createTime: now,
                    updateTime: now
                });

                return {
                    code: 0,
                    message: '创建成功',
                    data: { id: result.id }
                };
            }

            case 'update': {
                const { id, ...updateData } = data;

                if (!id) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                // 过滤允许更新的字段
                const allowedFields = [
                    'sourceId', 'sourceName', 'sourceType', 'description',
                    'category', 'enabled', 'config', 'schedule', 'defaultTags'
                ];
                const filteredData = {};
                for (const key of allowedFields) {
                    if (updateData[key] !== undefined) {
                        filteredData[key] = updateData[key];
                    }
                }
                filteredData.updateTime = Date.now();

                await db.collection('sources').doc(id).update(filteredData);

                return {
                    code: 0,
                    message: '更新成功'
                };
            }

            case 'delete': {
                const { id } = data;

                if (!id) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                await db.collection('sources').doc(id).remove();

                return {
                    code: 0,
                    message: '删除成功'
                };
            }

            case 'toggle': {
                const { id, enabled } = data;

                if (!id) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                await db.collection('sources').doc(id).update({
                    enabled,
                    updateTime: Date.now()
                });

                return {
                    code: 0,
                    message: enabled ? '已启用' : '已禁用'
                };
            }

            case 'test': {
                // 测试数据源连接
                const { url } = data;

                if (!url) {
                    return { code: 400, message: 'URL不能为空' };
                }

                try {
                    const res = await axios.get(url, {
                        timeout: TIMEOUT,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    return {
                        code: 0,
                        message: '连接成功',
                        data: {
                            status: res.status,
                            contentLength: res.data?.length || 0
                        }
                    };
                } catch (e) {
                    return {
                        code: 500,
                        message: '连接失败: ' + e.message
                    };
                }
            }

            default:
                return { code: 400, message: '无效的操作' };
        }

    } catch (error) {
        console.error('数据源管理失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

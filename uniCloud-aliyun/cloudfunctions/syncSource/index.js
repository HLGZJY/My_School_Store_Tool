'use strict';

const db = uniCloud.database();
const {
    default: axios
} = require('axios');

// Moonshot API 配置
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY || 'your-api-key-here';
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

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

    // 检查是否有 sync 权限
    const permissions = admin.data[0].permissions || [];
    if (!permissions.includes('sync') && !permissions.includes('all')) {
        throw new Error('无数据采集权限');
    }

    return admin.data[0];
}

/**
 * 获取所有启用的数据源
 */
async function getEnabledSources() {
    const sources = await db.collection('sources')
        .where({ enabled: true })
        .get();

    return sources.data || [];
}

/**
 * RSS 采集
 */
async function fetchRSSData(source) {
    // 简化版：直接请求 RSS URL
    // 实际项目中可以使用 rss-parser 库
    try {
        const response = await axios.get(source.config.url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // 这里需要解析 RSS XML
        // 简化返回空数组，实际需要 XML 解析
        console.log('RSS 采集:', source.name, response.data?.substring(0, 200));

        return [];
    } catch (error) {
        console.error('RSS 采集失败:', error.message);
        return [];
    }
}

/**
 * API 采集
 */
async function fetchAPIData(source) {
    try {
        const response = await axios.get(source.config.url, {
            timeout: 10000,
            headers: source.config.headers || {}
        });

        // 简化版：假设返回的是文章数组
        const items = source.config.path ? getNestedValue(response.data, source.config.path) : response.data;

        if (!Array.isArray(items)) {
            return [];
        }

        return items.map(item => ({
            title: item[source.config.titleField] || item.title || '无标题',
            content: item[source.config.contentField] || item.content || '',
            url: item[source.config.urlField] || item.url || '',
            publishTime: item[source.config.timeField] ? new Date(item[source.config.timeField]).getTime() : Date.now()
        }));
    } catch (error) {
        console.error('API 采集失败:', error.message);
        return [];
    }
}

/**
 * 网站采集（简化版 - 实际需要用 Kimi $web_search 或 Cheerio）
 */
async function fetchWebsiteData(source) {
    // 这里先用简化版
    // 实际项目中可以用 Kimi $web_search 工具
    console.log('网站采集:', source.name, source.config.url);

    // 返回空数组，等待后续实现 Kimi 集成
    return [];
}

/**
 * 获取嵌套对象值
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 使用 Kimi API 处理文章（生成摘要、分类、标签）
 */
async function processArticleWithAI(article, source) {
    if (!MOONSHOT_API_KEY || MOONSHOT_API_KEY === 'your-api-key-here') {
        console.log('未配置 Moonshot API，跳过 AI 处理');
        return {
            summary: '',
            category: 'notice',
            tags: { source: [], role: ['通用'], custom: [] },
            confidence: 0
        };
    }

    try {
        const client = new (require('openai').OpenAI)({
            apiKey: MOONSHOT_API_KEY,
            baseURL: MOONSHOT_BASE_URL
        });

        const prompt = `请分析以下校园通知文章，提取关键信息。

文章标题：${article.title}
文章内容：${article.content?.substring(0, 2000)}

请返回 JSON 格式：
{
  "summary": "100字以内的摘要",
  "category": "notice(通知)|academic(学术)|activity(活动)|service(服务)",
  "tags": ["标签1", "标签2"],
  "urgency": "high(紧急)|medium(一般)|low(普通)"
}`;

        const completion = await client.chat.completions.create({
            model: 'kimi-k2-turbo-preview',
            messages: [{
                role: 'system',
                content: '你是一个校园信息助手，擅长分析通知文章并提取关键信息。'
            }, {
                role: 'user',
                content: prompt
            }],
            temperature: 0.3
        });

        const result = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(result);

        return {
            summary: parsed.summary || '',
            category: parsed.category || 'notice',
            tags: {
                source: [source.name],
                role: ['通用'],
                custom: parsed.tags || []
            },
            urgency: parsed.urgency || 'low',
            confidence: 80
        };
    } catch (error) {
        console.error('AI 处理失败:', error.message);
        return {
            summary: '',
            category: 'notice',
            tags: { source: [source.name], role: ['通用'], custom: [] },
            confidence: 0
        };
    }
}

/**
 * 保存文章到数据库
 */
async function saveArticle(item, source, aiResult) {
    // 检查是否已存在
    const existing = await db.collection('articles')
        .where({ originalUrl: item.url })
        .get();

    const now = Date.now();

    if (existing.data.length > 0) {
        // 更新
        await db.collection('articles').doc(existing.data[0]._id).update({
            title: item.title,
            content: item.content,
            plainText: item.content?.replace(/<[^>]+>/g, ''),
            updateTime: now
        });

        return { action: 'update', id: existing.data[0]._id };
    } else {
        // 创建
        const result = await db.collection('articles').add({
            title: item.title,
            content: item.content,
            plainText: item.content?.replace(/<[^>]+>/g, '') || '',
            summary: aiResult.summary,
            category: aiResult.category,
            tags: aiResult.tags,
            urgency: aiResult.urgency || 'low',
            sourceId: source._id,
            sourceName: source.name,
            originalUrl: item.url,
            publishTime: item.publishTime || now,
            stats: {
                viewCount: 0,
                collectCount: 0,
                shareCount: 0
            },
            aiProcess: {
                processed: true,
                confidence: aiResult.confidence,
                model: 'moonshot-k2',
                processTime: now
            },
            status: aiResult.confidence >= 60 ? 'published' : 'pending',
            createTime: now,
            updateTime: now
        });

        return { action: 'create', id: result.id };
    }
}

/**
 * 主采集流程
 */
async function syncAllSources(openid) {
    // 验证管理员
    await verifyAdmin(openid);

    // 获取数据源
    const sources = await getEnabledSources();

    if (!sources.length) {
        return {
            totalSources: 0,
            newArticles: 0,
            updatedArticles: 0,
            failedSources: 0
        };
    }

    const results = {
        totalSources: sources.length,
        newArticles: 0,
        updatedArticles: 0,
        failedSources: 0
    };

    for (const source of sources) {
        try {
            console.log(`开始采集数据源: ${source.name}`);

            let rawData = [];
            switch (source.type) {
                case 'rss':
                    rawData = await fetchRSSData(source);
                    break;
                case 'api':
                    rawData = await fetchAPIData(source);
                    break;
                case 'website':
                    rawData = await fetchWebsiteData(source);
                    break;
                default:
                    console.log(`未知类型: ${source.type}`);
            }

            console.log(`从 ${source.name} 获取到 ${rawData.length} 条数据`);

            // 处理每条数据
            for (const item of rawData) {
                if (!item.title || !item.content) continue;

                // AI 处理
                const aiResult = await processArticleWithAI(item, source);

                // 保存
                const saveResult = await saveArticle(item, source, aiResult);

                if (saveResult.action === 'create') {
                    results.newArticles++;
                } else {
                    results.updatedArticles++;
                }
            }

            // 更新数据源统计
            await db.collection('sources').doc(source._id).update({
                'stats.lastRunTime': now,
                'stats.lastFetchCount': rawData.length,
                updateTime: now
            });

        } catch (error) {
            console.error(`采集失败 ${source.name}:`, error.message);
            results.failedSources++;
        }
    }

    // 记录操作日志
    await db.collection('operation_logs').add({
        userId: openid,
        action: 'sync',
        target: 'source',
        result: results,
        createTime: Date.now()
    });

    return results;
}

const now = Date.now();

exports.main = async (event, context) => {
    const openid = context.OPENID;

    try {
        if (!openid) {
            return {
                code: 401,
                message: '未登录'
            };
        }

        const results = await syncAllSources(openid);

        return {
            code: 0,
            message: '采集完成',
            data: results
        };

    } catch (error) {
        console.error('采集失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

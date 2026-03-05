'use strict';

const db = uniCloud.database();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 速率限制配置
const RATE_LIMIT = {
    maxRequests: 10,      // 每个用户每分钟最多请求次数
    windowMs: 60 * 1000   // 时间窗口：1分钟
};

// 简单的内存存储用于速率限制（生产环境建议使用 Redis）
const requestHistory = new Map();

/**
 * 检查速率限制
 * @param {string} openid - 用户openid
 * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
 */
function checkRateLimit(openid) {
    const now = Date.now();
    const history = requestHistory.get(openid) || [];

    // 清理过期请求
    const validRequests = history.filter(timestamp => now - timestamp < RATE_LIMIT.windowMs);

    if (validRequests.length >= RATE_LIMIT.maxRequests) {
        const oldestRequest = Math.min(...validRequests);
        const resetTime = oldestRequest + RATE_LIMIT.windowMs;
        return { allowed: false, remaining: 0, resetTime };
    }

    return { allowed: true, remaining: RATE_LIMIT.maxRequests - validRequests.length };
}

// Moonshot API 配置 - 直接读取配置文件
let MOONSHOT_API_KEY = '';
let MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

try {
    // 优先读取当前目录下的 config.json（云函数目录内）
    const localConfigPath = path.join(__dirname, 'config.json');

    if (fs.existsSync(localConfigPath)) {
        const configContent = fs.readFileSync(localConfigPath, 'utf8');
        const config = JSON.parse(configContent);
        if (config.moonshot) {
            MOONSHOT_API_KEY = config.moonshot.apiKey || '';
            if (config.moonshot.baseUrl) {
                MOONSHOT_BASE_URL = config.moonshot.baseUrl;
            }
            console.log('[fetchUrl] 本地配置读取成功');
        }
    } else {
        // 备选：尝试读取 uni-config-center
        const configPaths = [
            path.join(process.cwd(), '../../uni-config-center/config.json'),
            path.join(__dirname, '../../uni-config-center/config.json')
        ];

        for (const configPath of configPaths) {
            try {
                if (fs.existsSync(configPath)) {
                    const configContent = fs.readFileSync(configPath, 'utf8');
                    const config = JSON.parse(configContent);
                    if (config.moonshot) {
                        MOONSHOT_API_KEY = config.moonshot.apiKey || '';
                        if (config.moonshot.baseUrl) {
                            MOONSHOT_BASE_URL = config.moonshot.baseUrl;
                        }
                        console.log('[fetchUrl] uni-config-center 配置读取成功');
                        break;
                    }
                }
            } catch (e) {
                // 继续尝试下一个路径
            }
        }
    }

    if (!MOONSHOT_API_KEY) {
        console.warn('[fetchUrl] 警告: 未配置 Moonshot API Key');
    }
} catch (e) {
    console.warn('[fetchUrl] 配置读取失败:', e.message);
}

/**
 * 调用 Kimi Chat API
 */
async function chatCompletion(messages, tools = null) {
    const data = {
        model: 'kimi-k2-turbo-preview',
        messages: messages,
        temperature: 0.3
    };
    if (tools) {
        data.tools = tools;
    }

    const response = await axios.post(`${MOONSHOT_BASE_URL}/chat/completions`, data, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MOONSHOT_API_KEY}`
        },
        timeout: 120000
    });

    return response.data;
}

/**
 * 调用 Kimi fetch 工具获取 URL 内容
 */
async function fetchUrlContent(url) {
    if (!MOONSHOT_API_KEY) {
        throw new Error('未配置 Moonshot API Key');
    }

    // 使用 fetch 工具的声明
    const tools = [
        {
            type: 'function',
            function: {
                name: 'fetch',
                description: 'URL 内容提取 - 将网页内容提取为 Markdown 格式化文本',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: '要获取内容的 URL'
                        }
                    },
                    required: ['url']
                }
            }
        }
    ];

    const messages = [
        {
            role: 'system',
            content: '你是 Kimi，由 Moonshot AI 提供的人工智能助手。请使用 fetch 工具获取网页内容。'
        },
        {
            role: 'user',
            content: `请获取以下 URL 的内容：${url}`
        }
    ];

    // 第一轮：让模型决定是否调用 fetch
    const completion = await chatCompletion(messages, tools);
    const choice = completion.choices[0];

    // 如果有 tool_calls，执行工具
    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        // 将模型的消息添加到上下文
        messages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            if (toolName === 'fetch') {
                // 调用 fetch 工具
                const fetchResult = await callFetchTool(args.url);

                // 将工具结果添加到上下文
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: fetchResult
                });
            }
        }

        // 第二轮：让模型根据 fetch 结果生成最终回复
        const finalCompletion = await chatCompletion(messages);
        return finalCompletion.choices[0].message.content;
    }

    // 如果没有 tool_calls，直接返回内容
    return choice.message.content;
}

/**
 * 直接调用 fetch 工具的 API（带重试机制）
 */
async function callFetchTool(url, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[fetchUrl] fiber 调用尝试 ${attempt + 1}/${maxRetries + 1}`);

            // 调用 fiber 执行 fetch
            const fiberRes = await axios.post(
                `${MOONSHOT_BASE_URL}/formulas/moonshot/fetch:latest/fibers`,
                {
                    name: 'fetch',
                    arguments: JSON.stringify({ url })
                },
                {
                    headers: {
                        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            if (fiberRes.status === 200) {
                const data = fiberRes.data;
                if (data && data.status === 'succeeded') {
                    // 解密输出
                    return data.context.encrypted_output || data.context.output || '';
                }
            }
        } catch (e) {
            lastError = e;
            console.warn(`[fetchUrl] fiber 调用失败 (尝试 ${attempt + 1}):`, e.message);
        }
    }

    // 所有重试都失败，记录错误并降级
    console.error(`[fetchUrl] fiber 调用最终失败:`, lastError?.message);
    return await simpleFetch(url);
}

/**
 * 简单的 HTTP 请求获取网页内容
 */
async function simpleFetch(url) {
    try {
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(`获取网页失败: ${error.message}`);
    }
}

/**
 * 使用 Kimi 解析文章内容
 */
async function parseArticleWithAI(content, sourceUrl) {
    const prompt = `请分析以下网页内容，提取校园通知/公告信息。

网页内容：
${content.substring(0, 8000)}

请返回 JSON 格式：
{
  "title": "文章标题",
  "publishTime": "发布时间（YYYY-MM-DD 格式）",
  "content": "正文内容（提取主要信息，去除广告、导航等无关内容）",
  "summary": "100字以内的摘要",
  "category": "notice(通知)|academic(学术)|activity(活动)|service(服务)|other(其他)",
  "tags": ["标签1", "标签2"],
  "urgency": "high(紧急)|medium(一般)|low(普通)",
  "isValid": true
}`;

    const messages = [
        {
            role: 'system',
            content: '你是一个校园信息助手，擅长分析通知文章并提取关键信息。返回 JSON 格式。'
        },
        {
            role: 'user',
            content: prompt
        }
    ];

    const response = await axios.post(
        `${MOONSHOT_BASE_URL}/chat/completions`,
        {
            model: 'kimi-k2-turbo-preview',
            messages: messages,
            temperature: 0.3,
            response_format: { type: 'json_object' }
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOONSHOT_API_KEY}`
            },
            timeout: 60000
        }
    );

    const result = response.data.choices[0]?.message?.content || '{}';

    try {
        return JSON.parse(result);
    } catch (e) {
        console.error('解析 AI 结果失败:', e);
        return {
            title: '解析失败',
            content: content.substring(0, 1000),
            isValid: false
        };
    }
}

/**
 * 保存文章到数据库
 */
async function saveArticle(item, originalUrl) {
    const now = Date.now();

    // 检查是否已存在
    const existing = await db.collection('articles')
        .where({ originalUrl: originalUrl })
        .get();

    if (existing.data.length > 0) {
        return {
            exists: true,
            id: existing.data[0]._id,
            message: '该 URL 的文章已存在'
        };
    }

    // 创建新文章
    const publishTime = item.publishTime ? new Date(item.publishTime).getTime() : now;

    const result = await db.collection('articles').add({
        title: item.title || '无标题',
        content: item.content || '',
        plainText: item.content?.replace(/<[^>]+>/g, '') || '',
        summary: item.summary || '',
        category: item.category || 'notice',
        tags: {
            source: ['URL抓取'],
            role: ['通用'],
            custom: item.tags || []
        },
        urgency: item.urgency || 'low',
        sourceId: null,
        sourceName: 'URL抓取',
        originalUrl: originalUrl,
        publishTime: publishTime,
        stats: {
            viewCount: 0,
            collectCount: 0,
            shareCount: 0
        },
        aiProcess: {
            processed: true,
            confidence: item.isValid ? 80 : 30,
            model: 'moonshot-k2',
            processTime: now
        },
        status: item.isValid ? 'published' : 'draft',
        createTime: now,
        updateTime: now
    });

    return {
        exists: false,
        id: result.id,
        message: item.isValid ? '文章已发布' : '文章已保存为草稿'
    };
}

exports.main = async (event, context) => {
    const { url, action, openid: paramOpenid } = event;
    // 优先使用传入的 openid，fallback 到 context.OPENID
    const openid = paramOpenid || context.OPENID;

    console.log('[fetchUrl] openid 来源:', paramOpenid ? '前端传入' : 'context.OPENID');
    console.log('[fetchUrl] openid:', openid);

    if (!MOONSHOT_API_KEY) {
        console.warn('[fetchUrl] Moonshot API Key 未配置');
    }

    try {
        if (!openid) {
            return { code: 401, message: '未登录 - 请先登录小程序' };
        }

        // 检查速率限制
        const rateLimit = checkRateLimit(openid);
        if (!rateLimit.allowed) {
            const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
            return {
                code: 429,
                message: `请求过于频繁，请 ${retryAfter} 秒后再试`,
                data: { retryAfter }
            };
        }

        if (action === 'test') {
            // 记录测试请求
            const history = requestHistory.get(openid) || [];
            history.push(Date.now());
            requestHistory.set(openid, history);

            return {
                code: 0,
                message: '云函数连接正常',
                data: {
                    openid: openid,
                    message: '已收到请求'
                }
            };
        }

        if (action === 'fetch') {
            if (!url) {
                return { code: 400, message: 'URL 不能为空' };
            }

            try {
                new URL(url);
            } catch (e) {
                return { code: 400, message: 'URL 格式不正确' };
            }

            // 记录请求
            const history = requestHistory.get(openid) || [];
            history.push(Date.now());
            requestHistory.set(openid, history);

            console.log('[fetchUrl] 开始抓取:', url);

            // 1. 获取网页内容
            const content = await fetchUrlContent(url);
            console.log('[fetchUrl] 内容获取成功, 长度:', content.length);

            // 2. 使用 AI 解析内容
            const parsed = await parseArticleWithAI(content, url);
            console.log('[fetchUrl] AI 解析完成');

            // 3. 保存到数据库
            const saveResult = await saveArticle(parsed, url);

            return {
                code: 0,
                data: {
                    url: url,
                    parsed: parsed,
                    saveResult: saveResult
                }
            };
        }

        return { code: 400, message: '未知操作' };

    } catch (error) {
        console.error('[fetchUrl] 错误:', error.message);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

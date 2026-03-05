'use strict';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 WAE/1.0';

/**
 * 验证是否为微信公众号文章链接
 */
function isValidMpArticle(url) {
    return url.includes('mp.weixin.qq.com') && url.includes('/s/');
}

/**
 * 解析 HTML 提取纯文字内容
 */
function parseHtmlToText(html) {
    // 找到文章内容区域
    const jsContentMatch = html.match(/<div[^>]*id=["']js_content["'][^>]*>([\s\S]*?)<\/div>/i);
    let content = jsContentMatch ? jsContentMatch[1] : html;

    // 移除 script 和 style 标签
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');

    // 移除 HTML 标签
    content = content.replace(/<[^>]+>/g, '\n');

    // 合并多个空白字符
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.replace(/[ \t]+/g, ' ');

    return content.trim();
}

/**
 * 从 HTML 中提取 JSON 数据
 */
function extractCgiData(html) {
    // 查找 window.appmsg = {...}
    const appmsgMatch = html.match(/window\.appmsg\s*=\s*({[\s\S]*?})\s*;/);
    if (appmsgMatch) {
        try {
            return JSON.parse(appmsgMatch[1]);
        } catch (e) {
            // 忽略
        }
    }

    return null;
}

exports.main = async (event, context) => {
    const { url, format = 'text' } = event;

    if (!url) {
        return { code: 400, message: 'url 不能为空' };
    }

    if (!isValidMpArticle(url)) {
        return { code: 400, message: 'url 不合法，需要微信公众号文章链接' };
    }

    if (!['text', 'html', 'json'].includes(format)) {
        return { code: 400, message: '不支持的 format' };
    }

    try {
        // 使用 uniCloud.request
        const res = await uniCloud.request({
            url: url,
            method: 'GET',
            headers: {
                'Referer': 'https://mp.weixin.qq.com/',
                'Origin': 'https://mp.weixin.qq.com',
                'User-Agent': USER_AGENT
            },
            dataType: 'text'
        });

        const html = res.data;

        // 检查是否被删除或需要登录
        if (html.includes('该内容已被发布者删除') || html.includes('此内容暂不支持展示')) {
            return { code: 404, message: '文章已被删除或不存在' };
        }

        // 尝试提取 JSON 数据
        const cgiData = extractCgiData(html);

        if (format === 'json' && cgiData) {
            return {
                code: 0,
                data: {
                    title: cgiData.title,
                    author: cgiData.author,
                    digest: cgiData.digest,
                    content_url: cgiData.content_url,
                    cover: cgiData.cover || cgiData.cdn_url,
                    publish_time: cgiData.time,
                    source_url: cgiData.source_url
                }
            };
        }

        // 提取纯文字
        const text = parseHtmlToText(html);

        if (format === 'text') {
            return {
                code: 0,
                data: { text }
            };
        }

        if (format === 'html') {
            return {
                code: 0,
                data: { html, text }
            };
        }

    } catch (error) {
        console.error('下载文章失败:', error);
        return { code: 500, message: error.message || '下载失败' };
    }
};

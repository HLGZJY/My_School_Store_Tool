'use strict';

const db = uniCloud.database();

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 WAE/1.0';

/**
 * 获取凭证
 */
async function getCredential(authKey) {
    try {
        const result = await db.collection('wc_credentials').where({ authKey }).get();
        return result.data[0] || null;
    } catch (e) {
        return null;
    }
}

/**
 * 微信请求代理 - 使用 uniCloud.request
 */
async function proxyMpRequest(endpoint, query, cookie) {
    const url = new URL(endpoint);
    if (query) {
        Object.keys(query).forEach(key => {
            url.searchParams.append(key, String(query[key]));
        });
    }

    const res = await uniCloud.request({
        url: url.toString(),
        method: 'GET',
        headers: {
            'Referer': 'https://mp.weixin.qq.com/',
            'Origin': 'https://mp.weixin.qq.com',
            'User-Agent': USER_AGENT,
            'Accept-Encoding': 'identity',
            'Cookie': cookie || ''
        },
        dataType: 'json'
    });

    return res.data;
}

exports.main = async (event, context) => {
    const { authKey, fakeid, begin = 0, size = 5, keyword } = event;

    // 验证凭证
    const credential = await getCredential(authKey);
    if (!credential || Date.now() > credential.expires) {
        return { code: 401, message: '凭证无效或已过期' };
    }

    if (!fakeid) {
        return { code: 400, message: 'fakeid 不能为空' };
    }

    try {
        const cookie = credential.cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const isSearching = !!keyword;

        const params = {
            sub: isSearching ? 'search' : 'list',
            search_field: isSearching ? '7' : 'null',
            begin: Number(begin),
            count: Number(size),
            query: keyword || '',
            fakeid,
            type: '101_1',
            free_publish_type: 1,
            sub_action: 'list_ex',
            token: credential.token,
            lang: 'zh_CN',
            f: 'json',
            ajax: 1
        };

        const res = await proxyMpRequest(
            'https://mp.weixin.qq.com/cgi-bin/appmsgpublish',
            params,
            cookie
        );

        if (res.base_resp?.ret === 0) {
            const publish_page = JSON.parse(res.publish_page || '{}');
            const publish_list = publish_page.publish_list || [];

            const articles = [];
            for (const item of publish_list) {
                if (!item.publish_info) continue;
                try {
                    const publish_info = JSON.parse(item.publish_info);
                    if (publish_info.appmsgex) {
                        articles.push({
                            title: publish_info.appmsgex.title,
                            link: publish_info.appmsgex.link,
                            cover: publish_info.appmsgex.cover || publish_info.appmsgex.cdn_url,
                            publish_time: publish_info.appmsgex.time,
                            digest: publish_info.appmsgex.digest,
                            author: publish_info.appmsgex.author,
                            item_show_type: publish_info.appmsgex.item_show_type,
                            is_pay: publish_info.appmsgex.is_pay
                        });
                    }
                } catch (e) {
                    // 跳过解析失败的数据
                }
            }

            return {
                code: 0,
                data: {
                    list: articles,
                    total: publish_page.total_count || articles.length
                }
            };
        }

        return {
            code: -1,
            message: res.base_resp?.err_msg || '获取文章列表失败'
        };
    } catch (error) {
        console.error('获取文章列表失败:', error);
        return { code: 500, message: error.message || '系统错误' };
    }
};

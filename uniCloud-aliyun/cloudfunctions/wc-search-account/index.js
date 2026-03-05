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
    const { authKey, keyword, begin = 0, size = 5 } = event;

    // 验证凭证
    const credential = await getCredential(authKey);
    if (!credential || Date.now() > credential.expires) {
        return { code: 401, message: '凭证无效或已过期' };
    }

    if (!keyword) {
        return { code: 400, message: 'keyword 不能为空' };
    }

    try {
        const cookie = credential.cookies.map(c => `${c.name}=${c.value}`).join('; ');

        const params = {
            action: 'search_biz',
            begin: Number(begin),
            count: Number(size),
            query: keyword,
            token: credential.token,
            lang: 'zh_CN',
            f: 'json',
            ajax: '1'
        };

        const res = await proxyMpRequest(
            'https://mp.weixin.qq.com/cgi-bin/searchbiz',
            params,
            cookie
        );

        if (res.base_resp?.ret === 0) {
            const list = (res.list || []).map(item => ({
                fakeid: item.fakeid,
                nickname: item.nickname,
                alias: item.alias,
                round_head_img: item.round_head_img,
                service_type: item.service_type,
                verify_type: item.verify_type,
                signature: item.signature
            }));

            return {
                code: 0,
                data: {
                    list,
                    total: res.total || list.length
                }
            };
        }

        return {
            code: -1,
            message: res.base_resp?.err_msg || '搜索失败'
        };
    } catch (error) {
        console.error('搜索公众号失败:', error);
        return { code: 500, message: error.message || '系统错误' };
    }
};

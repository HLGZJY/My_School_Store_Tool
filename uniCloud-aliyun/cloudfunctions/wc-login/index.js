'use strict';

const db = uniCloud.database();

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 微信请求代理 - 参考项目的实现方式
 */
async function proxyMpRequest(options) {
    const { endpoint, method = 'GET', query, body, parseJson = false } = options;

    const headers = {
        'Referer': 'https://mp.weixin.qq.com/',
        'Origin': 'https://mp.weixin.qq.com',
        'User-Agent': USER_AGENT,
        'Accept-Encoding': 'identity'
    };

    if (options.cookie) {
        headers['Cookie'] = options.cookie;
    }

    let url = endpoint;
    if (query) {
        const params = new URLSearchParams();
        Object.keys(query).forEach(key => params.append(key, String(query[key])));
        url += '?' + params.toString();
    }

    const requestOptions = {
        url: url,
        method,
        headers,
        data: body ? new URLSearchParams(body).toString() : undefined,
        dataType: 'text'
    };

    const res = await uniCloud.request(requestOptions);

    // 获取 set-cookie
    const rawSetCookie = res.header && (res.header['set-cookie'] || res.header['Set-Cookie'] || '');

    // 提取 uuid cookie（用于登录）
    let uuidCookie = '';
    if (rawSetCookie) {
        const cookies = rawSetCookie.split(',').map(c => c.trim());
        uuidCookie = cookies.find(c => c.startsWith('uuid=')) || '';
    }

    if (parseJson) {
        let data;
        try {
            data = JSON.parse(res.data);
        } catch (e) {
            data = res.data;
        }
        return { data, uuidCookie };
    }

    // 返回二进制数据（二维码图片）
    return {
        text: res.data,
        uuidCookie,
        headers: res.header
    };
}

function generateAuthKey() {
    return 'wc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function parseSetCookies(setCookies) {
    if (!setCookies || !setCookies.length) return [];
    return setCookies.map(cookieStr => {
        const [nameValue] = cookieStr.split(';');
        const [name, value] = nameValue.split('=');
        return { name, value };
    });
}

async function saveCredential(authKey, token, cookies) {
    const expires = Date.now() + 4 * 24 * 60 * 60 * 1000;
    await db.collection('wc_credentials').add({
        authKey, token, cookies, expires, createTime: Date.now()
    });
}

async function getCredential(authKey) {
    try {
        const result = await db.collection('wc_credentials').where({ authKey }).get();
        return result.data[0] || null;
    } catch (e) {
        return null;
    }
}

exports.main = async (event, context) => {
    const { action } = event;
    console.log('[wc-login] action:', action);

    try {
        switch (action) {
            case 'get_qrcode': {
                const sessionId = Date.now().toString();

                // 1. 创建登录会话 - 参考项目的逻辑
                console.log('[get_qrcode] 创建登录会话, sessionId:', sessionId);

                const startLoginRes = await proxyMpRequest({
                    endpoint: 'https://mp.weixin.qq.com/cgi-bin/bizlogin',
                    method: 'POST',
                    query: { action: 'startlogin' },
                    body: {
                        userlang: 'zh_CN',
                        redirect_url: '',
                        login_type: 3,
                        sessionid: sessionId,
                        token: '',
                        lang: 'zh_CN',
                        f: 'json',
                        ajax: 1
                    },
                    parseJson: true
                });

                console.log('[get_qrcode] startlogin 响应:', JSON.stringify(startLoginRes.data).substring(0, 200));
                console.log('[get_qrcode] uuidCookie:', startLoginRes.uuidCookie);

                // 2. 获取二维码图片
                const qrcodeRes = await proxyMpRequest({
                    endpoint: 'https://mp.weixin.qq.com/cgi-bin/scanloginqrcode',
                    method: 'GET',
                    query: { action: 'getqrcode', random: Date.now() }
                });

                // 返回二维码图片和 uuid cookie
                // 如果是图片数据，转换成 base64
                let qrcodeData = null;
                if (qrcodeRes.headers && qrcodeRes.headers['content-type'] && qrcodeRes.headers['content-type'].includes('image')) {
                    // 二进制图片
                    const base64 = Buffer.from(qrcodeRes.text, 'binary').toString('base64');
                    qrcodeData = `data:${qrcodeRes.headers['content-type']};base64,${base64}`;
                }

                return {
                    code: 0,
                    data: {
                        sessionId,
                        qrcodeUrl: qrcodeData,
                        uuid: startLoginRes.uuidCookie ? startLoginRes.uuidCookie.split('=')[1]?.split(';')[0] : '',
                        message: '请扫码登录'
                    }
                };
            }

            case 'check_scan': {
                const { sessionId, uuid } = event;
                if (!sessionId || !uuid) {
                    return { code: -1, message: 'sessionId 或 uuid 不能为空' };
                }

                // 使用 uuid cookie 构建请求
                const cookieStr = `uuid=${uuid}`;

                const res = await proxyMpRequest({
                    endpoint: 'https://mp.weixin.qq.com/cgi-bin/scanloginqrcode',
                    method: 'GET',
                    query: { action: 'ask', token: '', lang: 'zh_CN', f: 'json', ajax: 1 },
                    cookie: cookieStr,
                    parseJson: true
                });

                console.log('[check_scan] 响应:', JSON.stringify(res.data).substring(0, 200));

                const status = res.data?.status || res.data?.base_resp?.ret || -1;
                const message = status === 0 ? '等待扫码' : status === 1 ? '已扫码，请在手机上确认' : status === 2 ? '登录成功' : '请重新扫码';

                return { code: 0, data: { status, message, uuid } };
            }

            case 'login_confirm': {
                const { sessionId, uuid } = event;
                if (!sessionId || !uuid) {
                    return { code: -1, message: 'sessionId 或 uuid 不能为空' };
                }

                const cookieStr = `uuid=${uuid}`;

                const res = await proxyMpRequest({
                    endpoint: 'https://mp.weixin.qq.com/cgi-bin/bizlogin',
                    method: 'POST',
                    query: { action: 'login' },
                    body: {
                        userlang: 'zh_CN',
                        redirect_url: '',
                        cookie_forbidden: 0,
                        cookie_cleaned: 0,
                        plugin_used: 0,
                        login_type: 3,
                        token: '',
                        lang: 'zh_CN',
                        f: 'json',
                        ajax: 1
                    },
                    cookie: cookieStr,
                    parseJson: true
                });

                console.log('[login_confirm] 响应:', JSON.stringify(res.data).substring(0, 300));

                if (res.data?.base_resp?.ret === 0 || res.data?.redirect_url) {
                    const redirectUrl = res.data?.redirect_url || '';
                    const tokenMatch = redirectUrl.match(/[?&]token=(\d+)/);
                    const token = tokenMatch ? tokenMatch[1] : '';

                    // 解析登录后的 cookie
                    const rawSetCookie = res.headers && (res.headers['set-cookie'] || res.headers['Set-Cookie'] || '');
                    const cookies = parseSetCookies(rawSetCookie.split(',').map(c => c.trim()));

                    const authKey = generateAuthKey();
                    await saveCredential(authKey, token, cookies);

                    return { code: 0, data: { authKey, token, message: '登录成功' } };
                }

                return { code: -1, message: res.data?.base_resp?.err_msg || '登录失败' };
            }

            case 'get_credential': {
                const { authKey } = event;
                if (!authKey) return { code: -1, message: 'authKey 不能为空' };
                const credential = await getCredential(authKey);
                if (!credential || Date.now() > credential.expires) return { code: -1, message: '凭证无效或已过期' };
                return { code: 0, data: { authKey, expires: credential.expires, createTime: credential.createTime } };
            }

            default:
                return { code: -1, message: '未知 action' };
        }
    } catch (error) {
        console.error('[wc-login] 错误:', error.message);
        return { code: 500, message: error.message || '系统错误' };
    }
};

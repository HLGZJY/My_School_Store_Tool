/**
 * 用户相关API
 */

/**
 * 用户登录
 * @param {string} code 微信登录code
 * @param {Object} userInfo 用户信息
 * @returns {Promise}
 */
export function login(code, userInfo) {
    return uniCloud.callFunction({
        name: 'login',
        data: { code, userInfo }
    })
}

/**
 * 获取用户信息
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function getUserInfo(userId) {
    return uniCloud.callFunction({
        name: 'getUserInfo',
        data: { userId }
    })
}

/**
 * 设置用户角色
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function setUserRole(params) {
    return uniCloud.callFunction({
        name: 'setUserRole',
        data: params
    })
}

/**
 * 更新用户设置
 * @param {string} userId 用户ID
 * @param {Object} settings 设置
 * @returns {Promise}
 */
export function updateUserSettings(userId, settings) {
    return uniCloud.callFunction({
        name: 'updateUserSettings',
        data: { userId, settings }
    })
}

/**
 * 切换订阅
 * @param {string} userId 用户ID
 * @param {string} sourceId 数据源ID
 * @param {string} action 操作类型 subscribe/unsubscribe
 * @returns {Promise}
 */
export function toggleSubscribe(userId, sourceId, action) {
    return uniCloud.callFunction({
        name: 'toggleSubscribe',
        data: { userId, sourceId, action }
    })
}

/**
 * 获取订阅源列表
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function getSubscribeSources(userId) {
    return uniCloud.callFunction({
        name: 'getSubscribeSources',
        data: { userId }
    })
}

/**
 * 获取消息列表
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getMessages(params) {
    return uniCloud.callFunction({
        name: 'getMessages',
        data: params
    })
}

/**
 * 标记消息已读
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function markMessageRead(params) {
    return uniCloud.callFunction({
        name: 'markMessageRead',
        data: params
    })
}

/**
 * 上报搜索记录
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function reportSearch(params) {
    return uniCloud.callFunction({
        name: 'reportSearch',
        data: params
    })
}

/**
 * 获取热门关键词
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getHotKeywords(params) {
    return uniCloud.callFunction({
        name: 'getSystemConfig',
        data: { keys: ['hot_search_limit'] }
    }).then(res => {
        // 从数据库获取热门搜索
        return uniCloud.callFunction({
            name: 'getHotKeywords',
            data: params
        })
    })
}

/**
 * 获取系统配置
 * @param {Array} keys 配置键数组
 * @returns {Promise}
 */
export function getSystemConfig(keys) {
    return uniCloud.callFunction({
        name: 'getSystemConfig',
        data: { keys }
    })
}

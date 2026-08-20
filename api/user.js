/**
 * 用户相关API
 */

import { api } from './index.js'

/**
 * 用户登录
 * @param {string} code 微信登录code
 * @param {Object} userInfo 用户信息
 * @returns {Promise}
 */
export function login(code, userInfo) {
    return api.call('login', { code, userInfo })
}

/**
 * 获取用户信息
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function getUserInfo(userId) {
    return api.call('getUserInfo', { userId })
}

/**
 * 设置用户角色
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function setUserRole(params) {
    return api.call('setUserRole', params)
}

/**
 * 更新用户设置
 * @param {string} userId 用户ID
 * @param {Object} settings 设置
 * @returns {Promise}
 */
export function updateUserSettings(userId, settings) {
    return api.call('updateUserSettings', { userId, settings })
}

/**
 * 切换订阅
 * @param {string} userId 用户ID
 * @param {string} sourceId 数据源ID
 * @param {string} action 操作类型 subscribe/unsubscribe
 * @returns {Promise}
 */
export function toggleSubscribe(userId, sourceId, action) {
    return api.call('toggleSubscribe', { userId, sourceId, action })
}

/**
 * 获取订阅源列表
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function getSubscribeSources(userId) {
    return api.call('getSubscribeSources', { userId })
}

/**
 * 获取消息列表
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getMessages(params) {
    return api.call('getMessages', params)
}

/**
 * 标记消息已读
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function markMessageRead(params) {
    return api.call('markMessageRead', params)
}

/**
 * 上报搜索记录
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function reportSearch(params) {
    return api.call('reportSearch', params)
}

/**
 * 获取热门关键词
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getHotKeywords(params) {
    return api.call('getSystemConfig', { keys: ['hot_search_limit'] }).then(() => {
        return api.call('getHotKeywords', params)
    })
}

/**
 * 获取系统配置
 * @param {Array} keys 配置键数组
 * @returns {Promise}
 */
export function getSystemConfig(keys) {
    return api.call('getSystemConfig', { keys })
}

/**
 * 删除用户账户
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function deleteUserAccount(userId) {
    return api.call('deleteUserAccount', { userId })
}

// Convenience API object for stores
export const userApi = {
    login,
    getUserInfo,
    setUserRole,
    updateUserSettings,
    toggleSubscribe,
    getSubscribeSources,
    getMessages,
    markMessageRead,
    reportSearch,
    getHotKeywords,
    getSystemConfig,
    deleteUserAccount
}

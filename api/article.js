/**
 * 文章相关API
 */

import { formatTime } from '@/utils/format'

/**
 * 获取文章列表
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getArticles(params) {
    return uniCloud.callFunction({
        name: 'getArticles',
        data: params
    })
}

/**
 * 获取文章详情
 * @param {string} articleId 文章ID
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function getArticleDetail(articleId, userId) {
    return uniCloud.callFunction({
        name: 'getArticleDetail',
        data: { articleId, userId }
    })
}

/**
 * 搜索文章
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function searchArticles(params) {
    return uniCloud.callFunction({
        name: 'searchArticles',
        data: params
    })
}

/**
 * 记录阅读
 * @param {string} userId 用户ID
 * @param {string} articleId 文章ID
 * @param {number} duration 阅读时长
 * @returns {Promise}
 */
export function recordRead(userId, articleId, duration) {
    return uniCloud.callFunction({
        name: 'recordRead',
        data: { userId, articleId, duration }
    })
}

/**
 * 收藏文章
 * @param {string} userId 用户ID
 * @param {string} articleId 文章ID
 * @param {string} action 操作类型 collect/uncollect
 * @returns {Promise}
 */
export function collectArticle(userId, articleId, action) {
    return uniCloud.callFunction({
        name: 'collectArticle',
        data: { userId, articleId, action }
    })
}

/**
 * 获取收藏列表
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getCollections(params) {
    return uniCloud.callFunction({
        name: 'getCollections',
        data: params
    })
}

/**
 * 批量取消收藏
 * @param {string} userId 用户ID
 * @param {Array} articleIds 文章ID数组
 * @returns {Promise}
 */
export function batchUncollect(userId, articleIds) {
    return uniCloud.callFunction({
        name: 'batchUncollect',
        data: { userId, articleIds }
    })
}

/**
 * 获取阅读历史
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getReadingHistory(params) {
    return uniCloud.callFunction({
        name: 'getReadingHistory',
        data: params
    })
}

/**
 * 清空阅读历史
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function clearReadingHistory(userId) {
    return uniCloud.callFunction({
        name: 'clearReadingHistory',
        data: { userId }
    })
}

/**
 * 获取热门排行
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getHotRanking(params) {
    return uniCloud.callFunction({
        name: 'getHotRanking',
        data: params
    })
}

/**
 * 获取标签云
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getTagCloud(params) {
    return uniCloud.callFunction({
        name: 'getTagCloud',
        data: params
    })
}

/**
 * 获取时间轴
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getTimeline(params) {
    return uniCloud.callFunction({
        name: 'getTimeline',
        data: params
    })
}

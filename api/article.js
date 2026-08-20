/**
 * 文章相关API
 */

import { api } from './index.js'
import { loadWithCache, CACHE_KEYS, clearCache } from '@/utils/cache.js'

// 缓存 TTL 配置 (毫秒)
const CACHE_TTL = {
    ARTICLE_LIST: 5 * 60 * 1000,    // 5分钟
    DISCOVER_HOT: 10 * 60 * 1000,    // 10分钟
    DISCOVER_TAG_CLOUD: 10 * 60 * 1000, // 10分钟
    DISCOVER_TIMELINE: 5 * 60 * 1000  // 5分钟
}

/**
 * 获取文章列表
 * @param {Object} params 参数
 * @param {Object} options 选项 { useCache: boolean, cacheTTL: number }
 * @returns {Promise}
 */
export function getArticles(params, options = {}) {
    const { useCache = false, cacheTTL = CACHE_TTL.ARTICLE_LIST } = options
    console.log('[api.article] getArticles called, params:', params, 'options:', options)

    if (!useCache) {
        console.log('[api.article] Calling cloud function getArticles')
        return api.call('getArticles', params)
    }

    const cacheKey = CACHE_KEYS.ARTICLE_LIST(params.page, params)
    console.log('[api.article] Cache miss, calling cloud function')
    return loadWithCache(cacheKey, () => api.call('getArticles', params), cacheTTL)
}

/**
 * 获取文章详情
 * @param {string} articleId 文章ID
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function getArticleDetail(articleId, userId) {
    return api.call('getArticleDetail', { articleId, userId })
}

/**
 * 搜索文章
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function searchArticles(params) {
    return api.call('searchArticles', params)
}

/**
 * 记录阅读
 * @param {string} userId 用户ID
 * @param {string} articleId 文章ID
 * @param {number} duration 阅读时长
 * @returns {Promise}
 */
export function recordRead(userId, articleId, duration) {
    return api.call('recordRead', { userId, articleId, duration })
}

/**
 * 收藏文章
 * @param {string} userId 用户ID
 * @param {string} articleId 文章ID
 * @param {string} action 操作类型 collect/uncollect
 * @returns {Promise}
 */
export function collectArticle(userId, articleId, action) {
    const result = api.call('collectArticle', { userId, articleId, action })
    // 收藏状态变化时清除相关缓存
    if (result && typeof result.then === 'function') {
        return result.then(data => {
            clearCache(CACHE_KEYS.COLLECTION_LIST())
            clearCache(CACHE_KEYS.ARTICLE_DETAIL(articleId))
            return data
        }).catch(err => {
            throw err
        })
    }
    return result
}

/**
 * 获取收藏列表
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getCollections(params) {
    return api.call('getCollections', params)
}

/**
 * 批量取消收藏
 * @param {string} userId 用户ID
 * @param {Array} articleIds 文章ID数组
 * @returns {Promise}
 */
export function batchUncollect(userId, articleIds) {
    const result = api.call('batchUncollect', { userId, articleIds })
    // 收藏状态变化时清除相关缓存
    if (result && typeof result.then === 'function') {
        return result.then(data => {
            clearCache(CACHE_KEYS.COLLECTION_LIST())
            articleIds.forEach(id => clearCache(CACHE_KEYS.ARTICLE_DETAIL(id)))
            return data
        }).catch(err => {
            throw err
        })
    }
    return result
}

/**
 * 获取阅读历史
 * @param {Object} params 参数
 * @returns {Promise}
 */
export function getReadingHistory(params) {
    return api.call('getReadingHistory', params)
}

/**
 * 清空阅读历史
 * @param {string} userId 用户ID
 * @returns {Promise}
 */
export function clearReadingHistory(userId) {
    return api.call('clearReadingHistory', { userId })
}

/**
 * 获取热门排行
 * @param {Object} params 参数
 * @param {Object} options 选项 { useCache: boolean, cacheTTL: number }
 * @returns {Promise}
 */
export function getHotArticles(params, options = {}) {
    const { useCache = false, cacheTTL = CACHE_TTL.DISCOVER_HOT } = options

    if (!useCache) {
        return api.call('getHotArticles', params)
    }

    const cacheKey = CACHE_KEYS.DISCOVER_HOT(params.timeRange)
    return loadWithCache(cacheKey, () => api.call('getHotArticles', params), cacheTTL)
}

/**
 * 获取标签云
 * @param {Object} params 参数
 * @param {Object} options 选项 { useCache: boolean, cacheTTL: number }
 * @returns {Promise}
 */
export function getTagCloud(params, options = {}) {
    const { useCache = false, cacheTTL = CACHE_TTL.DISCOVER_TAG_CLOUD } = options

    if (!useCache) {
        return api.call('getTagCloud', params)
    }

    const cacheKey = CACHE_KEYS.DISCOVER_TAG_CLOUD()
    return loadWithCache(cacheKey, () => api.call('getTagCloud', params), cacheTTL)
}

/**
 * 获取时间轴
 * @param {Object} params 参数
 * @param {Object} options 选项 { useCache: boolean, cacheTTL: number }
 * @returns {Promise}
 */
export function getTimeline(params, options = {}) {
    const { useCache = false, cacheTTL = CACHE_TTL.DISCOVER_TIMELINE } = options

    if (!useCache) {
        return api.call('getTimeline', params)
    }

    const cacheKey = CACHE_KEYS.DISCOVER_TIMELINE(params.timeRange)
    return loadWithCache(cacheKey, () => api.call('getTimeline', params), cacheTTL)
}

/**
 * 获取搜索建议/自动补全
 * @param {Object} params 参数 { keyword: string, limit?: number }
 * @returns {Promise}
 */
export function getSearchSuggestions(params) {
    return api.call('getSearchSuggestions', params)
}

/**
 * 批量获取发现页数据
 * @param {Object} params 参数 { days?: number, limit?: number, tagLimit?: number, range?: string }
 * @returns {Promise}
 */
export function getDiscoverData(params = {}) {
    return api.call('getDiscoverData', params)
}

// Convenience API object
export const articleApi = {
    getArticles,
    getArticleDetail,
    searchArticles,
    recordRead,
    collectArticle,
    getCollections,
    batchUncollect,
    getReadingHistory,
    clearReadingHistory,
    getHotArticles,
    getTagCloud,
    getTimeline,
    getSearchSuggestions,
    getDiscoverData
}

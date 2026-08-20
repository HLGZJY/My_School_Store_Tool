/**
 * Admin operations API
 *
 * All admin-specific cloud function calls should go through this module.
 * Follows the same pattern as articleApi and userApi.
 */

import { api } from './index.js'

/**
 * Admin statistics (getStats, getLogs)
 * @param {string} action - 'getStats' or 'getLogs'
 * @param {Object} params - Additional parameters
 * @returns {Promise}
 */
export function adminStats(action, params = {}) {
    return api.call('adminStats', { action, ...params })
}

/**
 * Source CRUD operations
 * @param {string} action - CRUD action (create, update, delete, list, get)
 * @param {Object} params - Source data
 * @returns {Promise}
 */
export function manageSources(action, params) {
    console.log('[api/admin.js][manageSources] 调用云函数 manageSources', { action, params });
    return api.call('manageSources', { action, ...params })
}

/**
 * Subscription management
 * @param {string} action - Action type
 * @param {Object} params - Subscription params
 * @returns {Promise}
 */
export function manageSubscriptions(action, params) {
    return api.call('manageSubscriptions', { action, ...params })
}

/**
 * Sync source data from remote (legacy singular)
 * @param {string} sourceId - Source ID to sync
 * @returns {Promise}
 */
export function syncSource(sourceId) {
    return api.call('syncSource', { sourceId })
}

/**
 * 定时同步数据源：条件请求探测 + 增量拉取新链接
 * @param {string[]} [sourceIds] - 可选，指定数据源ID数组；不传则同步所有 autoSync=true 的数据源
 * @param {number} [concurrency=3] - 并发数
 * @returns {Promise}
 */
export function syncSources(sourceIds, concurrency = 3) {
    return api.call('syncSources', { sourceIds, concurrency })
}

/**
 * Approve or reject article
 * @param {string|null} articleId - Article ID (null for batch operations)
 * @param {string} action - 'approve', 'reject', or 'batchApprove'
 * @param {Object} params - Additional parameters (note, openid, articleIds)
 * @returns {Promise}
 */
export function approveArticle(articleId, action, params = {}) {
    console.log('[api/admin.js][approveArticle] 调用云函数 approveArticle', { articleId, action, params });
    return api.call('approveArticle', { articleId, action, ...params })
}

/**
 * Article management (edit, delete, feature)
 * @param {string|null} articleId - Article ID (null for batch operations)
 * @param {string} action - Management action
 * @param {Object} params - Additional params
 * @returns {Promise}
 */
export function manageArticle(articleId, action, params = {}) {
    console.log('[api/admin.js][manageArticle] 调用云函数 manageArticle', { articleId, action, params });
    return api.call('manageArticle', { articleId, action, ...params })
}

/**
 * User management
 * @param {string} action - Management action (list, search, update, delete)
 * @param {Object} params - User management params
 * @returns {Promise}
 */
export function manageUsers(action, params) {
    return api.call('manageUsers', { action, ...params })
}

/**
 * Add admin role to user
 * @param {string} userId - User ID
 * @returns {Promise}
 */
export function addAdmin(userId) {
    return api.call('addAdmin', { userId })
}

/**
 * Delete user account
 * @param {string} userId - User ID
 * @returns {Promise}
 */
export function deleteUserAccount(userId) {
    return api.call('deleteUserAccount', { userId })
}

/**
 * Run full pipeline: extractUrls -> parseArticles -> articles storage
 * @param {Object} params - Pipeline parameters
 * @param {string[]} params.sourceIds - Source IDs to process (or all enabled if not provided)
 * @param {string} params.tierFilter - 'tier1_tier2' or 'all'
 * @returns {Promise}
 */
export function runPipeline(params = {}) {
    return api.call('manageSources', { action: 'runPipeline', ...params })
}

/**
 * Get articles with admin-level filtering
 * @param {Object} params - Query parameters
 * @param {Object} params.where - Database query filter
 * @param {number} params.page - Page number
 * @param {number} params.pageSize - Items per page
 * @param {string[]} params.sourceIds - Source IDs to filter
 * @param {string} params.status - Article status filter
 * @param {Object} params.dateRange - Date range with start and end timestamps
 * @returns {Promise}
 */
export function getArticles(params = {}) {
    return api.call('adminGetArticles', params)
}

/**
 * Get URL page title with 30-day cache
 * @param {string} url - URL to fetch title from
 * @param {boolean} forceRefresh - Skip cache and force refresh
 * @returns {Promise<{title: string|null, url: string}>}
 */
export function getUrlTitle(url, forceRefresh = false) {
    return api.call('getUrlTitle', { url, forceRefresh })
}

// Convenience API object
export const adminApi = {
    adminStats,
    manageSources,
    manageSubscriptions,
    syncSource,
    approveArticle,
    manageArticle,
    manageUsers,
    addAdmin,
    deleteUserAccount,
    getArticles,
    runPipeline,
    getUrlTitle,
    syncSources
}

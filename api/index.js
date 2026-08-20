/**
 * Unified API Gateway
 *
 * Single entry point for all cloud function calls.
 * Provides interceptors, error handling, and consistent response format.
 *
 * Usage:
 *   import { api } from '@/api'
 *   const result = await api.call('functionName', { data })
 *
 * Or use convenience APIs:
 *   import { articleApi, userApi } from '@/api'
 *   const articles = await articleApi.getArticles(params, { useCache: true })
 *
 * Cache Strategy:
 *   Article list operations support optional caching via { useCache: true } option.
 *   Cache keys follow format: {domain}_{identifier}_{action} (see CACHE_KEYS)
 */

export class ApiClient {
  constructor(errorCallback = null) {
    this.errorCallback = errorCallback
    this.interceptors = {
      request: [],
      response: [],
      error: []
    }
  }

  /**
   * Add interceptors to the chain
   * @param {Function} onRequest - Called before each request (receives {functionName, data})
   * @param {Function} onResponse - Called on each response (receives result)
   * @param {Function} onError - Called on errors (receives error)
   */
  addInterceptor(onRequest, onResponse, onError) {
    if (onRequest) this.interceptors.request.push(onRequest)
    if (onResponse) this.interceptors.response.push(onResponse)
    if (onError) this.interceptors.error.push(onError)
  }

  /**
   * Call a cloud function
   * @param {string} functionName - Name of the cloud function
   * @param {Object} data - Data to pass to the function
   * @param {Object} options - Options including errorCallback override
   * @returns {Promise<any>} - The result.data from the cloud function
   */
  async call(functionName, data = {}, options = {}) {
    const { errorCallback } = options
    const cb = errorCallback || this.errorCallback

    // Run request interceptors
    for (const interceptor of this.interceptors.request) {
      interceptor({ functionName, data })
    }

    // Show loading indicator
    uni.showLoading({ mask: true })

    try {
      const res = await uniCloud.callFunction({
        name: functionName,
        data
      })

      uni.hideLoading()

      // Handle cloud function error
      if (res.result && res.result.code !== 0) {
        const error = new Error(res.result.message || 'Cloud function error')
        error.code = res.result.code
        error.data = res.result.data

        // Run error interceptors
        for (const interceptor of this.interceptors.error) {
          interceptor(error)
        }

        if (cb) {
          cb(error)
        } else {
          throw error
        }
        return
      }

      // Run response interceptors
      for (const interceptor of this.interceptors.response) {
        interceptor(res.result)
      }

      // Return result.data directly (not full response)
      return res.result?.data ?? res.result
    } catch (error) {
      uni.hideLoading()

      // Run error interceptors
      for (const interceptor of this.interceptors.error) {
        interceptor(error)
      }

      if (cb) {
        cb(error)
      } else {
        throw error
      }
    }
  }
}

// Export singleton instance
export const api = new ApiClient()

// Export convenience API objects (for stores that use userApi.login pattern)
export { userApi } from './user.js'
export { articleApi } from './article.js'
export { adminApi } from './admin.js'

// Re-export article API convenience functions
export {
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
  getTimeline
} from './article.js'

// Re-export cache keys for standardized cache usage
export { CACHE_KEYS } from './article.js'

// Re-export user API convenience functions
export {
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
} from './user.js'

// Re-export admin API convenience functions
export {
  adminStats,
  manageSources,
  manageSubscriptions,
  syncSource,
  syncSources,
  approveArticle,
  manageArticle,
  manageUsers,
  addAdmin,
  getUrlTitle
  // Note: getArticles not re-exported directly to avoid conflict with article.js getArticles
  // Use adminApi.getArticles() instead
} from './admin.js'

/**
 * useHistory - Reading history state management composable
 *
 * Encapsulates history loading, pagination, pull-to-refresh,
 * source filtering, and clear history operations.
 *
 * Usage:
 *   const {
 *     history,           // ref: history items
 *     loading,          // ref: loading state
 *     hasMore,          // ref: has more pages
 *     loadHistory,      // function: load history (optionally refresh)
 *     clearHistory,     // function: clear all history
 *     setSourceFilter   // function: filter by source
 *   } = useHistory({ pageSize: 20 })
 */

import { ref } from 'vue'
import { articleApi } from '@/api/index.js'

/**
 * Create a useHistory composable instance.
 * @param {Object} options
 * @param {number} [options.pageSize=20] - Number of items per page
 * @returns {Object} History composable API
 */
export function useHistory(options = {}) {
  const { pageSize = 20 } = options

  // --- State ---
  const history = ref([])
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(1)
  const sourceId = ref('')

  // --- Load history ---
  async function loadHistory(isRefresh = false) {
    if (loading.value && !isRefresh) return

    if (isRefresh) {
      page.value = 1
      history.value = []
      hasMore.value = true
    }

    loading.value = true

    try {
      const openid = uni.getStorageSync('openid')

      // Guard: if no openid (user not logged in), show toast and skip API call
      if (!openid) {
        console.warn('[useHistory] openid is empty, user may not be logged in')
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        })
        history.value = []
        hasMore.value = false
        loading.value = false
        return
      }

      const res = await articleApi.getReadingHistory({
        userId: openid,
        sourceId: sourceId.value,
        page: page.value,
        pageSize
      })

      const { history: list, hasMore: more } = res

      if (isRefresh) {
        history.value = list
      } else {
        history.value = [...history.value, ...list]
        page.value++
      }

      hasMore.value = more
    } catch (error) {
      console.error('[useHistory] loadHistory error:', error)
      uni.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      loading.value = false
    }
  }

  // --- Source filter ---
  function setSourceFilter(id) {
    sourceId.value = id
    loadHistory(true)
  }

  // --- Clear history ---
  async function clearHistory() {
    uni.showLoading({ title: '清空中...' })

    try {
      const openid = uni.getStorageSync('openid')
      await articleApi.clearReadingHistory(openid)

      uni.showToast({
        title: '清空成功',
        icon: 'success'
      })

      history.value = []
      page.value = 1
      hasMore.value = true
    } catch (error) {
      console.error('[useHistory] clearHistory error:', error)
      uni.showToast({
        title: '清空失败',
        icon: 'none'
      })
    } finally {
      uni.hideLoading()
    }
  }

  return {
    history,
    loading,
    hasMore,
    loadHistory,
    clearHistory,
    setSourceFilter
  }
}

/**
 * Format timestamp to readable time difference.
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  if (hours < 48) return '昨天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * Format duration in seconds to readable string.
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(seconds) {
  if (!seconds) return '0秒'
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}分钟`
}

/**
 * Get source display name from sourceId and sourceName.
 * @param {string} sourceId - Source ID
 * @param {string} sourceName - Source name
 * @returns {string} Short display name
 */
export function getSourceName(sourceId, sourceName) {
  const sourceMap = {
    'cxcy': '创新创业',
    'wyxy': '外语学院',
    'art': '美术学院',
    'stu': '学生工作部',
    'bwc': '保卫处',
    'qnw': '团委',
    'kfy': '科研发展院',
    'iao': '国际合作'
  }
  if (sourceId && sourceMap[sourceId]) {
    return sourceMap[sourceId]
  }
  return sourceName || '未知来源'
}

export default useHistory

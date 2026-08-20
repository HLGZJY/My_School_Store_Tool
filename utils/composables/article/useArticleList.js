/**
 * useArticleList - Article list state management composable
 *
 * Encapsulates article loading, pagination, pull-to-refresh, load-more,
 * swipe-to-collect, and integration with useFilter for combined filtering.
 *
 * Usage:
 *   const {
 *     articles,       // computed: articles with isCollected field
 *     loading,        // ref: loading state
 *     hasMore,        // ref: has more pages
 *     filters,       // reactive: filter state (from useFilter)
 *     refresherTriggered, // ref: pull-to-refresh state
 *     refresh,       // function: refresh article list
 *     loadMore,       // function: load next page
 *     updateFilters,  // function: update filters and refresh
 *     toggleCollect,  // function: toggle article collection
 *     articlesWithStatus, // computed: raw articles with collection status
 *     // swipe state
 *     swipeShowIndex,
 *     onTouchStart,
 *     onTouchEnd
 *   } = useArticleList({ pageSize: 10, autoLoad: true, filters: useFilter().filters })
 */

import { ref, computed, reactive } from 'vue'
import { articleApi } from '@/api/index.js'
import { useUserStore } from '@/store'

/**
 * Convert timeRange filter value to { startTime, endTime } for API call.
 * @param {string} timeRange - '1d', '7d', '30d', or falsy
 * @returns {Object} { startTime, endTime } with 0 values if no range
 */
function getTimeRangeFilter(timeRange) {
  // 'all' or empty string = no time filter
  if (!timeRange || timeRange === 'all') return {}
  const now = Date.now()
  const ranges = {
    '1d': 1 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }
  const days = ranges[timeRange] || 0
  if (days === 0) return {}
  return { startTime: now - days, endTime: now }
}

/**
 * Check if an article is collected by reading from localStorage.
 * Pure function - no side effects on composition.
 * @param {string} articleId - Article ID to check
 * @returns {boolean}
 */
export function checkIsCollected(articleId) {
  const collections = uni.getStorageSync('collections') || []
  return collections.some(c => c._id === articleId)
}

/**
 * Create a useArticleList composable instance.
 * @param {Object} options
 * @param {number} [options.pageSize=10] - Number of articles per page
 * @param {boolean} [options.autoLoad=true] - Whether to load articles on mount
 * @param {Object|null} [options.filters=null] - Reactive filter object from useFilter (or null for internal filters)
 * @returns {Object} Article list composable API
 */
export function useArticleList(options = {}) {
  const {
    pageSize = 10,
    autoLoad = true,
    filters = null  // reactive filter object from useFilter; null = use internal filters
  } = options

  // --- State ---
  const articles = ref([])          // raw article list
  const loading = ref(false)        // loading state
  const hasMore = ref(true)         // has more pages
  const page = ref(1)               // current page number
  const refresherTriggered = ref(false) // pull-to-refresh triggered

  // --- Filters ---
  // If filters is provided (from useFilter), use it directly.
  // Otherwise, create internal filter state.
  const internalFilters = reactive({
    sourceId: '',
    tag: '',
    timeRange: '',
    category: '',
    sourceIds: []
  })

  // Use provided filters or fall back to internal
  const activeFilters = filters || internalFilters

  // --- Collection integration ---
  // checkIsCollected is a pure function reading localStorage
  // articlesWithStatus adds isCollected field to each article
  const articlesWithStatus = computed(() =>
    articles.value.map(a => ({
      ...a,
      isCollected: checkIsCollected(a._id)
    }))
  )

  // articles export - the computed with status merged
  const articleList = computed(() => articlesWithStatus.value)

  // --- Load articles ---
  async function loadArticles(isRefresh = false) {
    console.log('[useArticleList] loadArticles called, isRefresh:', isRefresh)
    // Prevent duplicate requests (unless refreshing)
    if (loading.value && !isRefresh) return

    if (isRefresh) {
      // Reset state for refresh
      page.value = 1
      articles.value = []
      hasMore.value = true
      refresherTriggered.value = true
    }

    loading.value = true

    try {
      // Build time range filter
      const timeFilter = getTimeRangeFilter(activeFilters.timeRange)

      // Get user subscriptions for filtering
      const subscriptions = uni.getStorageSync('subscriptions') || []
      const subscribedSourceIds = subscriptions.map(s => s.id).filter(id => id)

      console.log('[useArticleList] Calling articleApi.getArticles with subscribedSourceIds:', subscribedSourceIds)

      // Build params object, omitting sourceIds if empty (backend may handle empty array differently)
      const params = {
        page: page.value,
        pageSize,
        category: activeFilters.category || '',
        sourceId: activeFilters.sourceId || '',
        tag: activeFilters.tag || '',
        startDate: timeFilter.startTime || 0,
        endDate: timeFilter.endTime || 0
      }
      if (subscribedSourceIds.length > 0) {
        params.sourceIds = subscribedSourceIds
      }

      const res = await articleApi.getArticles(params)

      const { list, hasMore: more } = res
      console.log('[useArticleList] getArticles returned:', list?.length, 'items')

      if (isRefresh) {
        articles.value = list
      } else {
        articles.value = [...articles.value, ...list]
        // Increment page after successful load-more
        page.value++
      }
      hasMore.value = more
    } catch (error) {
      console.error('[useArticleList] loadArticles error:', error)
      uni.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      loading.value = false
      // Clear refresher triggered state after a short delay to avoid flicker
      if (isRefresh) {
        setTimeout(() => {
          refresherTriggered.value = false
        }, 100)
      }
    }
  }

  // --- Operations ---
  /**
   * Pull-to-refresh: reset and reload from page 1.
   */
  function refresh() {
    return loadArticles(true)
  }

  /**
   * Load more: fetch next page and append.
   */
  function loadMore() {
    if (hasMore.value && !loading.value) {
      loadArticles(false)
    }
  }

  /**
   * Update filters and refresh article list.
   * @param {Object} newFilters - Partial filter values to merge
   */
  function updateFilters(newFilters) {
    // Merge into active filters (either provided or internal)
    Object.keys(newFilters).forEach(key => {
      if (activeFilters[key] !== undefined) {
        activeFilters[key] = newFilters[key]
      }
    })
    // Refresh to apply new filters
    return loadArticles(true)
  }

  // --- Swipe state management ---
  const swipeShowIndex = ref(null)    // currently swiped item index
  const currentTouchIndex = ref(null)  // item being touched
  let touchStartX = 0
  let touchEndX = 0
  const touchThreshold = 50           // pixels to trigger swipe action

  /**
   * Handle touch start on an article item.
   * @param {number} index - Index of the touched item in the article list
   * @param {TouchEvent} e - Touch event
   */
  function onTouchStart(index, e) {
    currentTouchIndex.value = index
    touchStartX = e.changedTouches[0].clientX
  }

  /**
   * Handle touch move on an article item.
   * Prevents default scrolling while swiping.
   * @param {number} index - Index of the item
   * @param {TouchEvent} e - Touch event
   */
  function onTouchMove(index, e) {
    // No-op: prevent default handled by the template
  }

  /**
   * Handle touch end on an article item.
   * Determines swipe direction and shows/hides the action button.
   * @param {number} index - Index of the touched item
   * @param {TouchEvent} e - Touch event
   */
  function onTouchEnd(index, e) {
    touchEndX = e.changedTouches[0].clientX
    handleSwipe()
  }

  /**
   * Process the swipe based on start/end X coordinates.
   * Left swipe (diff > threshold) shows collect button.
   * Right swipe (diff < -threshold) hides it.
   */
  function handleSwipe() {
    const diff = touchStartX - touchEndX

    if (diff > touchThreshold) {
      // Left swipe: show collect button for the touched item
      swipeShowIndex.value = currentTouchIndex.value
    } else if (diff < -touchThreshold) {
      // Right swipe: hide
      swipeShowIndex.value = null
    }
  }

  /**
   * Toggle article collection status.
   * Adds or removes from localStorage collections and updates article status.
   * Requires user to be logged in.
   * @param {Object} article - Article object to collect/uncollect
   */
  function toggleCollect(article) {
    // Check if user is logged in using Pinia store (consistent with app-wide auth)
    const userStore = useUserStore()
    const openid = userStore.userId || uni.getStorageSync('openid')
    const token = userStore.token || uni.getStorageSync('token')

    if (!openid || !token) {
      uni.showModal({
        title: '提示',
        content: '登录后可使用收藏功能，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success(res) {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/login/login' })
          }
        }
      })
      return
    }

    const collections = uni.getStorageSync('collections') || []
    const existingIndex = collections.findIndex(c => c._id === article._id)

    if (existingIndex >= 0) {
      // Uncollect
      collections.splice(existingIndex, 1)
      uni.showToast({
        title: '已取消收藏',
        icon: 'none'
      })
    } else {
      // Collect
      collections.unshift({
        _id: article._id,
        title: article.title,
        sourceName: article.sourceName,
        publishTime: article.publishTime,
        collectTime: Date.now()
      })
      uni.showToast({
        title: '收藏成功',
        icon: 'success'
      })
      // Vibration feedback
      uni.vibrateShort()
    }

    uni.setStorageSync('collections', collections)

    // Close swipe
    swipeShowIndex.value = null
  }

  // --- Initial load ---
  if (autoLoad) {
    loadArticles()
  }

  return {
    // Expose articles as computed with isCollected status merged
    articles: articleList,
    // State
    loading,
    hasMore,
    refresherTriggered,
    // Filters - the reactive filter object (from useFilter or internal)
    filters: activeFilters,
    // Operations
    refresh,
    loadMore,
    updateFilters,
    toggleCollect,
    // Computed with raw + status
    articlesWithStatus,
    // Swipe state
    swipeShowIndex,
    currentTouchIndex,
    onTouchStart,
    onTouchEnd,
    onTouchMove: onTouchMove,
    // Pure function for external use
    checkIsCollected
  }
}

export default useArticleList

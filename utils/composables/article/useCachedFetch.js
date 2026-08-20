/**
 * useCachedFetch - Cache-first data fetching composable
 *
 * Wraps loadWithCache from @/utils/cache.js with a consistent TTL
 * and reactive state management for Vue 3 setup functions.
 *
 * Usage:
 *   const { data, loading, isStale, fetchWithCache } = useCachedFetch()
 *   await fetchWithCache('my-key', () => api.fetch(), 5 * 60 * 1000)
 */

import { ref } from 'vue'
import { loadWithCache } from '@/utils/cache.js'

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000

/**
 * Creates a cached fetch composable instance.
 * @returns {Object} { data, loading, isStale, fetchWithCache }
 */
export function useCachedFetch() {
  const data = ref(null)
  const loading = ref(false)
  const isStale = ref(false)

  /**
   * Fetch data with cache-first strategy.
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async fetch function
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   * @returns {Promise<{data, isStale}>}
   */
  async function fetchWithCache(key, fetchFn, ttl = DEFAULT_TTL) {
    loading.value = true
    isStale.value = false
    try {
      const result = await loadWithCache(key, fetchFn, ttl)
      data.value = result.data
      isStale.value = result.isStale
      return result
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    isStale,
    fetchWithCache
  }
}

export default useCachedFetch

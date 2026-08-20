/**
 * useFilter - Filter state management with URL persistence
 *
 * Manages filter state (category, tag, source, timeRange) with URL query
 * parameter sync for shareable links and navigation persistence.
 *
 * Filter sync strategy: Instant sync -- updates URL immediately on selection.
 * Filter persistence: None -- resets on mini-program close.
 *
 * Usage:
 *   const { filters, isDirty, parseUrlFilters, syncToUrl, updateFilter, ... } = useFilter({
 *     defaultFilters: { category: 'all', tag: '', sourceId: '', timeRange: '7d' },
 *     pageKey: 'index'
 *   })
 */

import { reactive, ref } from 'vue'

// Filter dimension keys (4D filtering)
export const FILTER_KEYS = ['sourceId', 'tag', 'timeRange', 'category']

// Time range options with labels
export const TIME_RANGE_LABELS = {
  '1d': '最近1天',
  '7d': '最近7天',
  '30d': '最近1个月',
  'all': '更久'
}

/**
 * Creates a filter composable instance.
 * @param {Object} pageOptions - { defaultFilters, pageKey }
 * @param {Object} pageOptions.defaultFilters - Initial filter values
 * @param {string} pageOptions.pageKey - Namespace for URL keys (e.g., 'index', 'collection')
 * @returns {Object} Filter composable API
 */
export function useFilter(pageOptions = {}) {
  const {
    defaultFilters = {
      sourceId: '',
      tag: '',
      timeRange: 'all',
      category: ''
    },
    pageKey = 'default'
  } = pageOptions

  // Reactive filter state
  const filters = reactive({ ...defaultFilters })

  // Track if filters have been modified but not yet applied
  const isDirty = ref(false)

  /**
   * Parse filters from URL query parameters.
   * Call this in onLoad to restore filter state from navigation.
   * @param {Object} options - { onQuery } where onQuery returns current page query
   * @returns {Object} Parsed filters object
   */
  function parseUrlFilters(options = {}) {
    const { onQuery } = options
    if (!onQuery) return filters

    try {
      const query = onQuery()
      const parsed = {}

      FILTER_KEYS.forEach(key => {
        const urlKey = `${pageKey}_${key}`
        if (query[urlKey] !== undefined && query[urlKey] !== '') {
          parsed[key] = query[urlKey]
        } else if (filters[key] !== undefined) {
          parsed[key] = filters[key]
        }
      })

      // Apply parsed values to reactive filters
      Object.keys(parsed).forEach(key => {
        filters[key] = parsed[key]
      })

      isDirty.value = false
      return parsed
    } catch (e) {
      console.error('[useFilter] parseUrlFilters error:', e)
      return filters
    }
  }

  /**
   * Build query object for URL navigation.
   * The page component is responsible for calling uni.navigateTo/reLaunch with this object.
   * @returns {Object} Query object suitable for uni.navigateTo
   */
  function syncToUrl() {
    const query = {}

    FILTER_KEYS.forEach(key => {
      const urlKey = `${pageKey}_${key}`
      const value = filters[key]

      // Only include non-empty, non-default values
      if (value && value !== '' && value !== 'all') {
        query[urlKey] = value
      }
    })

    return query
  }

  /**
   * Update a single filter value.
   * Sets isDirty to true since this is an instant-sync approach.
   * @param {string} key - Filter key (sourceId, tag, timeRange, category)
   * @param {string} value - New filter value
   */
  function updateFilter(key, value) {
    if (FILTER_KEYS.includes(key)) {
      filters[key] = value
      isDirty.value = true
    } else {
      console.warn(`[useFilter] Unknown filter key: ${key}`)
    }
  }

  /**
   * Reset all filters to default values.
   */
  function resetFilters() {
    FILTER_KEYS.forEach(key => {
      filters[key] = defaultFilters[key] !== undefined ? defaultFilters[key] : ''
    })
    isDirty.value = true
  }

  /**
   * Remove/clear a single filter.
   * @param {string} key - Filter key to remove
   */
  function removeFilter(key) {
    if (FILTER_KEYS.includes(key)) {
      filters[key] = defaultFilters[key] !== undefined ? defaultFilters[key] : ''
      isDirty.value = true
    }
  }

  /**
   * Get human-readable labels for currently active filters.
   * @param {Array} sources - Available sources list (each with id, name)
   * @param {Array} tags - Available tags list
   * @returns {Array} Array of { key, label } objects for active filters
   */
  function getActiveFilterTags(sources = [], tags = []) {
    const activeTags = []

    if (filters.category && filters.category !== '' && filters.category !== 'all') {
      activeTags.push({ key: 'category', label: filters.category })
    }

    if (filters.tag && filters.tag !== '') {
      const tagObj = tags.find(t => t.id === filters.tag || t.name === filters.tag)
      activeTags.push({ key: 'tag', label: tagObj ? tagObj.name : filters.tag })
    }

    if (filters.sourceId && filters.sourceId !== '') {
      const sourceObj = sources.find(s => s.id === filters.sourceId)
      activeTags.push({ key: 'sourceId', label: sourceObj ? sourceObj.name : filters.sourceId })
    }

    if (filters.timeRange && filters.timeRange !== '' && filters.timeRange !== '7d') {
      activeTags.push({ key: 'timeRange', label: TIME_RANGE_LABELS[filters.timeRange] || filters.timeRange })
    }

    return activeTags
  }

  return {
    filters,
    isDirty,
    parseUrlFilters,
    syncToUrl,
    updateFilter,
    resetFilters,
    removeFilter,
    getActiveFilterTags,
    FILTER_KEYS,
    TIME_RANGE_LABELS
  }
}

export default useFilter

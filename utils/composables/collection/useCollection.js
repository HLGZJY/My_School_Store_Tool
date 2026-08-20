/**
 * useCollection - Collection list state management composable
 *
 * Encapsulates collection loading, pagination, pull-to-refresh,
 * category/source filtering, batch selection, and batch delete operations.
 *
 * Usage:
 *   const {
 *     collections,       // ref: collection items
 *     loading,          // ref: loading state
 *     hasMore,          // ref: has more pages
 *     selectedIds,       // ref: Set of selected collection IDs
 *     selectedCount,    // computed: number of selected items
 *     hasSelected,      // computed: whether any item is selected
 *     currentCategory,  // ref: current category index
 *     loadCollections,  // function: load collections (optionally refresh)
 *     toggleSelect,     // function: toggle selection of an item
 *     clearSelection,   // function: clear all selections
 *     batchDelete       // function: delete selected collections
 *   } = useCollection({ pageSize: 20 })
 */

import { ref, computed } from 'vue'
import { articleApi } from '@/api/index.js'

/**
 * Create a useCollection composable instance.
 * @param {Object} options
 * @param {number} [options.pageSize=20] - Number of items per page
 * @returns {Object} Collection composable API
 */
export function useCollection(options = {}) {
  const { pageSize = 20 } = options

  // --- State ---
  const collections = ref([])
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(1)
  const selectedIds = ref(new Set())

  // Filter state
  const currentCategory = ref(0)
  const category = computed(() => {
    const categories = ['', 'notice', 'academic', 'activity', 'service']
    return categories[currentCategory.value] || ''
  })
  const sourceId = ref('')

  // --- Load collections ---
  async function loadCollections(isRefresh = false) {
    if (loading.value && !isRefresh) return

    const openid = uni.getStorageSync('openid')
    if (!openid) {
      // Not logged in, clear collections
      collections.value = []
      hasMore.value = false
      return
    }

    if (isRefresh) {
      page.value = 1
      collections.value = []
      hasMore.value = true
    }

    loading.value = true

    try {
      const res = await articleApi.getCollections({
        userId: openid,
        category: category.value,
        sourceId: sourceId.value,
        page: page.value,
        pageSize
      })

      const { collections: list, hasMore: more } = res
      const withSelected = list.map(c => ({ ...c, selected: false }))

      if (isRefresh) {
        collections.value = withSelected
      } else {
        collections.value = [...collections.value, ...withSelected]
        page.value++
      }

      hasMore.value = more
    } catch (error) {
      console.error('[useCollection] loadCollections error:', error)
      uni.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      loading.value = false
    }
  }

  // --- Category selection ---
  function selectCategory(index) {
    if (currentCategory.value === index) return
    currentCategory.value = index
    loadCollections(true)
  }

  // --- Source filter ---
  function setSourceFilter(id) {
    sourceId.value = id
    loadCollections(true)
  }

  // --- Selection ---
  function toggleSelect(id) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    // Sync selected state to collections
    collections.value = collections.value.map(c => ({
      ...c,
      selected: selectedIds.value.has(c._id)
    }))
  }

  function clearSelection() {
    selectedIds.value.clear()
    collections.value = collections.value.map(c => ({ ...c, selected: false }))
  }

  const selectedCount = computed(() => selectedIds.value.size)
  const hasSelected = computed(() => selectedIds.value.size > 0)

  // --- Batch delete ---
  async function batchDelete() {
    if (selectedIds.value.size === 0) return

    uni.showLoading({ title: '删除中...' })

    try {
      const openid = uni.getStorageSync('openid')
      await articleApi.batchUncollect(openid, Array.from(selectedIds.value))

      uni.showToast({
        title: '删除成功',
        icon: 'success'
      })

      // Remove deleted items from list
      collections.value = collections.value.filter(c => !selectedIds.value.has(c._id))
      clearSelection()

      // Reload to refresh
      loadCollections(true)
    } catch (error) {
      console.error('[useCollection] batchDelete error:', error)
      uni.showToast({
        title: '删除失败',
        icon: 'none'
      })
    } finally {
      uni.hideLoading()
    }
  }

  return {
    collections,
    loading,
    hasMore,
    selectedIds,
    selectedCount,
    hasSelected,
    currentCategory,
    loadCollections,
    toggleSelect,
    clearSelection,
    batchDelete,
    selectCategory,
    setSourceFilter
  }
}

export default useCollection

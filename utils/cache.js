/**
 * 数据缓存工具
 * 用于减少云函数调用次数，节省资源
 *
 * 缓存策略: cache-first (显示过期数据立即返回，后台异步刷新)
 *
 * 标准格式: {domain}_{identifier}_{action}
 * 例如: article_list_1_{filters}, article_detail_123, discover_hot_7d
 */

// 默认 TTL: 5分钟
const DEFAULT_TTL = 5 * 60 * 1000

/**
 * 缓存键常量
 * 格式: {domain}_{identifier}_{action}
 */
export const CACHE_KEYS = {
  // 文章列表: article_list_{page}_{filters}
  ARTICLE_LIST: (page, filters = {}) => `article_list_${page}_${JSON.stringify(filters)}`,

  // 文章详情: article_detail_{id}
  ARTICLE_DETAIL: (id) => `article_detail_${id}`,

  // 发现页热门: discover_hot_{timeRange}
  DISCOVER_HOT: (timeRange = '7d') => `discover_hot_${timeRange}`,

  // 发现页标签云: discover_tag_cloud
  DISCOVER_TAG_CLOUD: () => 'discover_tag_cloud',

  // 发现页时间线: discover_timeline_{timeRange}
  DISCOVER_TIMELINE: (timeRange = '7d') => `discover_timeline_${timeRange}`,

  // 搜索热门关键词: search_hot_keywords
  SEARCH_HOT_KEYWORDS: () => 'search_hot_keywords',

  // 收藏列表: collection_list
  COLLECTION_LIST: () => 'collection_list',

  // 消息列表: message_list
  MESSAGE_LIST: () => 'message_list',

  // 阅读历史: reading_history
  READING_HISTORY: () => 'reading_history'
}

/**
 * 从缓存获取数据
 * @param {string} key - 缓存键名
 * @returns {any|null} 缓存数据或null
 */
export function getCache(key) {
  try {
    const cached = uni.getStorageSync(key)
    if (!cached) return null

    const { time, data } = cached
    return { time, data }
  } catch (e) {
    console.error('[缓存] 读取失败:', e)
    return null
  }
}

/**
 * 设置缓存数据
 * @param {string} key - 缓存键名
 * @param {any} data - 要缓存的数据
 * @returns {boolean} 是否成功
 */
export function setCache(key, data) {
  try {
    uni.setStorageSync(key, {
      time: Date.now(),
      data
    })
    return true
  } catch (e) {
    console.error('[缓存] 写入失败:', e)
    return false
  }
}

/**
 * 清除指定缓存
 * @param {string} key - 缓存键名
 */
export function clearCache(key) {
  try {
    uni.removeStorageSync(key)
  } catch (e) {
    console.error('[缓存] 清除失败:', e)
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache() {
  try {
    const keys = [
      ...Object.keys(CACHE_KEYS).map(k => {
        // Generate actual keys that might exist
        const fn = CACHE_KEYS[k]
        return fn.length === 0 ? fn() : null
      }).filter(Boolean),
      // Also clear known patterns
      'cache_article_list',
      'cache_article_detail',
      'cache_discover_hot',
      'cache_discover_tags',
      'cache_search_hot',
      'cache_message_list',
      'cache_collection_list',
      'cache_detail_'
    ]

    keys.forEach(key => {
      if (key) uni.removeStorageSync(key)
    })
  } catch (e) {
    console.error('[缓存] 清除全部失败:', e)
  }
}

/**
 * 监听缓存失效事件，用于集中管理缓存失效
 */
const cacheListeners = new Map()

/**
 * 注册缓存监听器
 * @param {string} event - 事件名
 * @param {Function} callback - 回调函数
 */
export function registerCacheListener(event, callback) {
  if (!cacheListeners.has(event)) {
    cacheListeners.set(event, new Set())
  }
  cacheListeners.get(event).add(callback)
}

/**
 * 触发缓存失效事件
 * @param {string} event - 事件名
 * @param {any} data - 事件数据
 */
export function emitCacheEvent(event, data) {
  const listeners = cacheListeners.get(event)
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(data)
      } catch (e) {
        console.error('[缓存] 监听器执行失败:', e)
      }
    })
  }
}

/**
 * 带缓存的数据加载
 * 策略: cache-first (显示过期数据立即返回，后台异步刷新)
 *
 * @param {string} key - 缓存键名
 * @param {Function} fetchFn - 数据获取函数 (异步)
 * @param {number} ttl - 缓存时长，单位毫秒 (默认 5 分钟)
 * @returns {Promise<{data, isStale}>} 返回数据和是否过期
 */
export async function loadWithCache(key, fetchFn, ttl = DEFAULT_TTL) {
  // 先检查缓存
  const cached = getCache(key)

  if (cached) {
    const { time, data } = cached
    const age = Date.now() - time
    const isStale = age > ttl

    if (isStale) {
      // 缓存过期: 立即返回过期数据，后台异步刷新
      fetchFn().then(freshData => {
        if (freshData !== null && freshData !== undefined) {
          setCache(key, freshData)
        }
      }).catch(() => {
        // 后台刷新失败，静默处理
      })

      console.log(`[缓存] 命中(过期) ${key}, 数据 age: ${Math.floor(age / 1000)}s`)
      return { data, isStale: true }
    }

    // 缓存有效，直接返回
    console.log(`[缓存] 命中 ${key}, 数据 age: ${Math.floor(age / 1000)}s`)
    return { data, isStale: false }
  }

  // 无缓存: 获取新数据
  console.log(`[缓存] 未命中 ${key}, 请求网络`)
  const data = await fetchFn()

  // 写入缓存
  if (data !== null && data !== undefined) {
    setCache(key, data)
  }

  return { data, isStale: false }
}

export default {
  CACHE_KEYS,
  DEFAULT_TTL,
  getCache,
  setCache,
  clearCache,
  clearAllCache,
  registerCacheListener,
  emitCacheEvent,
  loadWithCache
}

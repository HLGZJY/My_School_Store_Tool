/**
 * 数据缓存工具
 * 用于减少云函数调用次数，节省资源
 */

// 缓存时长配置（毫秒）
const CACHE_DURATION = {
  DISCOVER: 10 * 60 * 1000,    // 发现页：10分钟
  DETAIL: 15 * 60 * 1000,       // 文章详情：15分钟
  MESSAGE: 2 * 60 * 1000,       // 消息列表：2分钟
  COLLECTION: 3 * 60 * 1000,    // 收藏列表：3分钟
  HOT_KEYWORDS: 10 * 60 * 1000  // 热门搜索：10分钟
}

/**
 * 从缓存获取数据
 * @param {string} key - 缓存键名
 * @returns {any|null} 缓存数据或null
 */
export function getCache(key) {
  try {
    const cached = uni.getStorageSync(`cache_${key}`)
    if (!cached) return null

    const { time, data } = cached
    return { time, data }
  } catch (e) {
    console.error('读取缓存失败:', e)
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
    uni.setStorageSync(`cache_${key}`, {
      time: Date.now(),
      data
    })
    return true
  } catch (e) {
    console.error('写入缓存失败:', e)
    return false
  }
}

/**
 * 清除指定缓存
 * @param {string} key - 缓存键名
 */
export function clearCache(key) {
  try {
    uni.removeStorageSync(`cache_${key}`)
  } catch (e) {
    console.error('清除缓存失败:', e)
  }
}

/**
 * 带缓存的数据加载
 * @param {string} key - 缓存键名
 * @param {number} durationType - 缓存时长类型，对应CACHE_DURATION的key
 * @param {Function} fetchFn - 数据获取函数
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<any>} 数据
 */
export async function loadWithCache(key, durationType, fetchFn, forceRefresh = false) {
  // 强制刷新时先清除缓存
  if (forceRefresh) {
    clearCache(key)
  }

  // 尝试从缓存获取
  const cached = getCache(key)
  if (cached && !forceRefresh) {
    const { time, data } = cached
    const age = Date.now() - time

    // 检查缓存是否过期
    if (age < CACHE_DURATION[durationType]) {
      console.log(`[缓存命中] ${key}, 缓存时长: ${Math.floor(age / 1000)}s`)
      return data
    }
    console.log(`[缓存过期] ${key}, 缓存时长: ${Math.floor(age / 1000)}s`)
  }

  // 获取新数据
  console.log(`[网络请求] ${key}`)
  const data = await fetchFn()

  // 写入缓存
  if (data !== null && data !== undefined) {
    setCache(key, data)
  }

  return data
}

/**
 * 清除所有页面相关缓存
 */
export function clearAllPageCache() {
  const keys = Object.keys(CACHE_DURATION)
  keys.forEach(key => {
    clearCache(key.toLowerCase())
  })
}

/**
 * 监听收藏变化事件，更新相关缓存
 */
export function registerCacheListener() {
  uni.$on('collectChange', () => {
    // 收藏状态变化时清除相关缓存
    clearCache('collection_list')
    clearCache('detail_')
  })
}

export default {
  CACHE_DURATION,
  getCache,
  setCache,
  clearCache,
  loadWithCache,
  clearAllPageCache,
  registerCacheListener
}

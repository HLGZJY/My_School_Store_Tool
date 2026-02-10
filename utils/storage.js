/**
 * 本地存储工具
 */

/**
 * 设置存储
 * @param {string} key 键
 * @param {any} value 值
 */
export function setStorage(key, value) {
    try {
        uni.setStorageSync(key, value)
        return true
    } catch (error) {
        console.error('设置存储失败:', error)
        return false
    }
}

/**
 * 获取存储
 * @param {string} key 键
 * @returns {any} 值
 */
export function getStorage(key) {
    try {
        return uni.getStorageSync(key)
    } catch (error) {
        console.error('获取存储失败:', error)
        return null
    }
}

/**
 * 移除存储
 * @param {string} key 键
 */
export function removeStorage(key) {
    try {
        uni.removeStorageSync(key)
        return true
    } catch (error) {
        console.error('移除存储失败:', error)
        return false
    }
}

/**
 * 清空存储
 */
export function clearStorage() {
    try {
        uni.clearStorageSync()
        return true
    } catch (error) {
        console.error('清空存储失败:', error)
        return false
    }
}

/**
 * 获取存储信息
 * @returns {Object} 存储信息
 */
export function getStorageInfo() {
    try {
        return uni.getStorageInfoSync()
    } catch (error) {
        console.error('获取存储信息失败:', error)
        return null
    }
}

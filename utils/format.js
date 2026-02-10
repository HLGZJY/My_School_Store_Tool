/**
 * 格式化时间
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间
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
 * 格式化日期
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的日期
 */
export function formatDate(timestamp) {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 格式化时长
 * @param {number} seconds 秒数
 * @returns {string} 格式化后的时长
 */
export function formatDuration(seconds) {
    if (!seconds) return '0秒'
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}分钟`
}

/**
 * 格式化数字
 * @param {number} num 数字
 * @returns {string} 格式化后的数字
 */
export function formatNumber(num) {
    if (!num) return '0'
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万'
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
}

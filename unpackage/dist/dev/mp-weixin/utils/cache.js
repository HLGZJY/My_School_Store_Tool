"use strict";
const common_vendor = require("../common/vendor.js");
const CACHE_DURATION = {
  DISCOVER: 10 * 60 * 1e3,
  // 发现页：10分钟
  DETAIL: 15 * 60 * 1e3,
  // 文章详情：15分钟
  MESSAGE: 2 * 60 * 1e3,
  // 消息列表：2分钟
  COLLECTION: 3 * 60 * 1e3,
  // 收藏列表：3分钟
  HOT_KEYWORDS: 10 * 60 * 1e3
  // 热门搜索：10分钟
};
function getCache(key) {
  try {
    const cached = common_vendor.index.getStorageSync(`cache_${key}`);
    if (!cached)
      return null;
    const { time, data } = cached;
    return { time, data };
  } catch (e) {
    console.error("读取缓存失败:", e);
    return null;
  }
}
function setCache(key, data) {
  try {
    common_vendor.index.setStorageSync(`cache_${key}`, {
      time: Date.now(),
      data
    });
    return true;
  } catch (e) {
    console.error("写入缓存失败:", e);
    return false;
  }
}
function clearCache(key) {
  try {
    common_vendor.index.removeStorageSync(`cache_${key}`);
  } catch (e) {
    console.error("清除缓存失败:", e);
  }
}
async function loadWithCache(key, durationType, fetchFn, forceRefresh = false) {
  if (forceRefresh) {
    clearCache(key);
  }
  const cached = getCache(key);
  if (cached && !forceRefresh) {
    const { time, data: data2 } = cached;
    const age = Date.now() - time;
    if (age < CACHE_DURATION[durationType]) {
      console.log(`[缓存命中] ${key}, 缓存时长: ${Math.floor(age / 1e3)}s`);
      return data2;
    }
    console.log(`[缓存过期] ${key}, 缓存时长: ${Math.floor(age / 1e3)}s`);
  }
  console.log(`[网络请求] ${key}`);
  const data = await fetchFn();
  if (data !== null && data !== void 0) {
    setCache(key, data);
  }
  return data;
}
exports.clearCache = clearCache;
exports.loadWithCache = loadWithCache;

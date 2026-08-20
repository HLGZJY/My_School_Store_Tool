import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/api/index'

export const useUserStore = defineStore('user', () => {
  // State as refs
  const userId = ref(null)
  const token = ref(null)
  const userInfo = ref(null)
  const entryType = ref(null)

  // Hydrate from AsyncStorage on init
  function hydrate() {
    // Use uni.getStorageSync for sync read on startup
    userId.value = uni.getStorageSync('openid') || null
    token.value = uni.getStorageSync('token') || null
    userInfo.value = uni.getStorageSync('userInfo') || null
    entryType.value = uni.getStorageSync('entryType') || null
  }

  // Persist to AsyncStorage (called on batch timer or page hide)
  function persist() {
    if (userId.value) {
      uni.setStorageSync('openid', userId.value)
    } else {
      uni.removeStorageSync('openid')
    }
    if (token.value) {
      uni.setStorageSync('token', token.value)
    } else {
      uni.removeStorageSync('token')
    }
    if (userInfo.value) {
      uni.setStorageSync('userInfo', userInfo.value)
    } else {
      uni.removeStorageSync('userInfo')
    }
    if (entryType.value) {
      uni.setStorageSync('entryType', entryType.value)
    } else {
      uni.removeStorageSync('entryType')
    }
  }

  // Computed
  const isLoggedIn = computed(() => !!token.value)

  // Actions
  async function login(code, userInfoParam) {
    const result = await userApi.login(code, userInfoParam)
    if (result.code === 0) {
      const { userId: uid, openid, token: t } = result.data
      userId.value = uid || openid
      token.value = t
      persist()
    }
    return result
  }

  async function logout() {
    userId.value = null
    token.value = null
    userInfo.value = null
    entryType.value = null
    uni.clearStorageSync()
  }

  // Call hydrate immediately on store creation
  hydrate()

  return { userId, token, userInfo, entryType, isLoggedIn, hydrate, persist, login, logout }
})

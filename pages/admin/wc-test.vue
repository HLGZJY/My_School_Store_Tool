<template>
  <view class="container">
    <view class="card">
      <view class="title">微信文章采集</view>

      <!-- 扫码登录区域 -->
      <view class="section" v-if="!credentialInfo">
        <view class="section-title">1. 扫码登录微信</view>

        <view v-if="!qrcodeUrl" class="qrbox">
          <button @click="getQrcode" :loading="loading" type="primary">获取登录二维码</button>
        </view>

        <view v-else class="qrbox">
          <image :src="qrcodeUrl" mode="widthFix" class="qrcode" />
          <text class="qr-tip">{{ scanStatusText }}</text>

          <view v-if="scanStatus === 0" class="waiting">
            <text>请使用手机微信扫描二维码登录</text>
          </view>

          <view v-if="scanStatus === 1" class="confirmed">
            <button @click="confirmLogin" :loading="loading" type="primary">点击确认登录</button>
          </view>

          <view v-if="scanStatus === 2" class="success">
            <text>登录成功！</text>
          </view>
        </view>
      </view>

      <!-- 已登录状态 -->
      <view class="section" v-if="credentialInfo">
        <view class="logged-in">
          <view class="user-info">
            <text class="label">当前公众号：</text>
            <text class="value">{{ credentialInfo.nickname || '已登录' }}</text>
          </view>
          <view class="user-info">
            <text class="label">过期时间：</text>
            <text class="value">{{ new Date(credentialInfo.expires).toLocaleDateString() }}</text>
          </view>
          <button @click="logout" :loading="loading">重新登录</button>
        </view>
      </view>

      <!-- 搜索公众号 -->
      <view class="section" v-if="credentialInfo">
        <view class="section-title">2. 搜索公众号</view>
        <view class="search-box">
          <input v-model="searchKeyword" placeholder="输入公众号名称" class="input" />
          <button @click="searchAccount" :loading="loading" size="mini">搜索</button>
        </view>

        <view v-if="accountList.length" class="account-list">
          <view
            v-for="(item, index) in accountList"
            :key="index"
            class="account-item"
            :class="{ selected: selectedAccount?.fakeid === item.fakeid }"
            @click="selectAccount(item)"
          >
            <image :src="item.round_head_img" class="avatar" />
            <view class="info">
              <text class="name">{{ item.nickname }}</text>
              <text class="fakeid">{{ item.alias || item.fakeid }}</text>
            </view>
            <uni-icons v-if="selectedAccount?.fakeid === item.fakeid" type="checkmark" color="#07C160" size="20" />
          </view>
        </view>
      </view>

      <!-- 文章列表 -->
      <view class="section" v-if="selectedAccount">
        <view class="section-title">3. {{ selectedAccount.nickname }} 的文章</view>
        <button @click="getArticleList" :loading="loading" size="mini">获取文章列表</button>

        <view v-if="articleList.length" class="article-list">
          <view
            v-for="(item, index) in articleList"
            :key="index"
            class="article-item"
            @click="downloadArticle(item)"
          >
            <view class="article-info">
              <text class="title">{{ item.title }}</text>
              <text class="time">{{ new Date(item.publish_time * 1000).toLocaleDateString() }}</text>
            </view>
            <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="cover" />
          </view>
        </view>
      </view>

      <!-- 同步按钮 -->
      <view class="section" v-if="selectedAccount">
        <button @click="syncArticles" :loading="loading" type="primary">同步所有文章到数据库</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      qrcodeUrl: '',
      sessionId: '',
      uuid: '', // 保存微信返回的 uuid cookie
      scanStatus: 0,
      scanStatusText: '等待获取二维码...',
      credentialInfo: null,
      searchKeyword: '',
      accountList: [],
      selectedAccount: null,
      articleList: [],
      pollTimer: null
    }
  },
  onLoad() {
    // 验证管理员权限
    const entryType = uni.getStorageSync('entryType')
    if (entryType !== 'admin') {
      uni.showToast({ title: '无权限访问', icon: 'none' })
      uni.navigateBack()
      return
    }

    // 检查本地是否有缓存的凭证
    const savedAuthKey = uni.getStorageSync('wc_authKey')
    if (savedAuthKey) {
      this.verifyCredential(savedAuthKey)
    }
  },
  onUnload() {
    // 页面关闭时停止轮询
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
    }
  },
  methods: {
    // 1. 获取二维码
    async getQrcode() {
      this.loading = true
      this.scanStatusText = '获取二维码中...'

      try {
        const res = await uniCloud.callFunction({
          name: 'wc-login',
          data: { action: 'get_qrcode' }
        })

        if (res.result && res.result.code === 0) {
          // 保存二维码和 uuid
          this.qrcodeUrl = res.result.data.qrcodeUrl
          this.sessionId = res.result.data.sessionId
          this.uuid = res.result.data.uuid || '' // 保存 uuid
          this.scanStatus = 0
          this.scanStatusText = '请使用手机微信扫描二维码'

          // 开始轮询扫码状态
          this.startPolling()
        } else {
          this.scanStatusText = '获取失败: ' + (res.result?.message || '未知错误')
        }
      } catch (e) {
        this.scanStatusText = '获取失败: ' + e.message
      }

      this.loading = false
    },

    // 2. 轮询扫码状态
    startPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
      }

      this.pollTimer = setInterval(async () => {
        if (this.scanStatus === 2) {
          clearInterval(this.pollTimer)
          return
        }

        try {
          const res = await uniCloud.callFunction({
            name: 'wc-login',
            data: {
              action: 'check_scan',
              sessionId: this.sessionId,
              uuid: this.uuid
            }
          })

          if (res.result.code === 0) {
            this.scanStatus = res.result.data.status
            this.scanStatusText = res.result.data.message

            if (this.scanStatus === 1) {
              // 已扫码，等待确认
            } else if (this.scanStatus === 2) {
              // 登录成功
              clearInterval(this.pollTimer)
              this.getAuthKey()
            }
          }
        } catch (e) {
          console.error('轮询失败:', e)
        }
      }, 2000) // 每2秒检查一次
    },

    // 3. 确认登录
    async confirmLogin() {
      this.loading = true

      try {
        const res = await uniCloud.callFunction({
          name: 'wc-login',
          data: {
            action: 'login_confirm',
            sessionId: this.sessionId,
            uuid: this.uuid
          }
        })

        if (res.result.code === 0) {
          this.scanStatus = 2
          this.scanStatusText = '登录成功!'
          // 直接使用返回的 authKey
          if (res.result.data.authKey) {
            this.authKey = res.result.data.authKey
            uni.setStorageSync('wc_authKey', this.authKey)
            this.verifyCredential(this.authKey)
          }
        } else {
          uni.showToast({ title: res.result.message, icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '确认失败', icon: 'none' })
      }

      this.loading = false
    },

    // 验证凭证
    async verifyCredential(authKey) {
      try {
        const res = await uniCloud.callFunction({
          name: 'wc-login',
          data: {
            action: 'get_credential',
            authKey: authKey
          }
        })

        if (res.result.code === 0) {
          this.credentialInfo = res.result.data
          this.authKey = authKey
          uni.setStorageSync('wc_authKey', authKey)
          uni.showToast({ title: '凭证有效', icon: 'success' })
        } else {
          this.credentialInfo = null
          uni.removeStorageSync('wc_authKey')
        }
      } catch (e) {
        this.credentialInfo = null
      }
    },

    // 退出登录
    logout() {
      uni.showModal({
        title: '确认',
        content: '确定要重新登录吗？',
        success: (res) => {
          if (res.confirm) {
            this.credentialInfo = null
            this.qrcodeUrl = ''
            this.sessionId = ''
            this.uuid = ''
            this.scanStatus = 0
            this.accountList = []
            this.selectedAccount = null
            this.articleList = []
            uni.removeStorageSync('wc_authKey')
          }
        }
      })
    },

    // 搜索公众号
    async searchAccount() {
      if (!this.searchKeyword || this.searchKeyword.trim().length < 2) {
        uni.showToast({ title: '请输入至少2个字符', icon: 'none' })
        return
      }

      this.loading = true

      try {
        const res = await uniCloud.callFunction({
          name: 'wc-search-account',
          data: {
            authKey: this.authKey,
            keyword: this.searchKeyword,
            size: 10
          }
        })

        if (res.result.code === 0) {
          this.accountList = res.result.data.list || []
          if (this.accountList.length === 0) {
            uni.showToast({ title: '未找到相关公众号', icon: 'none' })
          }
        } else {
          uni.showToast({ title: res.result.message, icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '搜索失败', icon: 'none' })
      }

      this.loading = false
    },

    // 选择公众号
    selectAccount(item) {
      this.selectedAccount = item
      this.articleList = []
    },

    // 获取文章列表
    async getArticleList() {
      if (!this.selectedAccount) return

      this.loading = true

      try {
        const res = await uniCloud.callFunction({
          name: 'wc-article-list',
          data: {
            authKey: this.authKey,
            fakeid: this.selectedAccount.fakeid,
            size: 20
          }
        })

        if (res.result.code === 0) {
          this.articleList = res.result.data.list || []
          uni.showToast({ title: `获取到 ${this.articleList.length} 篇文章`, icon: 'none' })
        } else {
          uni.showToast({ title: res.result.message, icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '获取失败', icon: 'none' })
      }

      this.loading = false
    },

    // 下载文章
    async downloadArticle(item) {
      uni.showToast({ title: '点击同步按钮批量下载', icon: 'none' })
    },

    // 同步到数据库
    async syncArticles() {
      if (!this.selectedAccount) return

      this.loading = true

      try {
        const res = await uniCloud.callFunction({
          name: 'wc-sync-articles',
          data: {
            authKey: this.authKey,
            fakeid: this.selectedAccount.fakeid,
            name: this.selectedAccount.nickname,
            category: 'notice',
            syncAll: false
          }
        })

        if (res.result.code === 0) {
          uni.showToast({ title: res.result.data.message, icon: 'success' })
        } else {
          uni.showToast({ title: res.result.message, icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '同步失败', icon: 'none' })
      }

      this.loading = false
    }
  }
}
</script>

<style>
.container {
  padding: 20rpx;
  min-height: 100vh;
  background: #f5f5f5;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30rpx;
}
.section {
  margin-bottom: 40rpx;
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #eee;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}
.qrbox {
  text-align: center;
}
.qrcode {
  width: 400rpx;
  margin: 20rpx auto;
  display: block;
}
.qr-tip {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}
.waiting, .confirmed, .success {
  padding: 20rpx;
  border-radius: 8rpx;
  margin-top: 20rpx;
}
.waiting {
  background: #E3F2FD;
  color: #1976D2;
}
.confirmed {
  background: #FFF3E0;
}
.success {
  background: #E8F5E9;
  color: #07C160;
}
.search-box {
  display: flex;
  gap: 20rpx;
}
.input {
  flex: 1;
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
}
.account-list, .article-list {
  margin-top: 20rpx;
}
.account-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}
.account-item.selected {
  background: #E8F5E9;
  border: 1rpx solid #07C160;
}
.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}
.info {
  flex: 1;
}
.name {
  font-size: 28rpx;
  font-weight: bold;
}
.fakeid {
  font-size: 24rpx;
  color: #999;
  display: block;
}
.article-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}
.article-info {
  flex: 1;
}
.title {
  font-size: 28rpx;
  display: block;
}
.time {
  font-size: 24rpx;
  color: #999;
}
.cover {
  width: 120rpx;
  height: 80rpx;
  border-radius: 8rpx;
}
.logged-in {
  background: #E8F5E9;
  padding: 30rpx;
  border-radius: 12rpx;
}
.user-info {
  display: flex;
  margin-bottom: 10rpx;
}
.label {
  font-size: 28rpx;
  color: #666;
}
.value {
  font-size: 28rpx;
  font-weight: bold;
}
</style>

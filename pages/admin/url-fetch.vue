<template>
  <view class="container">
    <view class="card">
      <view class="title">URL 抓取测试</view>
      <view class="desc">输入通知公告页面的 URL，测试能否抓取到具体内容</view>

      <!-- URL 输入 -->
      <view class="input-section">
        <input
          v-model="url"
          placeholder="请输入要抓取的 URL"
          class="url-input"
        />
        <button @click="handleFetch" :loading="loading" type="primary" class="fetch-btn">
          抓取
        </button>
      </view>

      <!-- 结果展示 -->
      <view v-if="result" class="result-section">
        <view class="result-title">抓取结果</view>

        <!-- AI 解析结果 -->
        <view v-if="result.parsed" class="parsed-result">
          <view class="result-item">
            <text class="label">标题：</text>
            <text class="value">{{ result.parsed.title || '未提取到' }}</text>
          </view>
          <view class="result-item">
            <text class="label">发布时间：</text>
            <text class="value">{{ result.parsed.publishTime || '未提取到' }}</text>
          </view>
          <view class="result-item">
            <text class="label">分类：</text>
            <text class="value">{{ result.parsed.category || '未分类' }}</text>
          </view>
          <view class="result-item">
            <text class="label">摘要：</text>
            <text class="value">{{ result.parsed.summary || '未提取到' }}</text>
          </view>
          <view class="result-item">
            <text class="label">是否有效：</text>
            <text :class="['value', result.parsed.isValid ? 'valid' : 'invalid']">
              {{ result.parsed.isValid ? '是' : '否' }}
            </text>
          </view>
          <view class="result-item">
            <text class="label">状态：</text>
            <text :class="['value', result.saveResult?.exists ? 'exists' : 'new']">
              {{ result.saveResult?.message }}
            </text>
          </view>

          <!-- 正文预览 -->
          <view class="content-preview">
            <text class="label">正文内容预览：</text>
            <view class="content-text">{{ result.parsed.content?.substring(0, 500) }}{{ result.parsed.content?.length > 500 ? '...' : '' }}</view>
          </view>
        </view>

        <!-- 错误信息 -->
        <view v-if="result.error" class="error-result">
          <text class="error-text">{{ result.error }}</text>
        </view>
      </view>

      <!-- 历史记录 -->
      <view class="history-section">
        <view class="history-title">测试历史</view>
        <view class="history-list">
          <view
            v-for="(item, index) in history"
            :key="index"
            class="history-item"
            @click="loadHistory(item)"
          >
            <text class="history-url">{{ item.url }}</text>
            <text :class="['history-status', item.status]">{{ item.statusText }}</text>
          </view>
          <view v-if="history.length === 0" class="empty-history">
            <text>暂无测试记录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      url: '',
      loading: false,
      result: null,
      history: [],
      fetchTimer: null  // 防抖定时器
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

    // 加载历史记录
    const savedHistory = uni.getStorageSync('url_fetch_history')
    if (savedHistory) {
      this.history = JSON.parse(savedHistory)
    }
  },
  onUnload() {
    // 清理定时器
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer)
    }
  },
  methods: {
    async handleFetch() {
      if (!this.url) {
        uni.showToast({ title: '请输入 URL', icon: 'none' })
        return
      }

      // 简单验证 URL 格式
      if (!this.url.startsWith('http://') && !this.url.startsWith('https://')) {
        uni.showToast({ title: '请输入以 http:// 或 https:// 开头的 URL', icon: 'none' })
        return
      }

      // 防抖：如果正在加载，忽略重复点击
      if (this.loading) {
        return
      }

      // 防抖：500ms 内重复点击会被忽略
      if (this.fetchTimer) {
        clearTimeout(this.fetchTimer)
      }

      this.fetchTimer = setTimeout(async () => {
        this.loading = true
        this.result = null

        // 获取登录状态
        const openid = uni.getStorageSync('openid')
        const entryType = uni.getStorageSync('entryType')
        console.log('[调试] openid:', openid)
        console.log('[调试] entryType:', entryType)

        try {
          const res = await uniCloud.callFunction({
            name: 'fetchUrl',
            data: {
              action: 'fetch',
              url: this.url,
              openid: openid  // 临时传递 openid
            },
            timeout: 120000  // 120秒超时（与云函数一致）
          })

          console.log('[调试] 响应:', JSON.stringify(res.result))

          if (res.result.code === 0) {
            this.result = res.result.data

            // 保存到历史记录
            this.saveHistory(this.url, res.result.data)
          } else if (res.result.code === 429) {
            // 速率限制
            uni.showToast({
              title: '请求过于频繁，请稍后再试',
              icon: 'none'
            })
          } else {
            uni.showToast({
              title: res.result.message || '抓取失败',
              icon: 'none'
            })

            // 保存错误到历史
            this.saveHistory(this.url, { error: res.result.message })
          }
        } catch (e) {
          console.error('[调试] 异常:', e)
          uni.showToast({
            title: '抓取失败: ' + e.message,
            icon: 'none'
          })

          this.saveHistory(this.url, { error: e.message })
        }

        this.loading = false
        this.fetchTimer = null
      }, 300)
    },

    saveHistory(url, result) {
      const status = result.parsed?.isValid ? 'success' : (result.error ? 'error' : 'draft')
      const statusText = result.saveResult?.exists ? '已存在' :
        (result.parsed?.isValid ? '已发布' :
          (result.error ? '失败' : '草稿'))

      const historyItem = {
        url,
        result,
        status,
        statusText,
        time: Date.now()
      }

      // 添加到开头（使用不可变模式）
      this.history = [historyItem, ...this.history]

      // 最多保存 10 条
      if (this.history.length > 10) {
        this.history = this.history.slice(0, 10)
      }

      // 保存到本地存储
      uni.setStorageSync('url_fetch_history', JSON.stringify(this.history))
    },

    loadHistory(item) {
      this.url = item.url
      this.result = item.result
    }
  }
}
</script>

<style lang="scss" scoped>
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
  margin-bottom: 10rpx;
}

.desc {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-bottom: 30rpx;
}

.input-section {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.url-input {
  flex: 1;
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.fetch-btn {
  width: 160rpx;
}

.result-section {
  margin-top: 30rpx;
  padding-top: 30rpx;
  border-top: 1rpx solid #eee;
}

.result-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.parsed-result {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
}

.result-item {
  display: flex;
  margin-bottom: 16rpx;
  font-size: 28rpx;

  .label {
    color: #666;
    width: 160rpx;
    flex-shrink: 0;
  }

  .value {
    flex: 1;
    color: #333;

    &.valid {
      color: #07C160;
    }

    &.invalid {
      color: #ff9500;
    }

    &.exists {
      color: #007AFF;
    }

    &.new {
      color: #07C160;
    }
  }
}

.content-preview {
  margin-top: 20rpx;

  .label {
    font-size: 28rpx;
    color: #666;
    display: block;
    margin-bottom: 10rpx;
  }

  .content-text {
    font-size: 26rpx;
    color: #333;
    line-height: 1.6;
    background: #fff;
    padding: 20rpx;
    border-radius: 8rpx;
    max-height: 400rpx;
    overflow: auto;
  }
}

.error-result {
  background: #FFEBEE;
  padding: 20rpx;
  border-radius: 8rpx;

  .error-text {
    color: #FF3B30;
    font-size: 28rpx;
  }
}

.history-section {
  margin-top: 40rpx;
  padding-top: 30rpx;
  border-top: 1rpx solid #eee;
}

.history-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.history-list {
  max-height: 400rpx;
  overflow: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 10rpx;

  .history-url {
    flex: 1;
    font-size: 24rpx;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 20rpx;
  }

  .history-status {
    font-size: 24rpx;
    padding: 4rpx 12rpx;
    border-radius: 4rpx;

    &.success {
      background: #E8F5E9;
      color: #07C160;
    }

    &.error {
      background: #FFEBEE;
      color: #FF3B30;
    }

    &.draft {
      background: #FFF3E0;
      color: #FF9500;
    }
  }
}

.empty-history {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}
</style>

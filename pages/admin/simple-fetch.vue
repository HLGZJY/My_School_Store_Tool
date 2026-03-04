<template>
  <view class="container">
    <view class="card">
      <view class="title">简化版 URL 抓取测试</view>
      <view class="desc">用于验证 Moonshot API 和 HTTP 请求是否正常</view>

      <!-- URL 输入 -->
      <view class="input-section">
        <input
          v-model="url"
          placeholder="请输入要测试的 URL"
          class="url-input"
        />
      </view>

      <!-- 模式选择 -->
      <view class="mode-section">
        <view class="mode-title">选择模式：</view>
        <radio-group @change="modeChange" class="mode-group">
          <label class="mode-item">
            <radio value="test-ai" :checked="mode === 'test-ai'" color="#07C160" />
            <text>AI解析测试（5篇）</text>
          </label>
          <label class="mode-item">
            <radio value="simple" :checked="mode === 'simple'" color="#07C160" />
            <text>简单 HTTP 请求</text>
          </label>
          <label class="mode-item">
            <radio value="kimi" :checked="mode === 'kimi'" color="#07C160" />
            <text>Kimi fetch 工具</text>
          </label>
          <label class="mode-item">
            <radio value="list" :checked="mode === 'list'" color="#07C160" />
            <text>列表页抓取（完整）</text>
          </label>
        </radio-group>
      </view>

      <!-- 测试按钮 -->
      <view class="btn-section">
        <button @click="handleTest" :loading="loading" type="primary" class="test-btn">
          {{ mode === 'list' ? '开始抓取' : '开始测试' }}
        </button>
        <button v-if="loading && mode === 'list'" @click="cancelFetch" class="cancel-btn">
          停止
        </button>
      </view>

      <!-- 进度显示 -->
      <view v-if="progress && mode === 'list'" class="progress-section">
        <view class="progress-title">抓取进度</view>
        <view class="progress-info">
          <text>状态：{{ progress.status === 'links_done' ? '已获取链接' : progress.status === 'processing' ? '处理中' : '已完成' }}</text>
        </view>
        <view class="progress-info">
          <text>进度：{{ progress.progress || progress.processed + '/' + progress.total }}</text>
        </view>
        <view v-if="progress.elapsed" class="progress-info">
          <text>已用时：{{ formatTime(progress.elapsed) }}</text>
        </view>
        <view v-if="progress.estimatedRemainingTime && progress.status === 'processing'" class="progress-info">
          <text>预计剩余：{{ formatTime(progress.estimatedRemainingTime) }}</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: (progress.processed / progress.total * 100) + '%' }"></view>
        </view>
      </view>

      <!-- 结果展示 -->
      <view v-if="result" class="result-section">
        <view class="result-title">测试结果</view>

        <!-- AI解析测试模式的结果 -->
        <view v-if="result.mode === 'test-ai'">
          <view class="result-item">
            <text class="label">总链接数：</text>
            <text class="value">{{ result.totalLinks }} 个</text>
          </view>
          <view class="result-item">
            <text class="label">已测试：</text>
            <text class="value">{{ result.tested }} 篇</text>
          </view>

          <!-- AI解析结果列表 -->
          <view v-if="result.results && result.results.length" class="ai-result-list">
            <view class="list-title">AI解析结果：</view>
            <view
              v-for="(item, index) in result.results"
              :key="index"
              class="ai-result-item"
            >
              <view class="ai-result-header">
                <text class="ai-index">{{ index + 1 }}.</text>
                <text :class="['ai-status', item.status]">{{ item.status === 'success' ? '解析成功' : '解析失败' }}</text>
              </view>

              <view v-if="item.data" class="ai-data">
                <view class="ai-field">
                  <text class="ai-label">标题：</text>
                  <text class="ai-value">{{ item.data.title || '-' }}</text>
                </view>
                <view class="ai-field">
                  <text class="ai-label">发布时间：</text>
                  <text class="ai-value">{{ item.data.publishTime || '-' }}</text>
                </view>
                <view class="ai-field">
                  <text class="ai-label">分类：</text>
                  <text class="ai-value">{{ item.data.category || '-' }}</text>
                </view>
                <view class="ai-field">
                  <text class="ai-label">紧急程度：</text>
                  <text class="ai-value">{{ item.data.urgency || '-' }}</text>
                </view>
                <view class="ai-field">
                  <text class="ai-label">摘要：</text>
                  <text class="ai-value">{{ item.data.summary || '-' }}</text>
                </view>
                <view class="ai-field">
                  <text class="ai-label">有效：</text>
                  <text class="ai-value">{{ item.data.isValid ? '是' : '否' }}</text>
                </view>
                <view class="ai-field">
                  <text class="ai-label">标签：</text>
                  <text class="ai-value">{{ (item.data.tags || []).join(', ') || '-' }}</text>
                </view>
              </view>

              <view v-if="item.error" class="ai-error">{{ item.error }}</view>
              <view class="ai-url">{{ item.url }}</view>
            </view>
          </view>
        </view>

        <!-- 列表页抓取模式的结果 -->
        <view v-else-if="result.mode === 'list'">
          <view class="result-item">
            <text class="label">发现文章：</text>
            <text class="value">{{ result.totalFound || 0 }} 篇</text>
          </view>
          <view class="result-item">
            <text class="label">已处理：</text>
            <text class="value">{{ result.processed || 0 }} 篇</text>
          </view>

          <!-- 文章列表 -->
          <view v-if="result.results && result.results.length" class="article-list">
            <view class="list-title">处理结果：</view>
            <view
              v-for="(item, index) in result.results"
              :key="index"
              class="article-item"
            >
              <view class="article-status">
                <text :class="['status-tag', item.status]">
                  {{ item.status === 'saved' ? '已保存' : item.status === 'exists' ? '已存在' : (item.error || '失败') }}
                </text>
              </view>
              <view class="article-title">{{ item.title || item.url }}</view>
              <view class="article-url">{{ item.url }}</view>
            </view>
          </view>
        </view>

        <!-- 其他模式的结果 -->
        <view v-else>
          <view class="result-item">
            <text class="label">状态：</text>
            <text :class="['value', result.success ? 'success' : 'error']">
              {{ result.success ? '成功' : '失败' }}
            </text>
          </view>
          <view v-if="result.error" class="result-item">
            <text class="label">错误：</text>
            <text class="value error-text">{{ result.error }}</text>
          </view>
          <view v-if="result.contentLength" class="result-item">
            <text class="label">内容长度：</text>
            <text class="value">{{ result.contentLength }} 字符</text>
          </view>
          <view v-if="result.content" class="content-section">
            <text class="label">内容预览：</text>
            <textarea
              class="content-textarea"
              :value="result.content?.substring(0, 2000)"
              :maxlength="2000"
              readonly
            />
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
      mode: 'test-ai',
      loading: false,
      result: null,
      progress: null, // 进度信息
      allLinks: [] // 所有链接缓存
    }
  },
  methods: {
    modeChange(e) {
      this.mode = e.detail.value
    },

    // 格式化时间
    formatTime(seconds) {
      if (seconds < 60) return `${seconds}秒`
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      if (mins < 60) return `${mins}分${secs}秒`
      const hours = Math.floor(mins / 60)
      const remainMins = mins % 60
      return `${hours}小时${remainMins}分`
    },

    async handleTest() {
      if (!this.url) {
        uni.showToast({ title: '请输入 URL', icon: 'none' })
        return
      }

      // 简单验证 URL 格式
      if (!this.url.startsWith('http://') && !this.url.startsWith('https://')) {
        uni.showToast({ title: '请输入以 http:// 或 https:// 开头的 URL', icon: 'none' })
        return
      }

      this.loading = true
      this.result = null
      this.progress = null
      this.allLinks = []

      try {
        // AI解析测试模式
        if (this.mode === 'test-ai') {
          await this.handleTestAiMode()
        } else if (this.mode === 'list') {
          // 列表页模式使用分步处理
          await this.handleListMode()
        } else {
          await this.handleSimpleMode()
        }
      } catch (e) {
        console.error('[simpleFetch] 异常:', e)
        uni.showToast({
          title: '抓取失败: ' + e.message,
          icon: 'none'
        })
      }

      this.loading = false
    },

    // 简单模式（直接调用）
    async handleSimpleMode() {
      const res = await uniCloud.callFunction({
        name: 'simpleFetch',
        data: {
          url: this.url,
          mode: this.mode,
          openid: uni.getStorageSync('openid')
        },
        timeout: 7200000 // 2小时
      })

      console.log('[simpleFetch] 响应:', res.result)

      if (res.result.code === 0) {
        this.result = res.result.data
        uni.showToast({
          title: res.result.data.success ? '抓取成功' : '抓取失败',
          icon: res.result.data.success ? 'success' : 'none'
        })
      } else {
        uni.showToast({
          title: res.result.message || '抓取失败',
          icon: 'none'
        })
      }
    },

    // AI解析测试模式
    async handleTestAiMode() {
      uni.showLoading({ title: '正在AI解析测试（5篇）...' })

      const res = await uniCloud.callFunction({
        name: 'simpleFetch',
        data: {
          url: this.url,
          mode: 'test-ai',
          maxPages: 10,
          openid: uni.getStorageSync('openid')
        },
        timeout: 7200000
      })

      uni.hideLoading()

      console.log('[simpleFetch] AI测试响应:', res.result)

      if (res.result.code === 0) {
        this.result = res.result.data
        uni.showToast({
          title: `测试完成，处理${res.result.data.tested}篇`,
          icon: 'success'
        })
      } else {
        uni.showToast({
          title: res.result.message || '测试失败',
          icon: 'none'
        })
      }
    },

    // 取消抓取
    cancelFetch() {
      this.loading = false
      uni.showToast({ title: '已停止', icon: 'none' })
    },

    // 列表页模式（分步处理）
    async handleListMode() {
      // 步骤1：先获取链接列表
      uni.showLoading({ title: '正在获取链接...' })

      const linksRes = await uniCloud.callFunction({
        name: 'simpleFetch',
        data: {
          url: this.url,
          mode: 'list',
          step: 'links',
          maxPages: 10,
          openid: uni.getStorageSync('openid')
        },
        timeout: 7200000
      })

      uni.hideLoading()

      if (linksRes.result.code !== 0) {
        uni.showToast({ title: linksRes.result.message || '获取链接失败', icon: 'none' })
        return
      }

      const linksData = linksRes.result.data
      this.allLinks = linksData.links || []

      // 显示获取结果和预估时间
      this.progress = {
        step: 'links',
        total: this.allLinks.length,
        estimatedTime: linksData.estimatedTime,
        status: 'links_done'
      }

      uni.showToast({
        title: `发现${this.allLinks.length}个链接，预计${this.formatTime(linksData.estimatedTime)}`,
        icon: 'none',
        duration: 3000
      })

      // 步骤2：逐批处理文章
      const batchSize = 10 // 每批处理10个
      let processedCount = 0
      const allResults = []

      while (processedCount < this.allLinks.length) {
        // 检查是否还在加载状态（用户可能取消了）
        if (!this.loading) break

        const processRes = await uniCloud.callFunction({
          name: 'simpleFetch',
          data: {
            url: this.url,
            mode: 'list',
            step: 'process',
            links: this.allLinks,
            startIndex: processedCount,
            limit: batchSize,
            openid: uni.getStorageSync('openid')
          },
          timeout: 7200000
        })

        if (processRes.result.code !== 0) {
          uni.showToast({ title: processRes.result.message || '处理失败', icon: 'none' })
          break
        }

        const data = processRes.result.data
        allResults.push(...(data.results || []))

        // 更新进度
        processedCount = data.processed
        this.progress = {
          step: 'processing',
          total: data.totalFound,
          processed: processedCount,
          progress: data.progress,
          elapsed: data.elapsed,
          estimatedRemainingTime: data.estimatedRemainingTime,
          status: data.hasMore ? 'processing' : 'done'
        }

        // 刷新结果展示
        this.result = {
          mode: 'list',
          totalFound: data.totalFound,
          processed: processedCount,
          results: allResults
        }

        // 如果处理完了，退出循环
        if (!data.hasMore) break

        // 否则继续处理下一批
        await new Promise(resolve => setTimeout(resolve, 500)) // 稍微间隔一下
      }

      this.progress.status = 'done'
      uni.showToast({
        title: `处理完成，共${processedCount}篇`,
        icon: 'success'
      })
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
  margin-bottom: 30rpx;
}

.url-input {
  width: 100%;
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.mode-section {
  margin-bottom: 30rpx;
}

.mode-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.mode-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.mode-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.btn-section {
  margin-bottom: 30rpx;
}

.progress-section {
  background: #f0f0f0;
  border-radius: 8rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}

.progress-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.progress-info {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.progress-bar {
  height: 16rpx;
  background: #e0e0e0;
  border-radius: 8rpx;
  overflow: hidden;
  margin-top: 12rpx;
}

.progress-fill {
  height: 100%;
  background: #07C160;
  transition: width 0.3s ease;
}

.test-btn {
  width: 100%;
  margin-bottom: 20rpx;
}

.cancel-btn {
  width: 100%;
  background: #FF3B30;
  color: #fff;
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

    &.success {
      color: #07C160;
    }

    &.error {
      color: #FF3B30;
    }
  }
}

.error-text {
  word-break: break-all;
}

.article-list {
  margin-top: 20rpx;
}

.list-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.article-item {
  background: #f9f9f9;
  padding: 16rpx;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}

.article-status {
  margin-bottom: 8rpx;
}

.status-tag {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;

  &.saved {
    background: #E8F5E9;
    color: #07C160;
  }

  &.exists {
    background: #E3F2FD;
    color: #007AFF;
  }

  &.failed {
    background: #FFEBEE;
    color: #FF3B30;
  }
}

.article-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.article-url {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-section {
  margin-top: 20rpx;

  .label {
    font-size: 28rpx;
    color: #666;
    display: block;
    margin-bottom: 10rpx;
  }

  .content-textarea {
    width: 100%;
    height: 300rpx;
    border: 1rpx solid #ddd;
    padding: 20rpx;
    border-radius: 8rpx;
    font-size: 24rpx;
    box-sizing: border-box;
  }
}

// AI解析测试结果样式
.ai-result-list {
  margin-top: 20rpx;
}

.list-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.ai-result-item {
  background: #f9f9f9;
  padding: 20rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.ai-result-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;

  .ai-index {
    font-size: 28rpx;
    font-weight: bold;
    margin-right: 12rpx;
  }

  .ai-status {
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    border-radius: 4rpx;

    &.success {
      background: #E8F5E9;
      color: #07C160;
    }

    &.parse_failed, &.fetch_failed {
      background: #FFEBEE;
      color: #FF3B30;
    }
  }
}

.ai-data {
  background: #fff;
  padding: 16rpx;
  border-radius: 6rpx;
  margin-bottom: 12rpx;
}

.ai-field {
  display: flex;
  font-size: 24rpx;
  margin-bottom: 8rpx;
  line-height: 1.5;

  .ai-label {
    color: #666;
    width: 140rpx;
    flex-shrink: 0;
  }

  .ai-value {
    color: #333;
    flex: 1;
    word-break: break-all;
  }
}

.ai-error {
  color: #FF3B30;
  font-size: 24rpx;
  margin-bottom: 8rpx;
}

.ai-url {
  font-size: 20rpx;
  color: #999;
  word-break: break-all;
}
</style>

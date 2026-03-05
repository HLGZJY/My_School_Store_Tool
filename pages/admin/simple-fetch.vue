<template>
  <view class="container">
    <!-- Tab 导航 -->
    <view class="tab-nav">
      <view
        class="tab-item"
        :class="{ active: currentTab === 0 }"
        @click="switchTab(0)"
      >链接提取</view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 1 }"
        @click="switchTab(1)"
      >文章解析</view>
    </view>

    <!-- Tab 1: 链接提取 -->
    <view v-show="currentTab === 0" class="card">
      <view class="title">链接提取</view>
      <view class="desc">从列表页提取链接并存入链接池</view>

      <!-- 数据源选择 -->
      <view class="input-section">
        <view class="label">选择数据源（可选）</view>
        <picker :range="sourceList" range-key="sourceName" @change="onSourceChange">
          <view class="picker-value">
            {{ selectedSource ? selectedSource.sourceName : '请选择数据源' }}
          </view>
        </picker>
      </view>

      <!-- URL 输入 -->
      <view class="input-section">
        <view class="label">列表页 URL</view>
        <input
          v-model="extractUrl"
          placeholder="请输入列表页 URL，如 https://www.scuec.edu.cn/..."
          class="url-input"
        />
      </view>

      <!-- 选项 -->
      <view class="option-section">
        <view class="option-item">
          <switch :checked="skipCheck" @change="skipCheck = !skipCheck" />
          <text>跳过 404 检测（速度更快）</text>
        </view>
      </view>

      <!-- 提取按钮 -->
      <view class="btn-section">
        <button @click="handleExtract" :loading="extractLoading" type="primary" class="action-btn">
          开始提取
        </button>
      </view>

      <!-- 提取结果 -->
      <view v-if="extractResult" class="result-section">
        <view class="result-title">提取结果</view>
        <view class="result-item">
          <text class="label">新增链接：</text>
          <text class="value success">{{ extractResult.newCount }} 个</text>
        </view>
        <view class="result-item">
          <text class="label">已存在：</text>
          <text class="value">{{ extractResult.existCount }} 个</text>
        </view>
        <view class="result-item">
          <text class="label">待处理：</text>
          <text class="value warning">{{ extractResult.pendingCount }} 个</text>
        </view>
      </view>
    </view>

    <!-- Tab 2: 文章解析 -->
    <view v-show="currentTab === 1" class="card">
      <view class="title">文章解析</view>
      <view class="desc">从链接池获取链接并 AI 解析存入文章库</view>

      <!-- 来源筛选 -->
      <view class="input-section">
        <view class="label">选择数据源（筛选）</view>
        <picker :range="sourceOptions" range-key="label" @change="onParseSourceChange">
          <view class="picker-value">
            {{ parseSourceId === '' ? '全部来源' : parseSourceName }}
          </view>
        </picker>
      </view>

      <!-- 处理数量 -->
      <view class="input-section">
        <view class="label">每次处理数量</view>
        <view class="limit-selector">
          <view
            v-for="l in [5, 10, 20, 50]"
            :key="l"
            :class="['limit-item', parseLimit === l ? 'active' : '']"
            @click="parseLimit = l"
          >{{ l }}</view>
        </view>
      </view>

      <!-- 解析按钮 -->
      <view class="btn-section">
        <button @click="handleParse" :loading="parseLoading" type="primary" class="action-btn">
          开始解析
        </button>
      </view>

      <!-- 解析进度 -->
      <view v-if="parseProgress" class="progress-section">
        <view class="progress-title">解析进度</view>
        <view class="progress-info">
          <text>已处理：{{ parseProgress.processed }} 篇</text>
        </view>
        <view class="progress-info">
          <text>成功：{{ parseProgress.success }} 篇</text>
        </view>
        <view class="progress-info">
          <text>失败：{{ parseProgress.failed }} 篇</text>
        </view>
        <view class="progress-info">
          <text>剩余待处理：{{ parseProgress.remainingCount }} 篇</text>
        </view>
      </view>

      <!-- 解析结果 -->
      <view v-if="parseResult" class="result-section">
        <view class="result-title">解析结果</view>
        <view class="result-item">
          <text class="label">处理统计：</text>
          <text class="value">成功 {{ parseResult.success }} 个，失败 {{ parseResult.failed }} 个</text>
        </view>

        <!-- 结果列表 -->
        <view v-if="parseResult.results && parseResult.results.length" class="result-list">
          <view
            v-for="(item, index) in parseResult.results"
            :key="index"
            class="result-item-card"
          >
            <view class="item-status">
              <text :class="['status-tag', item.status]">
                {{ item.status === 'saved' ? '已保存' : item.status === 'exists' ? '已存在' : '失败' }}
              </text>
            </view>
            <view class="item-title">{{ item.title || '-' }}</view>
            <view class="item-url">{{ item.url }}</view>
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
      currentTab: 0,
      // 提取相关
      extractUrl: '',
      extractLoading: false,
      extractResult: null,
      skipCheck: true,  // 默认跳过404检测，避免超时
      sourceList: [],
      selectedSource: null,
      // 解析相关
      parseLoading: false,
      parseResult: null,
      parseProgress: null,
      parseSourceId: '',
      parseSourceName: '',
      parseLimit: 10
    }
  },

  computed: {
    sourceOptions() {
      return [
        { label: '全部来源', value: '' },
        ...this.sourceList.map(s => ({ label: s.sourceName, value: s._id }))
      ]
    }
  },

  onLoad() {
    this.loadSources()
  },

  methods: {
    // 切换 Tab
    switchTab(index) {
      this.currentTab = index
    },

    // 加载数据源列表
    async loadSources() {
      try {
        const res = await uniCloud.callFunction({
          name: 'manageSources',
          data: { action: 'list' }
        })
        if (res.result.code === 0) {
          this.sourceList = res.result.data || []
        }
      } catch (e) {
        console.error('加载数据源失败:', e)
      }
    },

    // 选择数据源
    onSourceChange(e) {
      const index = e.detail.value
      if (index > 0) {
        this.selectedSource = this.sourceList[index - 1]
        this.extractUrl = this.selectedSource.url || ''
      } else {
        this.selectedSource = null
      }
    },

    // 解析页面选择数据源
    onParseSourceChange(e) {
      const index = e.detail.value
      if (index === 0) {
        this.parseSourceId = ''
        this.parseSourceName = ''
      } else {
        const source = this.sourceList[index - 1]
        this.parseSourceId = source._id
        this.parseSourceName = source.sourceName
      }
    },

    // 提取链接
    async handleExtract() {
      if (!this.extractUrl) {
        uni.showToast({ title: '请输入 URL', icon: 'none' })
        return
      }

      if (!this.extractUrl.startsWith('http://') && !this.extractUrl.startsWith('https://')) {
        uni.showToast({ title: '请输入以 http:// 或 https:// 开头的 URL', icon: 'none' })
        return
      }

      this.extractLoading = true
      this.extractResult = null

      try {
        const res = await uniCloud.callFunction({
          name: 'extractUrls',
          data: {
            sourceUrl: this.extractUrl,
            sourceId: this.selectedSource?._id || null,
            sourceName: this.selectedSource?.sourceName || null,
            skipCheck: this.skipCheck,
            openid: uni.getStorageSync('openid')
          },
          timeout: 7200000
        })

        console.log('[extractUrls] 响应:', res.result)

        if (res.result.code === 0) {
          this.extractResult = res.result.data
          uni.showToast({
            title: res.result.data.message || '提取完成',
            icon: 'success'
          })
        } else {
          uni.showToast({
            title: res.result.message || '提取失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('[extractUrls] 错误:', e)
        uni.showToast({
          title: '提取失败: ' + e.message,
          icon: 'none'
        })
      }

      this.extractLoading = false
    },

    // 解析文章
    async handleParse() {
      this.parseLoading = true
      this.parseResult = null
      this.parseProgress = null

      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: {
            sourceId: this.parseSourceId || null,
            limit: this.parseLimit,
            openid: uni.getStorageSync('openid')
          },
          timeout: 7200000
        })

        console.log('[parseArticles] 响应:', res.result)

        if (res.result.code === 0) {
          this.parseResult = res.result.data
          this.parseProgress = {
            processed: res.result.data.processed,
            success: res.result.data.success,
            failed: res.result.data.failed,
            remainingCount: res.result.data.remainingCount
          }
          uni.showToast({
            title: res.result.data.message || '解析完成',
            icon: 'success'
          })
        } else {
          uni.showToast({
            title: res.result.message || '解析失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('[parseArticles] 错误:', e)
        uni.showToast({
          title: '解析失败: ' + e.message,
          icon: 'none'
        })
      }

      this.parseLoading = false
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

.tab-nav {
  display: flex;
  background: #fff;
  border-radius: 16rpx 16rpx 0 0;
  overflow: hidden;
  margin-bottom: 2rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 30rpx;
  color: #666;
  background: #f5f5f5;

  &.active {
    color: #07C160;
    background: #fff;
    font-weight: bold;
    border-bottom: 4rpx solid #07C160;
  }
}

.card {
  background: #fff;
  border-radius: 0 0 16rpx 16rpx;
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

.label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.url-input {
  width: 100%;
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker-value {
  width: 100%;
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fff;
}

.option-section {
  margin-bottom: 30rpx;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 28rpx;
}

.limit-selector {
  display: flex;
  gap: 20rpx;
}

.limit-item {
  width: 100rpx;
  height: 60rpx;
  line-height: 60rpx;
  text-align: center;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;

  &.active {
    background: #07C160;
    color: #fff;
    border-color: #07C160;
  }
}

.btn-section {
  margin-bottom: 30rpx;
}

.action-btn {
  width: 100%;
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
    margin-bottom: 0;
  }

  .value {
    flex: 1;
    color: #333;

    &.success {
      color: #07C160;
    }

    &.warning {
      color: #FF9500;
    }
  }
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

.result-list {
  margin-top: 20rpx;
}

.result-item-card {
  background: #f9f9f9;
  padding: 16rpx;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}

.item-status {
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

  &.fetch_failed, &.parse_failed {
    background: #FFEBEE;
    color: #FF3B30;
  }
}

.item-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.item-url {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

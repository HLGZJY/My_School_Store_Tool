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

      <!-- 提取历史 -->
      <view class="history-section" v-if="extractHistory.length > 0">
        <view class="history-title">提取历史（链接池）</view>
        <view
          class="history-item"
          v-for="(item, index) in extractHistory"
          :key="index"
          @click="selectHistoryUrl(item)"
        >
          <view class="history-info">
            <text class="history-url">{{ item.sourceName || item.sourceId }} ({{ item.sourceUrl }})</text>
            <text class="history-time">{{ item.time }}</text>
          </view>
          <view class="history-stats">
            <text class="stat total">共 {{ item.totalCount }}</text>
            <text class="stat pending">待处理 {{ item.pendingCount }}</text>
            <text class="stat processed">已处理 {{ item.processedCount }}</text>
          </view>
        </view>
      </view>

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
      <view class="desc">从链接池选择链接并 AI 解析存入文章库</view>

      <!-- 刷新待处理链接列表 -->
      <view class="btn-section" style="margin-bottom: 20rpx;">
        <button @click="loadPendingLinks" :loading="loadingPending" size="mini" type="default">
          刷新链接池
        </button>
      </view>

      <!-- 待处理链接列表（按主链接分组） -->
      <view class="pending-section" v-if="pendingGroups.length > 0">
        <view class="pending-title">待处理链接（点击展开选择）</view>

        <view
          v-for="(group, gIndex) in pendingGroups"
          :key="gIndex"
          class="pending-group"
        >
          <view class="group-header" @click="toggleGroup(gIndex)">
            <view class="group-info">
              <checkbox
                :checked="isGroupAllSelected(gIndex)"
                @click.stop="toggleGroupAll(gIndex)"
              />
              <text class="group-name">{{ group.sourceName || group.sourceId }}</text>
              <text class="group-count">({{ group.totalCount }} 条)</text>
            </view>
            <text class="expand-icon">{{ expandedGroups.includes(gIndex) ? '▼' : '▶' }}</text>
          </view>

          <!-- 展开显示具体链接 -->
          <view v-if="expandedGroups.includes(gIndex) && group.links" class="group-links">
            <view
              v-for="link in (group.links || [])"
              :key="link._id"
              :class="['link-item', isLinkSelected(gIndex, link._id) ? 'selected' : '']"
              @click="toggleLinkSelection(gIndex, link._id)"
            >
              <view class="checkbox-wrapper">
                <checkbox :checked="isLinkSelected(gIndex, link._id)" />
              </view>
              <text class="link-url">{{ link.url }}</text>
            </view>
          </view>
        </view>

        <!-- 已选统计 -->
        <view class="selection-info" v-if="selectedLinkIds.length > 0">
          <text>已选择: {{ selectedLinkIds.length }} 条链接</text>
        </view>

        <!-- 提示 -->
        <view class="tip-info" v-if="pendingGroups.length > 0">
          <text>提示：每次建议选择5-10条，处理过多可能超时</text>
        </view>

        <!-- 解析按钮 -->
        <view class="btn-section">
          <button
            @click="handleParseSelected"
            :loading="parseLoading"
            :disabled="selectedLinkIds.length === 0"
            type="primary"
            class="action-btn"
          >
            {{ parseLoading ? '处理中...' : '解析选中链接 (' + selectedLinkIds.length + ')' }}
          </button>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-pending">
        <text>暂无待处理链接，请先提取链接</text>
      </view>

      <!-- 解析进度 -->
      <view v-if="parseProgress" class="progress-section">
        <view class="progress-title">解析进度</view>
        <view class="progress-info" v-if="parseProgress.filtered > 0">
          <text class="filtered">过滤已存在：{{ parseProgress.filtered }} 篇</text>
        </view>
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
      extractHistory: [],  // 提取历史记录
      // 解析相关
      parseLoading: false,
      loadingPending: false,
      parseResult: null,
      parseProgress: null,
      pendingGroups: [],  // 待处理链接分组
      expandedGroups: [],  // 展开的分组
      selectedLinks: {},   // 选中的链接 { groupIndex: [linkId1, linkId2, ...] }
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
    },
    selectedLinkIds() {
      const ids = []
      for (const gIndex in this.selectedLinks) {
        const selected = this.selectedLinks[gIndex]
        if (selected && selected.length > 0) {
          ids.push(...selected)
        }
      }
      return ids
    }
  },

  onLoad() {
    this.loadSources()
    this.loadExtractHistory()
  },

  onShow() {
    if (this.currentTab === 0) {
      this.loadExtractHistory()
    } else if (this.currentTab === 1) {
      this.loadPendingLinks()
    }
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

    // 加载提取历史（从 url_queue）
    async loadExtractHistory() {
      try {
        const res = await uniCloud.callFunction({
          name: 'extractUrls',
          data: { action: 'getHistory' }
        })
        if (res.result.code === 0) {
          // 格式化时间
          this.extractHistory = (res.result.data || []).map(item => ({
            ...item,
            time: this.formatTime(item.lastFetchTime),
            totalCount: item.totalCount,
            processedCount: item.processedCount,
            pendingCount: item.pendingCount,
            failedCount: item.failedCount
          }))
        }
      } catch (e) {
        console.error('加载提取历史失败:', e)
      }
    },

    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    },

    // 加载待处理链接列表
    async loadPendingLinks() {
      this.loadingPending = true
      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: { action: 'getPendingList' }
        })
        if (res.result.code === 0) {
          this.pendingGroups = res.result.data || []
          // 默认展开第一个分组
          if (this.pendingGroups.length > 0 && this.expandedGroups.length === 0) {
            this.expandedGroups = [0]
          }
        }
      } catch (e) {
        console.error('加载待处理链接失败:', e)
      }
      this.loadingPending = false
    },

    // 切换分组展开
    toggleGroup(gIndex) {
      const idx = this.expandedGroups.indexOf(gIndex)
      if (idx > -1) {
        this.expandedGroups.splice(idx, 1)
      } else {
        this.expandedGroups.push(gIndex)
      }
    },

    // 检查分组是否全选
    isGroupAllSelected(gIndex) {
      const group = this.pendingGroups[gIndex]
      if (!group || !group.links) return false
      const selected = this.selectedLinks[gIndex] || []
      return group.links.length > 0 && group.links.every(l => selected.includes(l._id))
    },

    // 切换分组全选
    toggleGroupAll(gIndex) {
      const group = this.pendingGroups[gIndex]
      if (!group || !group.links) return

      if (!this.selectedLinks[gIndex]) {
        this.$set(this.selectedLinks, gIndex, [])
      }

      const selected = this.selectedLinks[gIndex]
      const allSelected = group.links.every(l => selected.includes(l._id))

      if (allSelected) {
        // 取消全选
        this.selectedLinks[gIndex] = []
      } else {
        // 全选
        this.selectedLinks[gIndex] = group.links.map(l => l._id)
      }
    },

    // 检查链接是否选中
    isLinkSelected(gIndex, linkId) {
      const selected = this.selectedLinks[gIndex] || []
      return selected.includes(linkId)
    },

    // 切换链接选中状态
    toggleLinkSelection(gIndex, linkId) {
      if (!this.selectedLinks[gIndex]) {
        this.$set(this.selectedLinks, gIndex, [])
      }

      const selected = this.selectedLinks[gIndex]
      const idx = selected.indexOf(linkId)

      if (idx > -1) {
        selected.splice(idx, 1)
      } else {
        selected.push(linkId)
      }
    },

    // 获取选中的链接ID列表
    // 解析选中的链接
    async handleParseSelected() {
      const linkIds = this.selectedLinkIds
      if (linkIds.length === 0) {
        uni.showToast({ title: '请选择要解析的链接', icon: 'none' })
        return
      }

      this.parseLoading = true
      this.parseResult = null
      this.parseProgress = null

      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: {
            linkIds: linkIds,
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
          // 解析完成后刷新列表
          this.loadPendingLinks()
          // 清空选择
          this.selectedLinks = {}
          this.expandedGroups = []
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
    },

    // 选择数据源
    onSourceChange(e) {
      const index = e.detail.value
      if (index > 0) {
        this.selectedSource = this.sourceList[index - 1]
        this.extractUrl = this.selectedSource.config?.url || this.selectedSource.url || ''
      } else {
        this.selectedSource = null
      }
    },

    // 选择历史中的 URL
    selectHistoryUrl(item) {
      this.extractUrl = item.sourceUrl
      uni.showToast({
        title: '已选择: ' + (item.sourceName || item.sourceId),
        icon: 'none'
      })
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
          // 重新加载历史记录（从 url_queue 获取）
          this.loadExtractHistory()
          // 重新加载数据源列表
          this.loadSources()
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

.history-section {
  margin-bottom: 30rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.history-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.history-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}

.history-item:last-child {
  border-bottom: none;
}

.history-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.history-url {
  font-size: 24rpx;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 22rpx;
  color: #999;
  margin-left: 16rpx;
}

.history-stats {
  display: flex;
  gap: 12rpx;
}

.history-stats .stat {
  font-size: 20rpx;
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
}

.history-stats .stat.total {
  background: #F5F5F5;
  color: #666;
}

.history-stats .stat.pending {
  background: #FFF3E0;
  color: #FF9500;
}

.history-stats .stat.processed {
  background: #E8F5E9;
  color: #07C160;
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

.progress-info .filtered {
  color: #007AFF;
  font-weight: bold;
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

/* 待处理链接列表样式 */
.pending-section {
  margin-bottom: 30rpx;
}

.pending-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.pending-group {
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: #f9f9f9;
}

.group-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.group-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.group-count {
  font-size: 24rpx;
  color: #666;
}

.expand-icon {
  font-size: 24rpx;
  color: #999;
}

.group-links {
  max-height: 400rpx;
  overflow-y: auto;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.link-item.selected {
  background: #E3F2FD;
}

.checkbox-wrapper {
  flex-shrink: 0;
}

.link-url {
  font-size: 22rpx;
  color: #666;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-info {
  padding: 16rpx;
  background: #E3F2FD;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: #007AFF;
}

.empty-pending {
  text-align: center;
  padding: 60rpx 20rpx;
  color: #999;
  font-size: 28rpx;
}

.tip-info {
  text-align: center;
  padding: 16rpx;
  color: #FF9500;
  font-size: 24rpx;
  background: #FFF3E0;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}
</style>

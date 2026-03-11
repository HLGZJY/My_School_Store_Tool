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
      <view
        class="tab-item"
        :class="{ active: currentTab === 2 }"
        @click="switchTab(2)"
      >链接管理</view>
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

      <!-- 实时进度（轮询中显示） -->
      <view v-if="realTimeProgress && isPolling && realTimeProgress.status !== 'idle'" class="realtime-progress">
        <view class="realtime-header">
          <text class="realtime-title">实时进度</text>
          <text class="realtime-status">{{ realTimeProgress.status === 'processing' ? '处理中...' : realTimeProgress.status }}</text>
        </view>

        <!-- 进度条 -->
        <view class="progress-bar-wrapper">
          <view class="progress-bar">
            <view
              class="progress-bar-fill"
              :style="{ width: (realTimeProgress.total > 0 ? realTimeProgress.current / realTimeProgress.total * 100 : 0) + '%' }"
            ></view>
          </view>
          <text class="progress-percent">{{ realTimeProgress.total > 0 ? Math.round(realTimeProgress.current / realTimeProgress.total * 100) : 0 }}%</text>
        </view>

        <!-- 进度详情 -->
        <view class="progress-details">
          <view class="progress-row">
            <text class="progress-label">当前进度：</text>
            <text class="progress-value">{{ realTimeProgress.current }} / {{ realTimeProgress.total }} 条</text>
          </view>
          <view class="progress-row">
            <text class="progress-label">已用时间：</text>
            <text class="progress-value">{{ formatDuration(realTimeProgress.usedTime) }}</text>
          </view>
          <view class="progress-row">
            <text class="progress-label">处理速度：</text>
            <text class="progress-value">{{ formatSpeed(realTimeProgress.speed) }}</text>
          </view>
          <view class="progress-row">
            <text class="progress-label">预估剩余：</text>
            <text class="progress-value highlight">{{ formatDuration(realTimeProgress.estimatedLeft) }}</text>
          </view>
          <view class="progress-row" v-if="realTimeProgress.currentUrl">
            <text class="progress-label">正在处理：</text>
            <text class="progress-value url">{{ realTimeProgress.currentUrl }}</text>
          </view>
        </view>

        <!-- 预估超时时间 -->
        <view class="timeout-tip">
          <text>建议超时时间：{{ Math.round((realTimeProgress.estimatedLeft + 30000) / 1000) }} 秒</text>
        </view>
      </view>

      <!-- 等待任务开始 -->
      <view v-else-if="realTimeProgress && isPolling && realTimeProgress.status === 'idle'" class="waiting-section">
        <text class="waiting-text">等待任务开始...</text>
      </view>

      <!-- 解析进度（完成后显示） -->
      <view v-else-if="parseProgress && !isPolling" class="progress-section">
        <view class="progress-title">解析结果</view>
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
        <!-- 性能统计 -->
        <view class="performance-stats" v-if="parseProgress.usedTime">
          <view class="stat-item">
            <text class="stat-label">总用时：</text>
            <text class="stat-value">{{ formatDuration(parseProgress.usedTime) }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">平均速度：</text>
            <text class="stat-value">{{ formatSpeed(parseProgress.avgSpeed) }}</text>
          </view>
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

    <!-- Tab 3: 链接管理 -->
    <view v-show="currentTab === 2" class="card">
      <view class="title">链接管理</view>
      <view class="desc">查看和管理链接池中的所有链接</view>

      <!-- 筛选条件 -->
      <view class="filter-section">
        <view class="filter-item">
          <text class="filter-label">状态筛选：</text>
          <picker :range="statusOptions" @change="onStatusChange">
            <view class="picker-value">{{ selectedStatus === '' ? '全部' : statusMap[selectedStatus] }}</view>
          </picker>
        </view>
        <view class="filter-item">
          <button @click="loadAllLinks" size="mini" type="primary">刷新</button>
        </view>
      </view>

      <!-- 批量操作 -->
      <view class="batch-actions" v-if="manageSelectedLinks.length > 0">
        <text class="selected-count">已选择 {{ manageSelectedLinks.length }} 条</text>
        <button @click="batchDelete" size="mini" type="warn">批量删除</button>
      </view>

      <!-- 链接列表 -->
      <view class="link-list">
        <view
          v-for="link in allLinks"
          :key="link._id"
          :class="['link-item', link.isAbnormal ? 'abnormal' : '', selectedLinks.includes(link._id) ? 'selected' : '']"
        >
          <checkbox
            :checked="selectedLinks.includes(link._id)"
            @click="toggleSelectLink(link._id)"
          />
          <view class="link-info" @click="showLinkDetail(link)">
            <view class="link-url">{{ link.url }}</view>
            <view class="link-meta">
              <text class="link-source">{{ link.sourceName || link.sourceId || '未知' }}</text>
              <text :class="['link-status', link.status]">{{ statusMap[link.status] || link.status }}</text>
              <text v-if="link.isAbnormal" class="link-abnormal">长度异常</text>
            </view>
          </view>
          <view class="link-actions">
            <view v-if="link.isAbnormal" class="action-btn" @click="editLink(link)">修改</view>
            <view class="action-btn delete" @click="deleteLink(link._id)">删除</view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="allLinks.length === 0" class="empty-list">
          <text>暂无链接</text>
        </view>
      </view>

      <!-- 分页 -->
      <view class="pagination" v-if="linkTotal > linkPageSize">
        <button @click="prevPage" :disabled="linkPage <= 1" size="mini">上一页</button>
        <text class="page-info">{{ linkPage }} / {{ Math.ceil(linkTotal / linkPageSize) }}</text>
        <button @click="nextPage" :disabled="linkPage >= Math.ceil(linkTotal / linkPageSize)" size="mini">下一页</button>
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
      parseLimit: 10,
      // 链接管理相关
      allLinks: [],
      manageSelectedLinks: [],  // 批量选择的链接ID（管理页）
      linkPage: 1,
      linkPageSize: 30,
      linkTotal: 0,
      selectedStatus: '',
      statusOptions: ['全部', '待处理', '处理中', '已完成', '失败'],
      statusMap: {
        'pending': '待处理',
        'processing': '处理中',
        'processed': '已完成',
        'failed': '失败'
      },
      // 进度轮询相关
      taskToken: '',
      pollingTimer: null,
      realTimeProgress: null,  // 实时进度 { current, total, usedTime, speed, estimatedLeft, currentUrl, status }
      isPolling: false
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

  onUnload() {
    // 页面卸载时停止轮询
    this.stopPolling()
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
      this.realTimeProgress = null
      this.taskToken = linkIds[0] // 用第一个链接ID作为taskToken

      // 预估超时时间：每条链接 20 秒 + 30 秒缓冲
      const estimatedTimeout = linkIds.length * 20000 + 30000

      // 立即启动轮询，获取实时进度
      this.startPolling(this.taskToken)

      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: {
            action: 'startBatchProcess',
            linkIds: linkIds,
            openid: uni.getStorageSync('openid')
          },
          timeout: estimatedTimeout
        })

        console.log('[parseArticles] 响应:', res.result)

        // 无论是否返回成功，都等待轮询获取最新状态
        // 停止轮询会在 pollProgress 中自动处理
      } catch (e) {
        console.error('[parseArticles] 错误:', e)
        // 检查是否可能是超时但实际处理成功了，继续轮询
        if (e.message && (e.message.includes('timeout') || e.errMsg?.includes('timeout'))) {
          uni.showToast({
            title: '处理超时，轮询获取进度中...',
            icon: 'none',
            duration: 3000
          })
          // 继续轮询，让用户看到处理进度
          // 不停止轮询，让它继续运行
        } else {
          uni.showToast({
            title: '解析失败: ' + e.message,
            icon: 'none'
          })
          this.stopPolling()
        }
      }

      // parseLoading 在轮询完成前保持 true
    },

    // 开始轮询进度
    startPolling(taskToken) {
      this.taskToken = taskToken
      this.isPolling = true

      // 立即获取一次进度
      this.pollProgress()

      // 每 3 秒轮询一次
      this.pollingTimer = setInterval(() => {
        if (this.isPolling) {
          this.pollProgress()
        }
      }, 3000)
    },

    // 停止轮询
    stopPolling() {
      this.isPolling = false
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },

    // 轮询获取进度
    async pollProgress() {
      if (!this.taskToken) return

      // 获取所有选中的链接ID
      const linkIds = this.selectedLinkIds

      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: {
            action: 'getProgress',
            taskToken: this.taskToken,
            linkIds: linkIds
          }
        })

        console.log('[pollProgress] 响应:', res.result)

        if (res.result.code === 0 && res.result.data) {
          const progressData = res.result.data
          this.realTimeProgress = progressData

          // 如果状态是 idle，说明任务还没开始或云函数刚启动，继续等待
          if (progressData.status === 'idle') {
            console.log('[pollProgress] 任务等待中，继续轮询...')
            return
          }

          // 如果处理完成或失败，停止轮询
          if (progressData.status === 'completed' || progressData.status === 'failed') {
            this.stopPolling()
            this.parseLoading = false
            // 更新最终结果
            this.parseProgress = {
              processed: progressData.total,
              success: progressData.successCount,
              failed: progressData.failedCount,
              remainingCount: progressData.total - progressData.successCount - progressData.failedCount,
              usedTime: progressData.usedTime,
              avgSpeed: progressData.speed
            }
            this.loadPendingLinks()
            // 清空选择
            this.selectedLinks = {}
            this.expandedGroups = []
            uni.showToast({
              title: progressData.status === 'completed' ? '处理完成' : '处理失败',
              icon: progressData.status === 'completed' ? 'success' : 'none'
            })
            return
          }

          // status === 'processing' 时，继续显示进度
          console.log('[pollProgress] 处理中:', progressData.current, '/', progressData.total)
        }
      } catch (e) {
        console.error('[pollProgress] 错误:', e)
        // 轮询错误不停止，继续尝试
      }
    },

    // 格式化时间（毫秒转为 MM:SS）
    formatDuration(ms) {
      if (!ms || ms <= 0) return '0:00'
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    },

    // 格式化速度（毫秒/条转为 X秒/条）
    formatSpeed(ms) {
      if (!ms || ms <= 0) return '-'
      const seconds = Math.round(ms / 1000)
      return `${seconds}秒/条`
    },

    // ============ 链接管理方法 ============

    // 加载所有链接
    async loadAllLinks() {
      try {
        const res = await uniCloud.callFunction({
          name: 'extractUrls',
          data: {
            action: 'getAllLinks',
            page: this.linkPage,
            pageSize: this.linkPageSize,
            status: this.selectedStatus || undefined
          }
        })

        if (res.result.code === 0) {
          this.allLinks = res.result.data.list || []
          this.linkTotal = res.result.data.total || 0
        }
      } catch (e) {
        console.error('加载链接失败:', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },

    // 切换 Tab 时加载数据
    switchTab(index) {
      this.currentTab = index
      if (index === 2) {
        this.loadAllLinks()
        this.manageSelectedLinks = []
      }
    },

    // 状态筛选变化
    onStatusChange(e) {
      const index = e.detail.value
      if (index == 0) {
        this.selectedStatus = ''
      } else {
        this.selectedStatus = ['pending', 'processing', 'processed', 'failed'][index - 1]
      }
      this.linkPage = 1
      this.loadAllLinks()
    },

    // 切换链接选中状态
    toggleSelectLink(linkId) {
      const idx = this.manageSelectedLinks.indexOf(linkId)
      if (idx > -1) {
        this.manageSelectedLinks.splice(idx, 1)
      } else {
        this.manageSelectedLinks.push(linkId)
      }
    },

    // 批量删除
    batchDelete() {
      if (this.manageSelectedLinks.length === 0) return

      uni.showModal({
        title: '确认删除',
        content: `确定要删除选中的 ${this.manageSelectedLinks.length} 条链接吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const res = await uniCloud.callFunction({
                name: 'extractUrls',
                data: {
                  action: 'deleteLinks',
                  linkIds: this.manageSelectedLinks
                }
              })

              if (res.result.code === 0) {
                uni.showToast({ title: '删除成功', icon: 'success' })
                this.manageSelectedLinks = []
                this.loadAllLinks()
              } else {
                uni.showToast({ title: res.result.message, icon: 'none' })
              }
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 删除单个链接
    deleteLink(linkId) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该链接吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const res = await uniCloud.callFunction({
                name: 'extractUrls',
                data: {
                  action: 'deleteLink',
                  linkId: linkId
                }
              })

              if (res.result.code === 0) {
                uni.showToast({ title: '删除成功', icon: 'success' })
                this.loadAllLinks()
              } else {
                uni.showToast({ title: res.result.message, icon: 'none' })
              }
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 修改链接
    editLink(link) {
      uni.showModal({
        title: '修改链接',
        content: '请输入正确的链接地址',
        editable: true,
        confirmText: '保存',
        success: async (res) => {
          if (res.confirm && res.content && res.content !== link.url) {
            try {
              const res = await uniCloud.callFunction({
                name: 'extractUrls',
                data: {
                  action: 'updateLink',
                  linkId: link._id,
                  newUrl: res.content
                }
              })

              if (res.result.code === 0) {
                uni.showToast({ title: '更新成功', icon: 'success' })
                this.loadAllLinks()
              } else {
                uni.showToast({ title: res.result.message, icon: 'none' })
              }
            } catch (e) {
              uni.showToast({ title: '更新失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 查看链接详情
    showLinkDetail(link) {
      uni.showModal({
        title: '链接详情',
        content: `URL: ${link.url}\n状态: ${this.statusMap[link.status] || link.status}\n长度: ${link.url.length} 字符`,
        showCancel: false
      })
    },

    // 上一页
    prevPage() {
      if (this.linkPage > 1) {
        this.linkPage--
        this.loadAllLinks()
      }
    },

    // 下一页
    nextPage() {
      const totalPages = Math.ceil(this.linkTotal / this.linkPageSize)
      if (this.linkPage < totalPages) {
        this.linkPage++
        this.loadAllLinks()
      }
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

/* 实时进度样式 */
.realtime-progress {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 30rpx;
  color: #fff;
}

.realtime-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.realtime-title {
  font-size: 32rpx;
  font-weight: bold;
}

.realtime-status {
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.2);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.progress-bar {
  flex: 1;
  height: 16rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #fff;
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 28rpx;
  font-weight: bold;
  width: 80rpx;
  text-align: right;
}

.progress-details {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
  margin-bottom: 12rpx;
}

.progress-row:last-child {
  margin-bottom: 0;
}

.progress-label {
  opacity: 0.8;
}

.progress-value {
  font-weight: 500;
}

.progress-value.highlight {
  color: #FFD700;
  font-weight: bold;
}

.progress-value.url {
  font-size: 22rpx;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeout-tip {
  text-align: center;
  font-size: 22rpx;
  opacity: 0.8;
  padding: 8rpx;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4rpx;
}

.performance-stats {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #ddd;
}

.stat-item {
  display: flex;
  gap: 8rpx;
  font-size: 24rpx;
}

.stat-label {
  color: #666;
}

.stat-value {
  color: #07C160;
  font-weight: bold;
}

/* 等待任务样式 */
.waiting-section {
  text-align: center;
  padding: 40rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  margin-bottom: 30rpx;
}

.waiting-text {
  font-size: 28rpx;
  color: #666;
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

/* 链接管理样式 */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.filter-label {
  font-size: 26rpx;
  color: #666;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 16rpx;
  background: #FFF3E0;
  border-radius: 8rpx;
}

.selected-count {
  font-size: 26rpx;
  color: #FF9500;
}

.link-list {
  margin-bottom: 20rpx;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  background: #fff;
}

.link-item.selected {
  background: #E3F2FD;
}

.link-item.abnormal {
  background: #FFEBEE;
}

.link-info {
  flex: 1;
  overflow: hidden;
}

.link-url {
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}

.link-meta {
  display: flex;
  gap: 12rpx;
  font-size: 22rpx;
}

.link-source {
  color: #666;
}

.link-status {
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.link-status.pending {
  background: #FFF3E0;
  color: #FF9500;
}

.link-status.processing {
  background: #E3F2FD;
  color: #007AFF;
}

.link-status.processed {
  background: #E8F5E9;
  color: #07C160;
}

.link-status.failed {
  background: #FFEBEE;
  color: #FF3B30;
}

.link-abnormal {
  color: #FF3B30;
  font-weight: bold;
}

.link-actions {
  display: flex;
  gap: 8rpx;
}

.action-btn {
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  background: #07C160;
  color: #fff;
  border-radius: 4rpx;
}

.action-btn.delete {
  background: #FF3B30;
}

.empty-list {
  text-align: center;
  padding: 60rpx;
  color: #999;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
}

.page-info {
  font-size: 26rpx;
  color: #666;
}
</style>

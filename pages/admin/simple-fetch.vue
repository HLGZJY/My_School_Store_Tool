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

      <!-- 输入区域 - 优先展示 -->
      <view class="extract-input-section">
        <!-- 数据源选择 -->
        <view class="input-section">
          <view class="label-row">
            <text class="label">选择数据源</text>
            <text class="label-hint">（可选，用于自动填充URL）</text>
          </view>
          <picker :range="sourceList" range-key="sourceName" @change="onSourceChange">
            <view :class="['picker-value', selectedSource ? 'has-value' : '']">
              {{ selectedSource ? selectedSource.sourceName : '请选择数据源 ▼' }}
            </view>
          </picker>
        </view>

        <!-- URL 输入 -->
        <view class="input-section">
          <view class="label-row">
            <text class="label">列表页 URL</text>
            <text class="label-hint" v-if="selectedSource">已自动填充</text>
          </view>
          <input
            v-model="extractUrl"
            placeholder="请输入列表页 URL，如 https://www.scuec.edu.cn/..."
            class="url-input"
            :disabled="extractLoading"
          />
        </view>

        <!-- 选项 -->
        <view class="option-section">
          <view class="option-item">
            <switch :checked="skipCheck" @change="skipCheck = !skipCheck" color="#07C160" />
            <text>跳过 404 检测</text>
            <view class="help-icon" @click="showSkipHelp">?</view>
          </view>
        </view>

        <!-- 提取按钮 -->
        <view class="btn-section">
          <button @click="handleExtract" :loading="extractLoading" type="primary" class="action-btn">
            {{ extractLoading ? '提取中...' : '开始提取' }}
          </button>
        </view>
      </view>

      <!-- 提取结果 - 优先展示，带时间戳 -->
      <view v-if="extractResult" class="result-section">
        <view class="result-header">
          <view class="result-title">
            <text>提取结果</text>
            <text class="result-time">{{ lastExtractTime }}</text>
          </view>
        </view>
        <view class="result-grid">
          <view class="result-card success">
            <text class="result-num">{{ extractResult.newCount }}</text>
            <text class="result-label">新增链接</text>
          </view>
          <view class="result-card">
            <text class="result-num">{{ extractResult.existCount }}</text>
            <text class="result-label">已存在</text>
          </view>
          <view class="result-card warning">
            <text class="result-num">{{ extractResult.pendingCount }}</text>
            <text class="result-label">待处理</text>
          </view>
        </view>
      </view>

      <!-- 提取历史 - 折叠展示 -->
      <view class="history-section" v-if="extractHistory.length > 0">
        <view class="history-header" @click="toggleHistory">
          <text class="history-title">提取历史 ({{ extractHistory.length }})</text>
          <text class="expand-icon">{{ showHistory ? '▲' : '▼' }}</text>
        </view>
        <view v-if="showHistory" class="history-list">
          <view
            class="history-item"
            v-for="(item, index) in extractHistory"
            :key="index"
            @click="selectHistoryUrl(item)"
          >
            <view class="history-info">
              <text class="history-url">{{ item.sourceName || item.sourceId }}</text>
              <text class="history-time">{{ item.sourceUrl }}</text>
            </view>
            <view class="history-stats">
              <text class="stat total">{{ item.totalCount }}条</text>
              <text class="stat pending" v-if="item.pendingCount > 0">待{{ item.pendingCount }}</text>
              <text class="stat processed" v-if="item.processedCount > 0">已{{ item.processedCount }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab 2: 文章解析 -->
    <view v-show="currentTab === 1" class="card">
      <view class="title">文章解析</view>
      <view class="desc">从链接池选择链接并 AI 解析存入文章库</view>

      <!-- 待处理链接列表（按主链接分组） -->
      <view class="pending-section" v-if="pendingGroups.length > 0">
        <!-- 工具栏 -->
        <view class="pending-toolbar">
          <view class="toolbar-left">
            <text class="pending-title">待处理链接</text>
            <text class="pending-count">{{ getTotalPendingCount() }} 条</text>
          </view>
          <view class="toolbar-right">
            <button @click="loadPendingLinks" :loading="loadingPending" size="mini" type="default">
              刷新
            </button>
          </view>
        </view>

        <!-- 时间筛选行 -->
        <view class="time-filter-row">
          <text class="filter-label">时间筛选:</text>
          <picker mode="date" :value="filterStartDate" @change="onFilterStartChange" placeholder="开始日期">
            <view class="date-picker-value">
              {{ filterStartDate || "开始日期" }}
            </view>
          </picker>
          <text class="filter-sep">-</text>
          <picker mode="date" :value="filterEndDate" @change="onFilterEndChange" placeholder="结束日期">
            <view class="date-picker-value">
              {{ filterEndDate || "结束日期" }}
            </view>
          </picker>
          <view class="filter-clear-btn" @click="clearTimeFilter" v-if="filterStartDate || filterEndDate">清除</view>
        </view>

        <!-- 全选操作栏 -->
        <view class="select-actions" v-if="filteredPendingGroups.length > 0">
          <view class="select-btn" @click="selectAllInPage">
            <text>全选当前页</text>
          </view>
          <view class="select-btn" @click="selectAll">
            <text>全选全部</text>
          </view>
          <view class="select-btn clear" @click="clearSelection" v-if="selectedLinkIds.length > 0">
            <text>清空选择</text>
          </view>
        </view>

        <view
          v-for="(group, gIndex) in filteredPendingGroups"
          :key="gIndex"
          class="pending-group"
          :class="{ expanded: expandedGroups.includes(gIndex) }"
        >
          <!-- 分组 Header -->
          <view class="group-header" @click="toggleGroup(gIndex)">
            <view class="group-info">
              <checkbox
                :checked="isGroupAllSelected(gIndex)"
                @click.stop="toggleGroupAll(gIndex)"
              />
              <text class="group-name">{{ group.sourceName || group.sourceId }}</text>
              <text class="group-count">({{ group.totalCount }})</text>
            </view>
            <view class="group-right">
              <text class="selected-hint" v-if="getGroupSelectedCount(gIndex) > 0">
                已选 {{ getGroupSelectedCount(gIndex) }}
              </text>
              <text class="expand-icon">{{ expandedGroups.includes(gIndex) ? '▼' : '▶' }}</text>
            </view>
          </view>

          <!-- 展开显示具体链接 -->
          <view v-if="expandedGroups.includes(gIndex) && group.links" class="group-links">
            <view
              v-for="link in (group.links || [])"
              :key="link._id"
              :class="['link-item', isLinkSelected(gIndex, link._id) ? 'selected' : '']"
              @click="toggleLinkSelection(gIndex, link._id)"
            >
              <checkbox
                :checked="isLinkSelected(gIndex, link._id)"
                @click.stop="toggleLinkSelection(gIndex, link._id)"
                class="link-checkbox"
              />
              <view class="link-content">
                <text class="link-url">{{ link.url }}</text>
                <view class="link-meta">
                  <text class="link-source">{{ link.sourceName || link.sourceId || "未知" }}</text>
                  <text v-if="link.publishTime" class="link-publish-time">{{ link.publishTime }}</text>
                  <text v-else-if="link.fetchTime" class="link-fetch-time">{{ formatFetchTime(link.fetchTime) }}</text>
                  <text :class="'link-status ' + link.status">{{ statusMap[link.status] || link.status }}</text>
                  <text v-if="link.isAbnormal" class="link-abnormal">长度异常</text>
                </view>
                <view class="link-title" v-if="link.url">
                  <text v-if="titleLoading[link.url]" class="title-loading">加载中...</text>
                  <text v-else-if="titles[link.url]" class="title-text">{{ titles[link.url] }}</text>
                  <text v-else class="title-none" @click.stop="fetchTitle(link.url)">点击获取标题</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 已选统计 - 动态警告 -->
        <view class="selection-info" :class="{ warning: selectedLinkIds.length > 10, danger: selectedLinkIds.length > 20 }" v-if="selectedLinkIds.length > 0">
          <text v-if="selectedLinkIds.length <= 10">已选择 {{ selectedLinkIds.length }} 条链接</text>
          <text v-else-if="selectedLinkIds.length <= 20">已选择 {{ selectedLinkIds.length }} 条，处理时间可能较长</text>
          <text v-else>已选择 {{ selectedLinkIds.length }} 条，建议控制在 20 条以内</text>
        </view>

        <!-- 解析按钮 -->
        <view class="btn-section">
          <button
            @click="handleParseSelected"
            :loading="parseLoading"
            :disabled="selectedLinkIds.length === 0"
            type="primary"
            class="action-btn"
            :class="{ disabled: selectedLinkIds.length === 0 }"
          >
            {{ parseLoading ? '处理中...' : '解析选中链接 (' + selectedLinkIds.length + ')' }}
          </button>
        </view>
      </view>

      <!-- 失败链接管理 -->
      <view class="failed-section" v-if="failedGroups.length > 0">
        <view class="failed-header" @click="toggleFailedSection">
          <view class="failed-title-row">
            <text class="failed-title">失败链接</text>
            <text class="failed-count">{{ getTotalFailedCount() }} 条</text>
          </view>
          <text class="expand-icon">{{ showFailedSection ? '▲' : '▼' }}</text>
        </view>

        <view v-if="showFailedSection" class="failed-content">
          <!-- 全选操作栏 -->
          <view class="select-actions" v-if="failedGroups.length > 0">
            <view class="select-btn" @click="selectAllFailedInPage">
              <text>全选当前页</text>
            </view>
            <view class="select-btn" @click="selectAllFailed">
              <text>全选全部</text>
            </view>
            <view class="select-btn clear" @click="clearFailedSelection" v-if="selectedFailedIds.length > 0">
              <text>清空选择</text>
            </view>
          </view>

          <view
            v-for="(group, gIndex) in failedGroups"
            :key="'f_' + gIndex"
            class="pending-group failed-group"
            :class="{ expanded: expandedFailedGroups.includes(gIndex) }"
          >
            <!-- 分组 Header -->
            <view class="group-header" @click="toggleFailedGroup(gIndex)">
              <view class="group-info">
                <checkbox
                  :checked="isFailedGroupAllSelected(gIndex)"
                  @click.stop="toggleFailedGroupAll(gIndex)"
                />
                <text class="group-name">{{ group.sourceName || group.sourceId }}</text>
                <text class="group-count">({{ group.totalCount }})</text>
              </view>
              <view class="group-right">
                <text class="selected-hint" v-if="getFailedGroupSelectedCount(gIndex) > 0">
                  已选 {{ getFailedGroupSelectedCount(gIndex) }}
                </text>
                <text class="expand-icon">{{ expandedFailedGroups.includes(gIndex) ? '▼' : '▶' }}</text>
              </view>
            </view>

            <!-- 展开显示具体链接 -->
            <view v-if="expandedFailedGroups.includes(gIndex) && group.links" class="group-links">
              <view
                v-for="link in group.links"
                :key="link._id"
                :class="['link-item', 'failed-link', selectedFailedIds.includes(link._id) ? 'selected' : '']"
                @click="toggleFailedLinkSelection(link._id)"
              >
                <checkbox
                  :checked="selectedFailedIds.includes(link._id)"
                  @click.stop="toggleFailedLinkSelection(link._id)"
                  class="link-checkbox"
                />
                <view class="link-content">
                  <text class="link-url">{{ link.url }}</text>
                  <view class="link-meta">
                    <text class="link-source">{{ link.sourceName || link.sourceId || "未知" }}</text>
                    <text class="link-error">{{ link.error || '解析失败' }}</text>
                    <text class="link-retry" v-if="link.retryCount > 0">重试{{ link.retryCount }}次</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 已选统计 -->
          <view class="selection-info warning" v-if="selectedFailedIds.length > 0">
            <text>已选择 {{ selectedFailedIds.length }} 条失败链接</text>
          </view>

          <!-- 重试按钮 -->
          <view class="btn-section">
            <button
              @click="handleRetryFailed"
              :loading="retryLoading"
              :disabled="selectedFailedIds.length === 0"
              type="warn"
              class="action-btn"
              :class="{ disabled: selectedFailedIds.length === 0 }"
            >
              {{ retryLoading ? '重试中...' : '重试选中链接 (' + selectedFailedIds.length + ')' }}
            </button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="pendingGroups.length === 0 && !loadingFailed" class="empty-pending">
        <text>暂无待处理链接</text>
        <text class="empty-hint">请先在「链接提取」中添加链接</text>
      </view>

      <!-- 实时进度 / 解析结果 -->
      <view v-if="realTimeProgress || parseProgress" class="result-area">
        <!-- 实时进度 -->
        <view v-if="realTimeProgress && isPolling && realTimeProgress.status !== 'idle'" class="realtime-progress">
          <view class="realtime-header">
            <text class="realtime-title">正在解析</text>
            <text class="realtime-status">{{ realTimeProgress.status === 'processing' ? '处理中...' : realTimeProgress.status }}</text>
          </view>

          <!-- 进度条 -->
          <view class="progress-bar-wrapper">
            <view class="progress-bar">
              <view
                class="progress-bar-fill processing"
                :style="{ width: (realTimeProgress.total > 0 ? realTimeProgress.current / realTimeProgress.total * 100 : 0) + '%' }"
              ></view>
            </view>
            <text class="progress-percent">{{ realTimeProgress.total > 0 ? Math.round(realTimeProgress.current / realTimeProgress.total * 100) : 0 }}%</text>
          </view>

          <!-- 进度详情 -->
          <view class="progress-details">
            <view class="progress-row">
              <text class="progress-label">进度：</text>
              <text class="progress-value">{{ realTimeProgress.current }} / {{ realTimeProgress.total }} 条</text>
            </view>
            <view class="progress-row" v-if="realTimeProgress.currentUrl">
              <text class="progress-label">正在处理：</text>
              <text class="progress-value url">{{ realTimeProgress.currentUrl }}</text>
            </view>
            <view class="progress-row">
              <text class="progress-label">预估剩余：</text>
              <text class="progress-value highlight">{{ formatDuration(realTimeProgress.estimatedLeft) }}</text>
            </view>
          </view>
        </view>

        <!-- 等待任务开始 -->
        <view v-else-if="realTimeProgress && isPolling && realTimeProgress.status === 'idle'" class="waiting-section">
          <text class="waiting-text">等待任务开始...</text>
        </view>

        <!-- 解析结果 -->
        <view v-if="parseProgress && !isPolling" class="parse-result">
          <view class="result-header">
            <text class="result-title">解析完成</text>
            <text class="result-time" v-if="parseProgress.usedTime">用时 {{ formatDuration(parseProgress.usedTime) }}</text>
          </view>
          <view class="result-summary">
            <view class="summary-item success">
              <text class="summary-num">{{ parseProgress.success }}</text>
              <text class="summary-label">成功</text>
            </view>
            <view class="summary-item failed" v-if="parseProgress.failed > 0">
              <text class="summary-num">{{ parseProgress.failed }}</text>
              <text class="summary-label">失败</text>
            </view>
            <view class="summary-item filtered" v-if="parseProgress.filtered > 0">
              <text class="summary-num">{{ parseProgress.filtered }}</text>
              <text class="summary-label">已存在</text>
            </view>
          </view>
          <view class="result-tip" v-if="parseProgress.remainingCount > 0">
            <text>还有 {{ parseProgress.remainingCount }} 条待处理</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab 3: 链接管理 -->
    <view v-show="currentTab === 2" class="card">
      <view class="title">链接管理</view>
      <view class="desc">查看和管理链接池中的所有链接</view>

      <!-- 筛选工具栏 -->
      <view class="filter-bar">
        <view class="filter-left">
          <picker :range="statusOptions" :value="statusIndex" @change="onStatusChange">
            <view class="filter-picker">
              <text>{{ selectedStatus === '' ? '全部状态' : statusMap[selectedStatus] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="filter-right">
          <view class="date-range-filter">
            <picker mode="date" :value="tab2FilterStart" @change="onTab2StartChange">
              <view class="mini-picker">{{ tab2FilterStart || "开始" }}</view>
            </picker>
            <text class="range-sep">-</text>
            <picker mode="date" :value="tab2FilterEnd" @change="onTab2EndChange">
              <view class="mini-picker">{{ tab2FilterEnd || "结束" }}</view>
            </picker>
            <view class="clear-btn" @click="clearTab2Filter" v-if="tab2FilterStart || tab2FilterEnd">×</view>
          </view>
        </view>
      </view>

      <!-- 全选操作栏 -->
      <view class="batch-bar">
        <view class="batch-info">
          <view class="action-icon" @click="selectAllPage">全选</view>
          <view class="action-icon" @click="loadAllLinks">刷新</view>
        </view>
      </view>

      <!-- 批量操作栏 - 始终显示 -->
      <view class="batch-bar" :class="{ active: manageSelectedLinks.length > 0 }">
        <view class="batch-info" v-if="manageSelectedLinks.length > 0">
          <text class="batch-count">已选择 {{ manageSelectedLinks.length }} 条</text>
          <view class="batch-btn reset" @click="batchResetStatus">重置状态</view>
          <view class="batch-btn delete" @click="batchDelete">批量删除</view>
          <view class="batch-btn clear" @click="clearManageSelection">清空</view>
        </view>
        <view class="batch-info" v-else>
          <text class="batch-hint">点击链接可选择，支持批量操作</text>
        </view>
      </view>

      <!-- 链接列表 -->
      <view class="link-list">
        <view
          v-for="link in allLinks"
          :key="link._id"
          :class="['link-item', link.isAbnormal ? 'abnormal' : '', manageSelectedLinks.includes(link._id) ? 'selected' : '']"
          @click="toggleSelectLink(link._id)"
        >
          <checkbox
            :checked="manageSelectedLinks.includes(link._id)"
            class="link-checkbox"
          />
          <view class="link-content" @click.stop="showLinkDetail(link)">
            <view class="link-url">{{ link.url }}</view>
            <view class="link-meta">
              <text class="link-source">{{ link.sourceName || link.sourceId || '未知' }}</text>
              <text v-if="link.publishTime" class="link-publish-time">{{ link.publishTime }}</text>
              <text v-else-if="link.fetchTime" class="link-fetch-time">{{ formatFetchTime(link.fetchTime) }}</text>
              <text :class="['link-status', link.status]">{{ statusMap[link.status] || link.status }}</text>
              <text v-if="link.isAbnormal" class="link-abnormal">长度异常</text>
            </view>
          </view>
          <view class="link-actions">
            <view class="action-btn" @click.stop="editLink(link)">修改</view>
            <view class="action-btn reset" v-if="link.status === 'failed'" @click.stop="resetLinkStatus(link)">重置</view>
            <view class="action-btn delete" @click.stop="deleteLink(link._id)">删除</view>
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
        <view class="page-info">
          <text class="page-current">{{ linkPage }}</text>
          <text class="page-sep">/</text>
          <text class="page-total">{{ Math.ceil(linkTotal / linkPageSize) }}</text>
          <text class="page-count">共{{ linkTotal }}条</text>
        </view>
        <button @click="nextPage" :disabled="linkPage >= Math.ceil(linkTotal / linkPageSize)" size="mini">下一页</button>
      </view>
    </view>

    <!-- 链接详情弹窗 -->
    <view class="detail-modal" v-if="currentLinkDetail" @click="hideLinkDetail">
      <view class="detail-content" @click.stop>
        <view class="detail-header">
          <text class="detail-title">链接详情</text>
          <text class="detail-close" @click="hideLinkDetail">×</text>
        </view>
        <view class="detail-body">
          <view class="detail-row">
            <text class="detail-label">URL:</text>
            <text class="detail-value url">{{ currentLinkDetail.url }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">状态:</text>
            <text class="detail-value">{{ statusMap[currentLinkDetail.status] || currentLinkDetail.status }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">长度:</text>
            <text class="detail-value">{{ currentLinkDetail.url.length }} 字符</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">标题:</text>
            <view class="detail-title-row">
              <text v-if="linkDetailTitleLoading" class="title-loading">加载中...</text>
              <text v-else-if="titles[currentLinkDetail.url]" class="title-text">{{ titles[currentLinkDetail.url] }}</text>
              <text v-else class="title-none">无法获取</text>
              <text class="refresh-btn" @click="refreshTitle(currentLinkDetail.url)">刷新</text>
            </view>
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
      showHistory: false,  // 是否展开历史记录
      lastExtractTime: '', // 最后提取时间
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
      // 失败链接相关
      failedGroups: [],
      expandedFailedGroups: [],
      selectedFailedIds: [],
      showFailedSection: false,
      loadingFailed: false,
      retryLoading: false,
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
      isPolling: false,
      // Tab懒加载标志
      tab1Loaded: false,
      tab2Loaded: false,
      // Tab数据脏标记（其他Tab操作后标记需要刷新，避免频繁调用）
      tab1Dirty: false,   // Tab1需要刷新
      tab2Dirty: false,   // Tab2需要刷新
      // 轮询相关
      pollingBackoff: {
        baseDelay: 2000,
        multiplier: 1.5,
        maxDelay: 30000,
        currentDelay: 2000
      },
      pollingAbortController: null,
      // 标题预览相关
      titles: {},     // { url: title }
      titleLoading: {}, // { url: true }
      publishTimes: {}, // { url: publishTime } - stores publishTime extracted by getUrlTitle
      linkDetailTitleLoading: false,
      currentLinkDetail: null,
      // 时间筛选相关
      filterStartDate: '',
      filterEndDate: '',
      tab2FilterStart: '',
      tab2FilterEnd: ''
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
    },
    statusIndex() {
      if (this.selectedStatus === '') return 0
      const statusMap = { 'pending': 1, 'processing': 2, 'processed': 3, 'failed': 4 }
      return statusMap[this.selectedStatus] || 0
    },
    filteredPendingGroups() {
      if (!this.filterStartDate && !this.filterEndDate) {
        return this.pendingGroups
      }
      return this.pendingGroups.map(group => ({
        ...group,
        links: (group.links || []).filter(link => {
          const timeValue = link.publishTime || (link.fetchTime ? new Date(link.fetchTime).toISOString().split('T')[0] : null)
          if (!timeValue) return false
          if (this.filterStartDate && timeValue < this.filterStartDate) return false
          if (this.filterEndDate && timeValue > this.filterEndDate) return false
          return true
        })
      })).filter(g => g.links.length > 0)
    }
  },

  onLoad() {
    this.loadSources()
    this.loadExtractHistory()
  },

  onShow() {
    // 页面从后台切回时，检查当前Tab是否需要刷新（其他Tab操作后标记了脏）
    if (this.currentTab === 1 && this.tab1Dirty) {
      this.loadPendingLinks()
      this.tab1Dirty = false
    } else if (this.currentTab === 2 && this.tab2Dirty) {
      this.loadAllLinks()
      this.tab2Dirty = false
    }
  },

  onUnload() {
    // 页面卸载时停止轮询
    this.stopPolling()
  },

  methods: {

    // ================================================================
    // 生命周期 & Tab 导航
    // ================================================================

    switchTab(index) {
      if (this.currentTab === 1 && index !== 1) {
        this.stopPolling()
        this.selectedLinks = {}
        this.expandedGroups = []
        this.selectedFailedIds = []
        this.parseResult = null
        this.realTimeProgress = null
        this.parseProgress = null
      }
      this.currentTab = index
      // Tab 1：首次加载或有脏标记时刷新
      if (index === 1) {
        this.loadPendingLinks()
        this.tab1Loaded = true
        this.tab1Dirty = false  // 清除脏标记
      }
      // Tab 2：首次加载或有脏标记时刷新
      if (index === 2) {
        this.loadAllLinks()
        this.tab2Loaded = true
        this.tab2Dirty = false  // 清除脏标记
      }
    },

    // ================================================================
    // Tab 0 — 链接提取
    // 数据流：handleExtract → extractUrls(sourceUrl...) → saveLinksToQueue → url_queue
    //         自动创建/更新 sources 表
    // ================================================================

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
          this.lastExtractTime = this.getTimeString()
          this.loadExtractHistory()
          this.loadSources()
          // 提取后标记其他Tab需要刷新
          this.tab1Dirty = true
          this.tab2Dirty = true
          uni.showToast({ title: res.result.data.message || '提取完成', icon: 'success' })
        } else {
          uni.showToast({ title: res.result.message || '提取失败', icon: 'none' })
        }
      } catch (e) {
        console.error('[extractUrls] 错误:', e)
        uni.showToast({ title: '提取失败: ' + e.message, icon: 'none' })
      }
      this.extractLoading = false
    },

    async loadExtractHistory() {
      try {
        const res = await uniCloud.callFunction({
          name: 'extractUrls',
          data: { action: 'getHistory' }
        })
        if (res.result.code === 0) {
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

    onSourceChange(e) {
      const index = e.detail.value
      if (index >= 0 && index < this.sourceList.length) {
        this.selectedSource = this.sourceList[index]
        this.extractUrl = this.selectedSource.config?.url || this.selectedSource.url || ''
      } else {
        this.selectedSource = null
      }
    },

    selectHistoryUrl(item) {
      this.extractUrl = item.sourceUrl
      uni.showToast({ title: '已选择: ' + (item.sourceName || item.sourceId), icon: 'none' })
    },

    toggleHistory() {
      this.showHistory = !this.showHistory
    },

    showSkipHelp() {
      uni.showModal({
        title: '404 检测说明',
        content: '关闭时：检测每个链接是否返回 404，去重更严格，但速度较慢\n\n开启时：跳过 404 检测，提取速度更快，适合批量粗筛',
        showCancel: false,
        confirmText: '知道了'
      })
    },

    getTimeString() {
      const date = new Date()
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    },

    // ================================================================
    // Tab 1 — 文章解析
    // 数据流：
    //   loadPendingLinks → parseArticles(action:getPendingList) ← 只读
    //   handleParseSelected → parseArticles(action:startBatchProcess) ← 写入 url_queue + articles
    //   pollProgress → parseArticles(action:getProgress) ← 只读
    //   loadFailedLinks → parseArticles(action:getFailedList) ← 只读
    //   handleRetryFailed → parseArticles(action:retryFailed) ← 重置 url_queue status
    // ================================================================

    // --- 加载与选择 ---

    async loadPendingLinks() {
      this.loadingPending = true
      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: { action: 'getPendingList' }
        })
        if (res.result.code === 0) {
          this.pendingGroups = res.result.data || []
          if (this.pendingGroups.length > 0 && this.expandedGroups.length === 0) {
            this.expandedGroups = [0]
          }
        }
      } catch (e) {
        console.error('加载待处理链接失败:', e)
      }
      this.loadingPending = false
      // 同时加载失败链接（如果已展开）
      if (this.showFailedSection) {
        this.loadFailedLinks()
      }
    },

    onFilterStartChange(e) {
      this.filterStartDate = e.detail.value
    },
    onFilterEndChange(e) {
      this.filterEndDate = e.detail.value
    },
    clearTimeFilter() {
      this.filterStartDate = ''
      this.filterEndDate = ''
    },

    toggleGroup(gIndex) {
      const idx = this.expandedGroups.indexOf(gIndex)
      if (idx > -1) this.expandedGroups.splice(idx, 1)
      else this.expandedGroups.push(gIndex)
    },

    isGroupAllSelected(gIndex) {
      const group = this.pendingGroups[gIndex]
      if (!group || !group.links) return false
      const selected = this.selectedLinks[gIndex] || []
      return group.links.length > 0 && group.links.every(l => selected.includes(l._id))
    },

    toggleGroupAll(gIndex) {
      const group = this.pendingGroups[gIndex]
      if (!group || !group.links) return
      if (!this.selectedLinks[gIndex]) this.$set(this.selectedLinks, gIndex, [])
      const selected = this.selectedLinks[gIndex]
      const allSelected = group.links.every(l => selected.includes(l._id))
      this.selectedLinks[gIndex] = allSelected ? [] : group.links.map(l => l._id)
    },

    isLinkSelected(gIndex, linkId) {
      const selected = this.selectedLinks[gIndex] || []
      return selected.includes(linkId)
    },

    toggleLinkSelection(gIndex, linkId) {
      if (!this.selectedLinks[gIndex]) this.$set(this.selectedLinks, gIndex, [])
      const selected = this.selectedLinks[gIndex]
      const idx = selected.indexOf(linkId)
      if (idx > -1) selected.splice(idx, 1)
      else selected.push(linkId)
    },

    getTotalPendingCount() {
      return this.pendingGroups.reduce((sum, g) => sum + (g.totalCount || 0), 0)
    },

    getGroupSelectedCount(gIndex) {
      const selected = this.selectedLinks[gIndex] || []
      return selected.length
    },

    selectAllInPage() {
      this.pendingGroups.forEach((group, gIndex) => {
        if (this.expandedGroups.includes(gIndex) && group.links) {
          this.selectedLinks[gIndex] = group.links.map(l => l._id)
        }
      })
      this.$forceUpdate()
    },

    selectAll() {
      uni.showModal({
        title: '确认全选',
        content: '确定要选择所有待处理链接吗？数量过多可能导致处理超时',
        success: (res) => {
          if (res.confirm) {
            this.pendingGroups.forEach((group, gIndex) => {
              if (group.links) this.selectedLinks[gIndex] = group.links.map(l => l._id)
            })
            this.$forceUpdate()
          }
        }
      })
    },

    clearSelection() {
      this.selectedLinks = {}
      this.$forceUpdate()
    },

    // --- 失败链接 ---

    async loadFailedLinks() {
      this.loadingFailed = true
      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: { action: 'getFailedList' }
        })
        if (res.result.code === 0) {
          this.failedGroups = res.result.data || []
          if (this.failedGroups.length > 0 && this.expandedFailedGroups.length === 0) {
            this.expandedFailedGroups = [0]
          }
        }
      } catch (e) {
        console.error('加载失败链接失败:', e)
      }
      this.loadingFailed = false
    },

    toggleFailedSection() {
      this.showFailedSection = !this.showFailedSection
      if (this.showFailedSection && this.failedGroups.length === 0) {
        this.loadFailedLinks()
      }
    },

    toggleFailedGroup(gIndex) {
      const idx = this.expandedFailedGroups.indexOf(gIndex)
      if (idx > -1) this.expandedFailedGroups.splice(idx, 1)
      else this.expandedFailedGroups.push(gIndex)
    },

    isFailedGroupAllSelected(gIndex) {
      const group = this.failedGroups[gIndex]
      if (!group || !group.links) return false
      return group.links.every(l => this.selectedFailedIds.includes(l._id))
    },

    toggleFailedGroupAll(gIndex) {
      const group = this.failedGroups[gIndex]
      if (!group || !group.links) return
      const allSelected = group.links.every(l => this.selectedFailedIds.includes(l._id))
      if (allSelected) {
        this.selectedFailedIds = this.selectedFailedIds.filter(id => !group.links.map(l => l._id).includes(id))
      } else {
        const newIds = group.links.map(l => l._id)
        newIds.forEach(id => { if (!this.selectedFailedIds.includes(id)) this.selectedFailedIds.push(id) })
      }
      this.$forceUpdate()
    },

    toggleFailedLinkSelection(linkId) {
      const idx = this.selectedFailedIds.indexOf(linkId)
      if (idx > -1) this.selectedFailedIds.splice(idx, 1)
      else this.selectedFailedIds.push(linkId)
    },

    getTotalFailedCount() {
      return this.failedGroups.reduce((sum, g) => sum + (g.totalCount || 0), 0)
    },

    getFailedGroupSelectedCount(gIndex) {
      const group = this.failedGroups[gIndex]
      if (!group || !group.links) return 0
      return group.links.filter(l => this.selectedFailedIds.includes(l._id)).length
    },

    selectAllFailedInPage() {
      this.failedGroups.forEach((group, gIndex) => {
        if (this.expandedFailedGroups.includes(gIndex) && group.links) {
          group.links.forEach(l => { if (!this.selectedFailedIds.includes(l._id)) this.selectedFailedIds.push(l._id) })
        }
      })
      this.$forceUpdate()
    },

    selectAllFailed() {
      uni.showModal({
        title: '确认全选',
        content: '确定要选择所有失败链接吗？',
        success: (res) => {
          if (res.confirm) {
            this.failedGroups.forEach(group => {
              if (group.links) group.links.forEach(l => { if (!this.selectedFailedIds.includes(l._id)) this.selectedFailedIds.push(l._id) })
            })
            this.$forceUpdate()
          }
        }
      })
    },

    clearFailedSelection() {
      this.selectedFailedIds = []
      this.$forceUpdate()
    },

    async handleRetryFailed() {
      if (this.selectedFailedIds.length === 0) {
        uni.showToast({ title: '请选择要重试的链接', icon: 'none' })
        return
      }
      this.retryLoading = true
      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: { action: 'retryFailed', linkIds: this.selectedFailedIds }
        })
        if (res.result.code === 0) {
          uni.showToast({ title: res.result.message || '重试成功', icon: 'success' })
          this.selectedFailedIds = []
          this.failedGroups = []
          this.showFailedSection = false
          this.loadPendingLinks()
          this.tab2Dirty = true
        } else {
          uni.showToast({ title: res.result.message || '重试失败', icon: 'none' })
        }
      } catch (e) {
        console.error('[handleRetryFailed] 错误:', e)
        uni.showToast({ title: '重试失败: ' + e.message, icon: 'none' })
      }
      this.retryLoading = false
    },

    // --- 解析触发 ---

    async handleParseSelected() {
      const linkIds = this.selectedLinkIds
      if (linkIds.length === 0) {
        uni.showToast({ title: '请选择要解析的链接', icon: 'none' })
        return
      }
      if (this.isPolling || this.parseLoading) {
        uni.showToast({ title: '已有解析任务正在进行中', icon: 'none' })
        return
      }
      this.parseLoading = true
      this.parseResult = null
      this.parseProgress = null
      this.realTimeProgress = null
      this.taskToken = linkIds[0]
      const estimatedTimeout = linkIds.length * 20000 + 30000
      this.startPolling(this.taskToken)
      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: { action: 'startBatchProcess', linkIds, openid: uni.getStorageSync('openid') },
          timeout: estimatedTimeout
        })
        console.log('[parseArticles] 响应状态:', res.result?.status)
      } catch (e) {
        if (e.message && (e.message.includes('timeout') || e.errMsg?.includes('timeout'))) {
          uni.showToast({ title: '处理超时，轮询获取进度中...', icon: 'none', duration: 3000 })
        } else {
          uni.showToast({ title: '解析失败: ' + e.message, icon: 'none' })
          this.stopPolling()
        }
      }
    },

    // --- 轮询机制 ---

    startPolling(taskToken) {
      this.taskToken = taskToken
      this.isPolling = true
      this.pollingBackoff.currentDelay = this.pollingBackoff.baseDelay
      this.pollingAbortController = typeof AbortController !== 'undefined' ? new AbortController() : null
      this.pollProgress()
      this.scheduleNextPoll()
    },

    scheduleNextPoll() {
      if (!this.isPolling) return
      this.pollingTimer = setTimeout(() => {
        if (this.isPolling) {
          this.pollProgress()
          this.scheduleNextPoll()
        }
      }, this.pollingBackoff.currentDelay)
      this.pollingBackoff.currentDelay = Math.min(
        this.pollingBackoff.currentDelay * this.pollingBackoff.multiplier,
        this.pollingBackoff.maxDelay
      )
    },

    stopPolling() {
      this.isPolling = false
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer)
        this.pollingTimer = null
      }
      if (this.pollingAbortController) {
        try { this.pollingAbortController.abort() } catch (e) { /* ignore */ }
        this.pollingAbortController = null
      }
    },

    async pollProgress() {
      if (!this.taskToken) return
      const linkIds = this.selectedLinkIds
      try {
        const res = await uniCloud.callFunction({
          name: 'parseArticles',
          data: { action: 'getProgress', taskToken: this.taskToken, linkIds }
        })
        if (res.result.code === 0 && res.result.data) {
          const progressData = res.result.data
          this.realTimeProgress = progressData
          if (progressData.status === 'idle') {
            return
          }
          if (progressData.status === 'completed' || progressData.status === 'failed') {
            this.stopPolling()
            this.parseLoading = false
            this.parseProgress = {
              processed: progressData.total,
              success: progressData.successCount,
              failed: progressData.failedCount,
              remainingCount: progressData.total - progressData.successCount - progressData.failedCount,
              usedTime: progressData.usedTime,
              avgSpeed: progressData.speed
            }
            this.loadPendingLinks()
            if (this.showFailedSection) this.loadFailedLinks()
            this.tab2Dirty = true
            this.selectedLinks = {}
            this.expandedGroups = []
            uni.showToast({
              title: progressData.status === 'completed' ? '处理完成' : '处理失败',
              icon: progressData.status === 'completed' ? 'success' : 'none'
            })
            return
          }
          this.pollingBackoff.currentDelay = this.pollingBackoff.baseDelay
          this.scheduleNextPoll()
        }
      } catch (e) {
        console.error('[pollProgress] 错误:', e)
        this.pollingBackoff.currentDelay = Math.min(
          this.pollingBackoff.currentDelay * this.pollingBackoff.multiplier,
          this.pollingBackoff.maxDelay
        )
        this.scheduleNextPoll()
      }
    },

    // --- 格式化 ---

    formatDuration(ms) {
      if (!ms || ms <= 0) return '0:00'
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    },

    formatFetchTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getMonth()+1}-${date.getDate()}`
    },

    // ================================================================
    // Tab 2 — 链接管理
    // 数据流：loadAllLinks → extractUrls(action:getAllLinks) ← 只读
    //   deleteLink/batchDelete/editLink → extractUrls(action:...) ← 写入 url_queue
    // ================================================================

    async loadAllLinks() {
      try {
        const res = await uniCloud.callFunction({
          name: 'extractUrls',
          data: {
            action: 'getAllLinks',
            page: this.linkPage,
            pageSize: this.linkPageSize,
            status: this.selectedStatus || undefined,
            startDate: this.tab2FilterStart || undefined,
            endDate: this.tab2FilterEnd || undefined
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

    onStatusChange(e) {
      const index = e.detail.value
      this.selectedStatus = index === 0 ? '' : ['pending', 'processing', 'processed', 'failed'][index - 1]
      this.linkPage = 1
      this.loadAllLinks()
    },
    onTab2StartChange(e) {
      this.tab2FilterStart = e.detail.value
      this.loadAllLinks()
    },
    onTab2EndChange(e) {
      this.tab2FilterEnd = e.detail.value
      this.loadAllLinks()
    },
    clearTab2Filter() {
      this.tab2FilterStart = ''
      this.tab2FilterEnd = ''
      this.loadAllLinks()
    },

    toggleSelectLink(linkId) {
      const idx = this.manageSelectedLinks.indexOf(linkId)
      if (idx > -1) this.manageSelectedLinks.splice(idx, 1)
      else this.manageSelectedLinks.push(linkId)
    },

    selectAllPage() {
      if (this.allLinks.length === 0) return
      this.manageSelectedLinks = this.allLinks.map(link => link._id)
    },

    clearManageSelection() {
      this.manageSelectedLinks = []
    },

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
                data: { action: 'deleteLinks', linkIds: this.manageSelectedLinks }
              })
              if (res.result.code === 0) {
                uni.showToast({ title: '删除成功', icon: 'success' })
                this.manageSelectedLinks = []
                this.loadAllLinks()
                this.tab1Dirty = true  // Tab1的待处理列表可能受影响
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

    batchResetStatus() {
      if (this.manageSelectedLinks.length === 0) return
      uni.showModal({
        title: '确认重置状态',
        content: `将选中的 ${this.manageSelectedLinks.length} 条链接状态重置为「待处理」？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const res = await uniCloud.callFunction({
                name: 'extractUrls',
                data: { action: 'updateLinkStatus', status: 'pending', linkIds: this.manageSelectedLinks }
              })
              if (res.result.code === 0) {
                uni.showToast({ title: '重置成功', icon: 'success' })
                this.manageSelectedLinks = []
                this.loadAllLinks()
                this.tab1Dirty = true
              } else {
                uni.showToast({ title: res.result.message || '重置失败', icon: 'none' })
              }
            } catch (e) {
              uni.showToast({ title: '重置失败', icon: 'none' })
            }
          }
        }
      })
    },

    deleteLink(linkId) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该链接吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const res = await uniCloud.callFunction({
                name: 'extractUrls',
                data: { action: 'deleteLink', linkId }
              })
              if (res.result.code === 0) {
                uni.showToast({ title: '删除成功', icon: 'success' })
                this.loadAllLinks()
                this.tab1Dirty = true
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

    editLink(link) {
      uni.showModal({
        title: '修改链接',
        content: link.url,
        editable: true,
        confirmText: '保存',
        success: async ({ confirm, content }) => {
          if (!confirm || !content) return
          const newUrl = content.trim()
          if (newUrl === link.url) return
          try {
            const res = await uniCloud.callFunction({
              name: 'extractUrls',
              data: { action: 'updateLink', linkId: link._id, newUrl }
            })
            if (res.result.code === 0) {
              uni.showToast({ title: '更新成功', icon: 'success' })
              this.loadAllLinks()
              this.tab1Dirty = true
            } else {
              uni.showToast({ title: res.result.message || '更新失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '更新失败', icon: 'none' })
          }
        }
      })
    },

    resetLinkStatus(link) {
      uni.showModal({
        title: '重置链接状态',
        content: `将「${link.status}」状态重置为「待处理」？`,
        confirmText: '重置',
        success: async ({ confirm }) => {
          if (!confirm) return
          try {
            const res = await uniCloud.callFunction({
              name: 'extractUrls',
              data: { action: 'updateLinkStatus', linkId: link._id, status: 'pending' }
            })
            if (res.result.code === 0) {
              uni.showToast({ title: '重置成功', icon: 'success' })
              this.loadAllLinks()
              this.tab1Dirty = true
            } else {
              uni.showToast({ title: res.result.message || '重置失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '重置失败', icon: 'none' })
          }
        }
      })
    },

    prevPage() {
      if (this.linkPage > 1) {
        this.linkPage--
        this.loadAllLinks()
      }
    },

    nextPage() {
      const totalPages = Math.ceil(this.linkTotal / this.linkPageSize)
      if (this.linkPage < totalPages) {
        this.linkPage++
        this.loadAllLinks()
      }
    },

    // ================================================================
    // 标题预览（跨 Tab 共用）
    // ================================================================

    async fetchTitle(url) {
      if (!url || this.titles[url]) return
      if (this.titleLoading[url]) return
      this.titleLoading[url] = true
      try {
        const res = await uniCloud.callFunction({
          name: 'getUrlTitle',
          data: { url, forceRefresh: false }
        })
        this.$set(this.titles, url, res.result?.title || '无法获取')
        // Store publishTime returned by getUrlTitle
        if (res.result?.publishTime) {
          this.$set(this.publishTimes, url, res.result.publishTime)
        }
      } catch (e) {
        console.error('[fetchTitle] Error:', e)
        this.$set(this.titles, url, '无法获取')
      }
      this.titleLoading[url] = false
    },

    showLinkDetail(link) {
      this.currentLinkDetail = link
      this.linkDetailTitleLoading = true
      uniCloud.callFunction({ name: 'getUrlTitle', data: { url: link.url, forceRefresh: false } })
        .then(res => {
          this.$set(this.titles, link.url, res.result?.title || '无法获取')
          if (res.result?.publishTime) {
            this.$set(this.publishTimes, link.url, res.result.publishTime)
          }
        })
        .catch(e => {
          console.error('[showLinkDetail] Error:', e)
          this.$set(this.titles, link.url, '无法获取')
        })
        .finally(() => { this.linkDetailTitleLoading = false })
    },

    hideLinkDetail() {
      this.currentLinkDetail = null
    },

    refreshTitle(url) {
      if (!url) return
      this.titleLoading[url] = true
      this.$set(this.titles, url, '')
      uniCloud.callFunction({ name: 'getUrlTitle', data: { url, forceRefresh: true } })
        .then(res => {
          this.$set(this.titles, url, res.result?.title || '无法获取')
          if (res.result?.publishTime) {
            this.$set(this.publishTimes, url, res.result.publishTime)
          }
        })
        .catch(e => {
          console.error('[refreshTitle] Error:', e)
          this.$set(this.titles, url, '无法获取')
        })
        .finally(() => { this.titleLoading[url] = false })
    },

    // ================================================================
    // 工具方法
    // ================================================================

    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
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

/* ========== Tab 1: 链接提取 ========== */
.extract-input-section {
  background: #fafafa;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #eee;
}

.label-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.label {
  font-size: 28rpx;
  color: #666;
}

.label-hint {
  font-size: 22rpx;
  color: #07C160;
}

.input-section {
  margin-bottom: 20rpx;
}

.picker-value {
  width: 100%;
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fff;

  &.has-value {
    border-color: #07C160;
    color: #07C160;
  }
}

.url-input {
  width: 100%;
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fff;
}

.option-section {
  margin-bottom: 20rpx;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 28rpx;
  color: #666;
}

.help-icon {
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  background: #E3F2FD;
  color: #007AFF;
  border-radius: 50%;
  font-size: 24rpx;
  font-weight: bold;
}

.btn-section {
  margin-bottom: 0;
}

.action-btn {
  width: 100%;
  background: #07C160;
  color: #fff;
  border-radius: 24rpx;

  &.disabled {
    background: #ccc;
  }
}

/* 提取结果 */
.result-section {
  background: linear-gradient(135deg, #E8F5E9 0%, #f0f9f0 100%);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #C8E6C9;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.result-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.result-time {
  font-size: 22rpx;
  color: #07C160;
  font-weight: normal;
}

.result-grid {
  display: flex;
  gap: 16rpx;
}

.result-card {
  flex: 1;
  background: #fff;
  border-radius: 8rpx;
  padding: 16rpx;
  text-align: center;

  &.success {
    background: #07C160;
    .result-num, .result-label { color: #fff; }
  }

  &.warning {
    background: #FFF3E0;
    .result-num, .result-label { color: #FF9500; }
  }
}

.result-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.result-label {
  font-size: 22rpx;
  color: #666;
  display: block;
  margin-top: 4rpx;
}

/* 历史记录 */
.history-section {
  margin-bottom: 20rpx;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.history-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.history-list {
  margin-top: 12rpx;
}

.history-item {
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eee;
  background: #fff;

  &:last-child {
    border-bottom: none;
    border-radius: 0 0 8rpx 8rpx;
  }
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-bottom: 8rpx;
}

.history-url {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.history-time {
  font-size: 22rpx;
  color: #999;
}

.history-stats {
  display: flex;
  gap: 12rpx;
}

.history-stats .stat {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  background: #f5f5f5;
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

/* ========== Tab 2: 文章解析 ========== */
.pending-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.toolbar-right {
  display: flex;
  gap: 8rpx;
}

.time-filter-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}
.filter-label {
  font-size: 26rpx;
  color: #666;
}
.date-picker-value {
  padding: 8rpx 16rpx;
  background: #fff;
  border: 1rpx solid #ddd;
  border-radius: 6rpx;
  font-size: 24rpx;
}
.filter-sep {
  color: #999;
}
.filter-clear-btn {
  padding: 8rpx 16rpx;
  background: #FFEBEE;
  color: #FF3B30;
  border-radius: 6rpx;
  font-size: 24rpx;
}

.pending-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.pending-count {
  font-size: 24rpx;
  color: #07C160;
  background: #E8F5E9;
  padding: 2rpx 12rpx;
  border-radius: 12rpx;
}

.select-actions {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.select-btn {
  flex: 1;
  padding: 12rpx;
  background: #E3F2FD;
  color: #007AFF;
  border-radius: 8rpx;
  text-align: center;
  font-size: 24rpx;

  &.clear {
    background: #FFEBEE;
    color: #FF3B30;
  }
}

.pending-group {
  border: 1rpx solid #e0e0e0;
  border-radius: 10rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
  transition: all 0.2s;

  &.expanded {
    border-color: #07C160;
    box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.15);
  }
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #fafafa;
}

.group-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
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

.selected-hint {
  font-size: 22rpx;
  color: #07C160;
  background: #E8F5E9;
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
}

.expand-icon {
  font-size: 24rpx;
  color: #999;
}

.group-links {
  max-height: 500rpx;
  overflow-y: auto;
  background: #fff;
}

.link-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
  transition: background 0.15s;

  &.selected {
    background: #E3F2FD;
  }

  &:last-child {
    border-bottom: none;
  }
}

.link-checkbox {
  margin-top: 4rpx;
  flex-shrink: 0;
}

.link-content {
  flex: 1;
  min-width: 0;
}

.link-url {
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.link-title {
  font-size: 22rpx;
  color: #666;
  margin-top: 6rpx;
}

.link-title .title-loading {
  color: #999;
}

.link-title .title-text {
  color: #07C160;
}

.link-title .title-none {
  color: #FF9500;
}

.selection-info {
  padding: 16rpx;
  background: #E3F2FD;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: #007AFF;

  &.warning {
    background: #FFF3E0;
    color: #FF9500;
  }

  &.danger {
    background: #FFEBEE;
    color: #FF3B30;
  }
}

.empty-pending {
  text-align: center;
  padding: 80rpx 20rpx;
  color: #999;
  font-size: 28rpx;
}

.empty-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #bbb;
}

/* ========== 失败链接管理 ========== */
.failed-section {
  margin-top: 24rpx;
  border: 1rpx solid #FFCDD2;
  border-radius: 10rpx;
  overflow: hidden;
  background: #fff;
}

.failed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #FFEBEE;
}

.failed-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.failed-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #FF3B30;
}

.failed-count {
  font-size: 24rpx;
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 12rpx;
}

.failed-content {
  padding: 20rpx;
}

.failed-group {
  border-color: #FFCDD2 !important;
}

.failed-link {
  background: #FFF5F5;
}

.link-error {
  color: #FF3B30;
  font-size: 20rpx;
}

.link-retry {
  color: #FF9500;
  font-size: 20rpx;
}

/* 实时进度 */
.result-area {
  margin-top: 24rpx;
}

.realtime-progress {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  padding: 24rpx;
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

  &.processing {
    background: linear-gradient(90deg, #fff 0%, #E3F2FD 100%);
  }
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
}

.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
  margin-bottom: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.progress-label {
  opacity: 0.9;
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
  max-width: 350rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.waiting-section {
  text-align: center;
  padding: 40rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.waiting-text {
  font-size: 28rpx;
  color: #666;
}

/* 解析结果 */
.parse-result {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx;
}

.result-summary {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.summary-item {
  flex: 1;
  background: #fff;
  border-radius: 8rpx;
  padding: 20rpx;
  text-align: center;

  &.success {
    background: #E8F5E9;
    .summary-num, .summary-label { color: #07C160; }
  }

  &.failed {
    background: #FFEBEE;
    .summary-num, .summary-label { color: #FF3B30; }
  }

  &.filtered {
    background: #E3F2FD;
    .summary-num, .summary-label { color: #007AFF; }
  }
}

.summary-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.summary-label {
  font-size: 22rpx;
  color: #666;
  display: block;
  margin-top: 4rpx;
}

.result-tip {
  margin-top: 16rpx;
  padding: 12rpx;
  background: #FFF3E0;
  border-radius: 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: #FF9500;
}

/* ========== Tab 3: 链接管理 ========== */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.filter-left { display: flex; align-items: center; }
.filter-right { display: flex; align-items: center; }
.date-range-filter { display: flex; align-items: center; gap: 8rpx; }
.mini-picker { padding: 6rpx 12rpx; background: #f5f5f5; border-radius: 6rpx; font-size: 22rpx; }
.range-sep { color: #999; font-size: 22rpx; }
.clear-btn { width: 36rpx; height: 36rpx; line-height: 36rpx; text-align: center; background: #FFEBEE; color: #FF3B30; border-radius: 50%; font-size: 24rpx; }

.filter-picker {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;

  .arrow {
    font-size: 20rpx;
    color: #999;
  }
}

.filter-actions {
  display: flex;
  gap: 12rpx;
}

.action-icon {
  padding: 12rpx 20rpx;
  background: #E3F2FD;
  color: #007AFF;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.batch-bar {
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  margin-bottom: 16rpx;

  &.active {
    background: #FFF3E0;
  }
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.batch-count {
  flex: 1;
  font-size: 26rpx;
  color: #FF9500;
}

.batch-hint {
  font-size: 24rpx;
  color: #999;
}

.batch-btn {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.delete {
    background: #FF3B30;
    color: #fff;
  }

  &.reset {
    background: #FF9500;
    color: #fff;
  }

  &.clear {
    background: #fff;
    color: #999;
    border: 1rpx solid #ddd;
  }
}

.link-list {
  margin-bottom: 20rpx;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  background: #fff;

  &.selected {
    background: #E3F2FD;
  }

  &.abnormal {
    background: #FFEBEE;
  }
}

.link-checkbox {
  flex-shrink: 0;
}

.link-content {
  flex: 1;
  min-width: 0;
}

.link-url {
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  margin-bottom: 6rpx;
}

.link-meta {
  display: flex;
  gap: 10rpx;
  font-size: 22rpx;
}

.link-source {
  color: #666;
}

.link-publish-time {
  color: #07C160;
  font-size: 22rpx;
}

.link-fetch-time {
  color: #999;
  font-size: 22rpx;
}

.link-status {
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
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
  flex-shrink: 0;
}

.action-btn {
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  background: #07C160;
  color: #fff;
  border-radius: 6rpx;

  &.delete {
    background: #FF3B30;
  }
}

.action-btn.reset {
  background: #FF9500;
}

.empty-list {
  text-align: center;
  padding: 80rpx;
  color: #999;
  font-size: 28rpx;
  background: #fafafa;
  border-radius: 8rpx;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.page-current {
  color: #07C160;
  font-weight: bold;
  font-size: 28rpx;
}

.page-sep {
  color: #999;
}

.page-total {
  color: #666;
}

.page-count {
  color: #999;
  font-size: 24rpx;
  margin-left: 8rpx;
}

/* ========== 链接详情弹窗 ========== */
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-content {
  background: #fff;
  border-radius: 16rpx;
  width: 85%;
  max-width: 650rpx;
  max-height: 80vh;
  overflow: hidden;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #eee;
  background: #fafafa;
}

.detail-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.detail-close {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  font-size: 48rpx;
  color: #999;
  background: #f5f5f5;
  border-radius: 50%;
}

.detail-body {
  padding: 24rpx;
}

.detail-row {
  display: flex;
  margin-bottom: 20rpx;
  font-size: 28rpx;
}

.detail-label {
  color: #666;
  width: 120rpx;
  flex-shrink: 0;
}

.detail-value {
  color: #333;
  flex: 1;
  word-break: break-all;
}

.detail-value.url {
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-title-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.detail-title-row .title-loading {
  color: #999;
  font-size: 26rpx;
}

.detail-title-row .title-text {
  color: #07C160;
  font-size: 26rpx;
  flex: 1;
}

.detail-title-row .title-none {
  color: #999;
  font-size: 26rpx;
}

.refresh-btn {
  color: #007AFF;
  font-size: 26rpx;
  padding: 6rpx 16rpx;
  background: #E3F2FD;
  border-radius: 6rpx;
}
</style>

<template>
    <view class="container">
        <!-- 添加按钮 -->
        <view class="add-btn" @click="showAddModal">
            <uni-icons type="plus" size="20" color="#FFFFFF"></uni-icons>
            <text>添加数据源</text>
        </view>

        <!-- 筛选和批量操作栏 -->
        <view class="filter-bar">
            <picker :range="tierOptions" @change="onTierFilterChange" class="filter-picker">
                <view class="picker-value">{{ tierFilterLabel }}</view>
            </picker>
            <picker :range="crawlStatusOptions" @change="onCrawlStatusFilterChange" class="filter-picker">
                <view class="picker-value">{{ crawlStatusFilterLabel }}</view>
            </picker>
            <view class="bulk-toggle" @click="toggleBulkMode">
                <text>{{ bulkMode ? '取消批量' : '批量管理' }}</text>
            </view>
            <view class="import-btn" @click="selectAndImport">
                <uni-icons type="download" size="16" color="#FFFFFF"></uni-icons>
                <text>导入JSON</text>
            </view>
        </view>

        <!-- 批量操作栏 -->
        <view v-if="bulkMode" class="bulk-actions">
            <text class="bulk-count">已选择 {{ bulkSelected.length }} 项</text>
            <view class="bulk-btn suggest" @click="batchSuggest">AI建议</view>
            <view class="bulk-btn migrate" @click="batchMigrate">应用建议</view>
        </view>

        <!-- 导入进度 -->
        <view v-if="importing" class="import-progress">
            <text>{{ importProgress }}</text>
        </view>

        <!-- 数据源列表 -->
        <view class="source-list">
            <!-- 折叠/展开按钮 -->
            <view class="tree-toolbar" v-if="filteredSourceList.length > 0">
                <view class="collapse-btn" @click="toggleCollapseAll">
                    <uni-icons :type="allExpanded ? 'eye' : 'eye-slash'" size="14" color="#666"></uni-icons>
                    <text>{{ allExpanded ? '折叠全部' : '展开全部' }}</text>
                </view>
            </view>

            <!-- 树形结构: category -> subgroup -> items -->
            <view v-for="catNode in filteredSourceList" :key="catNode._key" class="category-group">
                <!-- 二级分组（subgroup）列表 -->
                <view v-for="(subItems, subKey) in catNode.subgroups" :key="subKey" class="subgroup-group">
                    <!-- subgroup 折叠头 -->
                    <view class="subgroup-header" @click="toggleExpand(catNode._key + '|' + subKey)">
                        <uni-icons :type="expandedKeys[catNode._key + '|' + subKey] ? 'bottom' : 'right'" size="16" color="#666"></uni-icons>
                        <text class="subgroup-name">{{ subKey }}</text>
                        <text class="subgroup-count">{{ subItems.length }}个</text>
                    </view>
                    <!-- subgroup 内的数据源 -->
                    <view v-if="expandedKeys[catNode._key + '|' + subKey]" class="subgroup-items">
                        <view
                            class="source-item"
                            v-for="item in subItems"
                            :key="item._id"
                        >
                            <view class="source-header">
                                <view v-if="bulkMode" class="bulk-checkbox" @click="toggleBulkSelected(item._id)">
                                    <uni-icons :type="bulkSelected.includes(item._id) ? 'checkbox-filled' : 'circle'" :color="bulkSelected.includes(item._id) ? '#07C160' : '#999'" size="20"></uni-icons>
                                </view>
                                <view class="source-info">
                                    <text class="source-name">{{ item.sourceName }}</text>
                                    <text :class="['source-type', item.sourceType]">{{ getTypeText(item.sourceType) }}</text>
                                </view>
                                <view class="classification-badges">
                                    <text v-if="item.classification?.priorityTier" :class="['badge', 'tier', item.classification.priorityTier]">{{ item.classification.priorityTier }}</text>
                                    <text v-if="item.classification?.crawlStatus" :class="['badge', 'status', item.classification.crawlStatus]">{{ item.classification.crawlStatus }}</text>
                                    <text v-if="item.parseStrategy" :class="['badge', 'strategy', item.parseStrategy]">{{ getParseStrategyText(item.parseStrategy) }}</text>
                                </view>
                                <switch
                                    :checked="item.enabled"
                                    @change="toggleEnabled(item)"
                                    color="#07C160"
                                    :class="{ 'switch-disabled': bulkMode }"
                                />
                            </view>
                            <view class="source-url">{{ item.config?.url || '未配置URL' }}</view>
                            <view class="source-stats">
                                <text>文章数: {{ item.stats?.totalArticles || 0 }}</text>
                                <text>最后采集: {{ formatTime(item.schedule?.lastRunTime) }}</text>
                                <text v-if="item.stats?.hasUpdates" class="update-badge">有更新</text>
                            </view>
                            <view class="source-actions">
                                <view class="action-btn" @click="editSource(item)">编辑</view>
                                <view class="action-btn sync" @click="syncSingleSource(item)">同步</view>
                                <view class="action-btn delete" @click="deleteSource(item)">删除</view>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="sourceList.length === 0 && !loading" class="empty">
                <text>暂无数据源</text>
            </view>
        </view>

        <!-- 添加/编辑弹窗 -->
        <view class="source-modal" v-if="showModal">
            <view class="modal-mask" @click="closeModal"></view>
            <view class="modal-content">
                <view class="modal-header">
                    <text>{{ isEdit ? '编辑数据源' : '添加数据源' }}</text>
                    <text class="close-btn" @click="closeModal">×</text>
                </view>

                <scroll-view class="modal-body" scroll-y>
                    <view class="form-group">
                        <text class="label">名称</text>
                        <input class="input" v-model="formData.name" placeholder="如：教务处通知" />
                    </view>

                    <view class="form-group">
                        <text class="label">类型</text>
                        <picker :range="sourceTypes" @change="onTypeChange">
                            <view class="picker">
                                {{ sourceTypes[formData.typeIndex] }}
                            </view>
                        </picker>
                    </view>

                    <!-- 智能分析建议 -->
                    <view v-if="suggestion" class="suggestion-box">
                        <view class="suggestion-header">智能建议（可修改）</view>
                        <view class="form-group">
                            <text class="label">来源ID</text>
                            <input class="input" v-model="formData.sourceId" placeholder="自动提取" />
                        </view>
                        <view class="form-group">
                            <text class="label">来源名称</text>
                            <input class="input" v-model="formData.sourceName" placeholder="自动获取" />
                        </view>
                        <view class="form-group">
                            <text class="label">分类</text>
                            <input class="input" v-model="formData.category" placeholder="自动提取" />
                        </view>
                    </view>

                    <view class="form-group">
                        <text class="label">URL</text>
                        <view class="url-input-group">
                            <input class="input" v-model="formData.url" placeholder="数据源地址，如 https://www.scuec.edu.cn/wyxy/..." @blur="onUrlBlur" @input="onUrlInput" />
                            <button class="analyze-btn" @click="analyzeUrl" :disabled="analyzing">
                                {{ analyzing ? '分析中...' : '智能分析' }}
                            </button>
                        </view>
                    </view>

                    <view class="form-group">
                        <text class="label">采集间隔(分钟)</text>
                        <input class="input" type="number" v-model="formData.interval" placeholder="60" />
                    </view>

                    <view class="form-group">
                        <text class="label">解析策略</text>
                        <picker :range="parseStrategyOptions" :value="parseStrategyIndex" range-key="label" @change="onParseStrategyChange">
                            <view class="picker">
                                {{ parseStrategyOptions[parseStrategyIndex].label }}
                            </view>
                        </picker>
                        <text class="hint">正则解析：适合结构标准页面\nAI解析：适合复杂内容，需要配置 Moonshot API</text>
                    </view>

                    <view class="form-group">
                        <text class="label">默认标签</text>
                        <input class="input" v-model="formData.defaultTags" placeholder="用逗号分隔，如：教务处,重要" />
                    </view>
                </scroll-view>

                <view class="modal-footer">
                    <button class="submit-btn" @click="submitSource">保存</button>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import { adminApi } from '@/api/index'

export default {
    data() {
        return {
            sourceList: [],
            loading: false,
            showModal: false,
            isEdit: false,
            editId: null,
            analyzing: false,
            suggestion: null,
            urlBlurTimer: null,
            sourceTypes: ['官方部门', '学院', 'RSS订阅', 'API接口', '网站抓取', '手动录入'],
            // Bulk mode
            bulkMode: false,
            bulkSelected: [],
            suggestions: [],
            // Import state
            importing: false,
            importProgress: '',
            // Filter state
            tierFilter: 'all',
            crawlStatusFilter: 'all',
            tierOptions: ['全部', 'tier1', 'tier2', 'tier3'],
            crawlStatusOptions: ['全部', 'crawl', 'no-crawl', 'deprecated'],
            parseStrategyOptions: [
                { value: 'regex-parse', label: '正则解析 (推荐)' },
                { value: 'ai-parse', label: 'AI 智能解析' },
                { value: 'no-parse', label: '纯文本提取' }
            ],
            // Tree expand state: { 'category|subgroup': true }
            expandedKeys: {},
            // 是否全部展开
            allExpanded: true,
            formData: {
                sourceId: '',
                sourceName: '',
                category: '',
                typeIndex: 4,
                type: 'website',
                url: '',
                interval: 60,
                defaultTags: ''
            }
        }
    },
    onLoad() {
        this.loadSources()
    },
    computed: {
        tierFilterLabel() {
            return this.tierOptions[this.tierFilter === 'all' ? 0 : this.tierOptions.indexOf(this.tierFilter) || 0]
        },
        crawlStatusFilterLabel() {
            return this.crawlStatusOptions[this.crawlStatusFilter === 'all' ? 0 : this.crawlStatusOptions.indexOf(this.crawlStatusFilter) || 0]
        },
        parseStrategyIndex() {
            return this.parseStrategyOptions.findIndex(o => o.value === this.formData.parseStrategy) || 0
        },
        filteredSourceList() {
            const filtered = this.sourceList.filter(item => {
                if (this.tierFilter !== 'all' && item.classification?.priorityTier !== this.tierFilter) return false
                if (this.crawlStatusFilter !== 'all' && item.classification?.crawlStatus !== this.crawlStatusFilter) return false
                return true
            })
            // 构建树形结构: category -> subgroup -> items
            const treeMap = {}
            for (const item of filtered) {
                const cat = item.category || '未分类'
                const sub = item.subgroup || cat
                if (!treeMap[cat]) treeMap[cat] = {}
                if (!treeMap[cat][sub]) treeMap[cat][sub] = []
                treeMap[cat][sub].push(item)
            }
            // 转换为数组并自动展开所有节点
            const tree = []
            for (const cat of Object.keys(treeMap).sort()) {
                const subgroups = treeMap[cat]
                const catKey = cat
                if (this.allExpanded && !this.expandedKeys[catKey]) {
                    this.expandedKeys[catKey] = true
                }
                for (const sub of Object.keys(subgroups).sort()) {
                    const subKey = cat + '|' + sub
                    if (this.allExpanded && !this.expandedKeys[subKey]) {
                        this.expandedKeys[subKey] = true
                    }
                }
                tree.push({ cat, subgroups, _key: catKey })
            }
            return tree
        }
    },
    methods: {
        async loadSources() {
            this.loading = true
            try {
                const result = await adminApi.manageSources('list')

                if (result) {
                    this.sourceList = result
                }
            } catch (e) {
                console.error('加载失败:', e)
            } finally {
                this.loading = false
            }
        },

        onTypeChange(e) {
            const types = ['official', 'college', 'rss', 'api', 'website', 'manual']
            this.formData.typeIndex = e.detail.value
            this.formData.type = types[e.detail.value]
        },

        // URL失去焦点时自动分析（500ms防抖）
        onUrlBlur() {
            if (this.formData.url && !this.suggestion) {
                // 清除之前的定时器
                if (this.urlBlurTimer) {
                    clearTimeout(this.urlBlurTimer)
                }
                // 500ms后执行分析
                this.urlBlurTimer = setTimeout(() => {
                    this.analyzeUrl()
                }, 500)
            }
        },

        // URL输入时清除防抖定时器，并检测粘贴行为自动触发分析
        onUrlInput() {
            if (this.urlBlurTimer) {
                clearTimeout(this.urlBlurTimer)
                this.urlBlurTimer = null
            }
            // 检测到完整URL（可能是粘贴），延迟触发分析
            const url = this.formData.url
            if (url && (url.startsWith('http://') || url.startsWith('https://')) && !this.suggestion) {
                if (this.urlBlurTimer) clearTimeout(this.urlBlurTimer)
                this.urlBlurTimer = setTimeout(() => {
                    this.analyzeUrl()
                }, 800)
            }
        },

        // 智能分析URL
        async analyzeUrl() {
            if (!this.formData.url) {
                uni.showToast({ title: '请先输入URL', icon: 'none' })
                return
            }

            // 检查URL格式
            if (!this.formData.url.startsWith('http://') && !this.formData.url.startsWith('https://')) {
                uni.showToast({ title: '请输入以http://或https://开头的URL', icon: 'none' })
                return
            }

            this.analyzing = true
            try {
                const result = await adminApi.manageSources('analyze', { url: this.formData.url })

                if (result && result.code === 0) {
                    this.suggestion = result.data
                    // 自动填充表单
                    this.formData.sourceId = result.data.sourceId || ''
                    this.formData.sourceName = result.data.sourceName || ''
                    this.formData.category = result.data.category || ''
                    this.formData.type = result.data.sourceType || 'website'

                    const typeMap = { official: 0, college: 1, rss: 2, api: 3, website: 4, manual: 5 }
                    this.formData.typeIndex = typeMap[this.formData.type] || 4

                    uni.showToast({ title: '分析成功', icon: 'success' })
                } else {
                    uni.showToast({ title: result.message || '分析失败', icon: 'none' })
                }
            } catch (e) {
                console.error('分析失败:', e)
                uni.showToast({ title: '分析失败', icon: 'none' })
            } finally {
                this.analyzing = false
            }
        },

        showAddModal() {
            this.isEdit = false
            this.editId = null
            this.suggestion = null
            this.formData = {
                sourceId: '',
                sourceName: '',
                category: '',
                typeIndex: 4,
                type: 'website',
                url: '',
                interval: 60,
                defaultTags: '',
                parseStrategy: 'regex-parse'
            }
            this.showModal = true
        },

        editSource(item) {
            this.isEdit = true
            this.editId = item._id
            this.suggestion = null

            const typeMap = { official: 0, college: 1, rss: 2, api: 3, website: 4, manual: 5 }
            this.formData = {
                sourceId: item.sourceId || '',
                sourceName: item.sourceName || '',
                category: item.category || '',
                typeIndex: typeMap[item.sourceType] || 4,
                type: item.sourceType || 'website',
                url: item.config?.url || '',
                interval: (item.schedule?.interval || 3600000) / 60000,
                defaultTags: item.defaultTags?.source?.join(',') || '',
                parseStrategy: item.parseStrategy || 'regex-parse'
            }
            this.showModal = true
        },

        closeModal() {
            this.showModal = false
        },

        async toggleEnabled(item) {
            try {
                const result = await adminApi.manageSources('toggle', {
                    id: item._id,
                    enabled: !item.enabled
                })

                if (result && result.code === 0) {
                    uni.showToast({ title: '更新成功', icon: 'success' })
                    this.loadSources()
                }
            } catch (e) {
                uni.showToast({ title: '更新失败', icon: 'none' })
                this.loadSources()
            }
        },

        async submitSource() {
            if (!this.formData.sourceName || !this.formData.url) {
                uni.showToast({ title: '请填写来源名称和URL', icon: 'none' })
                return
            }

            const data = {
                action: this.isEdit ? 'update' : 'create',
                sourceId: this.formData.sourceId,
                sourceName: this.formData.sourceName,
                sourceType: this.formData.type,
                category: this.formData.category || this.formData.sourceId,
                config: {
                    url: this.formData.url
                },
                schedule: {
                    interval: this.formData.interval * 60000
                },
                defaultTags: {
                    source: this.formData.defaultTags ? this.formData.defaultTags.split(',').filter(t => t) : [],
                    role: ['通用'],
                    custom: []
                },
                parseStrategy: this.formData.parseStrategy
            }

            if (this.isEdit) {
                data.id = this.editId
            }

            try {
                const result = await adminApi.manageSources(data.action, data)

                if (result && result.code === 0) {
                    uni.showToast({ title: '保存成功', icon: 'success' })
                    this.closePopup()
                    this.loadSources()
                } else {
                    uni.showToast({ title: result.message, icon: 'none' })
                }
            } catch (e) {
                uni.showToast({ title: '保存失败', icon: 'none' })
            }
        },

        deleteSource(item) {
            uni.showModal({
                title: '确认删除',
                content: `确定要删除"${item.sourceName}"吗？`,
                success: async (modalRes) => {
                    if (modalRes.confirm) {
                        try {
                            const result = await adminApi.manageSources('delete', { id: item._id })

                            if (result && result.code === 0) {
                                uni.showToast({ title: '已删除', icon: 'success' })
                                this.loadSources()
                            }
                        } catch (e) {
                            uni.showToast({ title: '删除失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        async syncSingleSource(item) {
            uni.showModal({
                title: '手动同步',
                content: `确定要立即同步"${item.sourceName}"吗？`,
                success: async (res) => {
                    if (!res.confirm) return
                    uni.showLoading({ title: '同步中...' })
                    try {
                        const result = await adminApi.syncSources([item._id], 1)
                        uni.hideLoading()
                        if (result && result.code === 0) {
                            const d = result.data || {}
                            uni.showToast({
                                title: `新增${d.totalNewLinks || 0}条链接`,
                                icon: 'success',
                                duration: 2500
                            })
                            this.loadSources()
                        } else {
                            uni.showToast({ title: result?.message || '同步失败', icon: 'none' })
                        }
                    } catch (e) {
                        uni.hideLoading()
                        uni.showToast({ title: '同步失败', icon: 'none' })
                    }
                }
            })
        },

        getTypeText(type) {
            const map = {
                official: '官方',
                college: '学院',
                rss: 'RSS',
                api: 'API',
                website: '网站',
                manual: '手动'
            }
            return map[type] || type
        },

        getParseStrategyText(strategy) {
            const map = {
                'ai-parse': 'AI解析',
                'regex-parse': '正则解析',
                'no-parse': '纯文本'
            }
            return map[strategy] || strategy
        },

        formatTime(timestamp) {
            if (!timestamp) return '从未'
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        },

        onTierFilterChange(e) {
            const idx = e.detail.value
            this.tierFilter = idx === 0 ? 'all' : this.tierOptions[idx]
        },

        onCrawlStatusFilterChange(e) {
            const idx = e.detail.value
            this.crawlStatusFilter = idx === 0 ? 'all' : this.crawlStatusOptions[idx]
        },

        onParseStrategyChange(e) {
            this.formData.parseStrategy = this.parseStrategyOptions[e.detail.value].value
        },

        toggleBulkMode() {
            console.log('[sources.vue][toggleBulkMode] 点击批量管理, bulkMode切换为:', !this.bulkMode);
            console.log('[sources.vue][toggleBulkMode] 当前sourceList数量:', this.sourceList.length);
            console.log('[sources.vue][toggleBulkMode] 当前filteredSourceList数量:', this.filteredSourceList.length);
            this.bulkMode = !this.bulkMode
            console.log('[sources.vue][toggleBulkMode] 切换后bulkMode=', this.bulkMode, ', bulkSelected=', JSON.stringify(this.bulkSelected));
            if (!this.bulkMode) {
                this.bulkSelected = []
                this.suggestions = []
                console.log('[sources.vue][toggleBulkMode] 退出批量模式，已清空bulkSelected和suggestions');
            }
        },

        toggleExpand(key) {
            this.expandedKeys[key] = !this.expandedKeys[key]
        },

        toggleCollapseAll() {
            this.allExpanded = !this.allExpanded
            if (this.allExpanded) {
                // 展开时重新计算所有 key
                for (const cat of Object.keys(this.expandedKeys)) {
                    this.expandedKeys[cat] = true
                }
            } else {
                // 折叠时全部设为 false
                for (const key in this.expandedKeys) {
                    this.expandedKeys[key] = false
                }
            }
        },

        toggleBulkSelected(id) {
            console.log('[sources.vue][toggleBulkSelected] 点击checkbox, 传入的id:', id, '| 当前bulkSelected:', JSON.stringify(this.bulkSelected));
            const idx = this.bulkSelected.indexOf(id)
            console.log('[sources.vue][toggleBulkSelected] indexOf结果:', idx);
            if (idx >= 0) {
                this.bulkSelected = this.bulkSelected.filter(i => i !== id)
                console.log('[sources.vue][toggleBulkSelected] 已取消选中, 新的bulkSelected:', JSON.stringify(this.bulkSelected));
            } else {
                this.bulkSelected = [...this.bulkSelected, id]
                console.log('[sources.vue][toggleBulkSelected] 已选中, 新的bulkSelected:', JSON.stringify(this.bulkSelected));
            }
        },

        async batchSuggest() {
            console.log('[sources.vue][batchSuggest] ===== 点击了AI建议按钮 =====');
            console.log('[sources.vue][batchSuggest] 当前选中的bulkSelected:', JSON.stringify(this.bulkSelected));
            try {
                uni.showLoading({ title: '正在获取AI建议...' })
                const params = this.bulkSelected.length > 0 ? { ids: this.bulkSelected } : {}
                console.log('[sources.vue][batchSuggest] 发送给云函数的params:', JSON.stringify(params));
                const result = await adminApi.manageSources('batchSuggest', params)
                console.log('[sources.vue][batchSuggest] 收到云函数返回:', JSON.stringify(result));
                uni.hideLoading()
                // api.call 返回的是 cloud function 的 data 字段（数组），不是 { code, data } 结构
                if (result && Array.isArray(result)) {
                    this.suggestions = result
                    console.log('[sources.vue][batchSuggest] 设置suggestions为:', JSON.stringify(this.suggestions));
                    uni.showToast({ title: `获得${this.suggestions.length}条建议`, icon: 'success' })
                } else {
                    console.error('[sources.vue][batchSuggest] 返回结果不符合预期:', JSON.stringify(result));
                    uni.showToast({ title: '获取建议失败', icon: 'none' })
                }
            } catch (e) {
                console.error('[sources.vue][batchSuggest] 捕获到错误:', e);
                uni.hideLoading()
                uni.showToast({ title: '获取建议失败', icon: 'none' })
            }
        },

        async batchMigrate() {
            console.log('[sources.vue][batchMigrate] ===== 点击了应用建议按钮 =====');
            console.log('[sources.vue][batchMigrate] 当前选中的bulkSelected:', JSON.stringify(this.bulkSelected));
            if (this.bulkSelected.length === 0) {
                uni.showToast({ title: '请先选择数据源', icon: 'none' })
                return
            }
            uni.showModal({
                title: '确认批量更新',
                content: `确定要更新选中的 ${this.bulkSelected.length} 个数据源分类吗？`,
                success: async (modalRes) => {
                    if (modalRes.confirm) {
                        try {
                            console.log('[sources.vue][batchMigrate] 用户确认，开始调用云函数');
                            uni.showLoading({ title: '正在更新...' })
                            const result = await adminApi.manageSources('batchMigrate', { ids: this.bulkSelected })
                            console.log('[sources.vue][batchMigrate] 收到云函数返回:', JSON.stringify(result));
                            uni.hideLoading()
                            // api.call 返回的是 cloud function 的 data 字段，结构为 { updated: N }
                            if (result && typeof result.updated === 'number') {
                                uni.showToast({ title: '更新成功', icon: 'success' })
                                this.bulkMode = false
                                this.bulkSelected = []
                                this.suggestions = []
                                this.loadSources()
                            } else {
                                console.error('[sources.vue][batchMigrate] 返回结果不符合预期:', JSON.stringify(result));
                                uni.showToast({ title: '更新失败', icon: 'none' })
                            }
                        } catch (e) {
                            console.error('[sources.vue][batchMigrate] 捕获到错误:', e);
                            uni.hideLoading()
                            uni.showToast({ title: '更新失败', icon: 'none' })
                        }
                    } else {
                        console.log('[sources.vue][batchMigrate] 用户取消批量更新');
                    }
                }
            })
        },

        selectAndImport() {
            wx.chooseMessageFile({
                count: 10,
                type: 'file',
                extension: ['json'],
                success: (res) => {
                    this.importing = true;
                    this.importProgress = '正在读取文件...';
                    const files = res.tempFiles;
                    let totalImported = 0;
                    let totalUpdated = 0;
                    let totalFailed = 0;
                    const processFile = async (index) => {
                        if (index >= files.length) {
                            this.importing = false;
                            uni.showModal({
                                title: '导入完成',
                                content: '新增: ' + totalImported + ', 更新: ' + totalUpdated + ', 失败: ' + totalFailed,
                                showCancel: false
                            });
                            this.loadSources();
                            return;
                        }
                        const file = files[index];
                        this.importProgress = '正在处理 ' + (index + 1) + '/' + files.length + '...';
                        try {
                            let fileContent = '';
                            try {
                                const res = await new Promise((resolve, reject) => {
                                    wx.getFileSystemManager().readFile({
                                        filePath: file.path,
                                        encoding: 'utf8',
                                        success: resolve,
                                        fail: reject
                                    });
                                });
                                fileContent = res.data;
                            } catch (e) {
                                totalFailed++;
                                processFile(index + 1);
                                return;
                            }
                            const filename = file.name.replace(/\.json$/i, '');
                            let entries = [];
                            try {
                                entries = JSON.parse(fileContent);
                            } catch (e) {
                                totalFailed++;
                                processFile(index + 1);
                                return;
                            }
                            if (!Array.isArray(entries)) {
                                entries = [entries];
                            }
                            const result = await adminApi.manageSources('importSources', {
                                category: filename,
                                entries: entries
                            });
                            console.log('[sources.vue][selectAndImport] 文件:', filename, '| entries.length:', entries.length, '| 云函数返回:', JSON.stringify(result));
                            if (result && typeof result.imported === 'number') {
                                totalImported += result.imported || 0;
                                totalUpdated += result.updated || 0;
                                totalFailed += result.failed || 0;
                            } else {
                                console.error('[sources.vue][selectAndImport] 导入失败，云函数返回格式异常:', JSON.stringify(result));
                                totalFailed += entries.length;
                            }
                        } catch (e) {
                            totalFailed++;
                        }
                        processFile(index + 1);
                    };
                    processFile(0);
                },
                fail: (e) => {
                    uni.showToast({ title: '选择文件失败', icon: 'none' });
                }
            });
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    padding: 16px;
}

.add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
    background-color: #07C160;
    color: #FFFFFF;
    border-radius: 12px;
    margin-bottom: 12px;
    font-size: 16px;
}

.filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background-color: #FFFFFF;
    border-radius: 12px;

    .filter-picker {
        flex: 1;
        height: 36px;
        background-color: #F7F9FA;
        border-radius: 8px;
        display: flex;
        align-items: center;
        padding: 0 12px;

        .picker-value {
            font-size: 12px;
            color: #666;
        }
    }

    .bulk-toggle {
        height: 36px;
        padding: 0 12px;
        background-color: #E3F2FD;
        border-radius: 8px;
        display: flex;
        align-items: center;

        text {
            font-size: 12px;
            color: #007AFF;
        }
    }

    .import-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 12px;
        background-color: #07C160;
        color: #fff;
        border-radius: 8px;
        font-size: 12px;

        &[disabled] {
            background-color: #ccc;
        }
    }
}

.bulk-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background-color: #FFF3E0;
    border-radius: 12px;
    margin-bottom: 12px;

    .bulk-count {
        flex: 1;
        font-size: 13px;
        color: #E65100;
    }

    .bulk-btn {
        padding: 6px 14px;
        border-radius: 16px;
        font-size: 12px;

        &.suggest {
            background-color: #007AFF;
            color: #fff;
        }

        &.migrate {
            background-color: #34C759;
            color: #fff;
        }
    }
}

.import-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background-color: #E8F5E9;
    border-radius: 12px;
    margin-bottom: 12px;

    text {
        font-size: 14px;
        color: #07C160;
    }
}

.source-list {
    .source-item {
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;

        .source-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;

            .bulk-checkbox {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 4px;
                flex-shrink: 0;
            }

            .source-info {
                display: flex;
                align-items: center;
                gap: 8px;

                .source-name {
                    font-size: 16px;
                    font-weight: 600;
                    color: #0A2540;
                }

                .source-type {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background-color: #E3F2FD;
                    color: #007AFF;

                    &.official { background-color: #E3F2FD; color: #007AFF; }
                    &.college { background-color: #F3E5F5; color: #5856D6; }
                    &.rss { background-color: #FFF3E0; color: #FF9500; }
                    &.api { background-color: #E3F2FD; color: #007AFF; }
                    &.website { background-color: #F3E5F5; color: #5856D6; }
                    &.manual { background-color: #E8F5E9; color: #07C160; }
                }

                .source-category {
                    font-size: 12px;
                    color: #999;
                }
            }

            .switch-disabled {
                pointer-events: none;
                opacity: 0.5;
            }
        }

        .classification-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 6px;

            .badge {
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
            }

            .tier {
                &.tier1 { background: #FF3B30; color: #fff; }
                &.tier2 { background: #FF9500; color: #fff; }
                &.tier3 { background: #8E8E93; color: #fff; }
            }

            .status {
                &.crawl { background: #34C759; color: #fff; }
                &.no-crawl { background: #8E8E93; color: #fff; }
                &.deprecated { background: #FF3B30; color: #fff; }
            }

            .strategy {
                &.ai-parse { background: #9C27B0; color: #fff; }
                &.regex-parse { background: #2196F3; color: #fff; }
                &.no-parse { background: #607D8B; color: #fff; }
            }

            .owner {
                font-size: 10px;
                color: #666;
            }
        }

        .source-url {
            font-size: 12px;
            color: #999;
            margin-bottom: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .source-stats {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: #666;
            margin-bottom: 12px;
            align-items: center;

            .update-badge {
                background-color: #FF3B30;
                color: #fff;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
            }
        }

        .source-actions {
            display: flex;
            gap: 12px;
            padding-top: 12px;
            border-top: 1px solid #F0F0F0;

            .action-btn {
                font-size: 14px;
                color: #07C160;

                &.delete {
                    color: #FF3B30;
                }

                &.sync {
                    color: #FF9500;
                }
            }
        }
    }

    .empty {
        text-align: center;
        padding: 40px;
        color: #999;
    }

    // 树形折叠工具栏
    .tree-toolbar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 8px;

        .collapse-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 12px;
            background-color: #F0F0F0;
            border-radius: 12px;
            font-size: 12px;
            color: #666;
        }
    }

    // 二级分组
    .subgroup-group {
        margin-bottom: 8px;

        .subgroup-header {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background-color: #E8F5E9;
            border-radius: 8px;
            margin-bottom: 6px;

            .subgroup-name {
                flex: 1;
                font-size: 13px;
                color: #1B5E20;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .subgroup-count {
                font-size: 11px;
                color: #4CAF50;
                background-color: #C8E6C9;
                padding: 2px 8px;
                border-radius: 10px;
            }
        }

        .subgroup-items {
            .source-item {
                margin-left: 16px;
                border-left: 3px solid #4CAF50;
            }
        }
    }
}

// 添加/编辑弹窗
.source-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;

    .modal-mask {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .modal-content {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #FFFFFF;
        border-radius: 16px 16px 0 0;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
        font-size: 18px;
        font-weight: 600;

        .close-btn {
            font-size: 24px;
            color: #999;
            padding: 0 8px;
        }
    }

    .modal-body {
        flex: 1;
        padding: 20px;
        max-height: 60vh;
    }

    .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid #eee;
    }

    .form-group {
        margin-bottom: 16px;

        .label {
            display: block;
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }

        .input {
            width: 100%;
            height: 44px;
            background-color: #F7F9FA;
            border-radius: 8px;
            padding: 0 12px;
            font-size: 14px;
        }

        .picker {
            height: 44px;
            background-color: #F7F9FA;
            border-radius: 8px;
            padding: 0 12px;
            line-height: 44px;
            font-size: 14px;
        }

        .hint {
            display: block;
            font-size: 12px;
            color: #999;
            margin-top: 4px;
        }

        .url-input-group {
            display: flex;
            gap: 8px;

            .input {
                flex: 1;
            }

            .analyze-btn {
                width: 90px;
                height: 44px;
                background-color: #07C160;
                color: #fff;
                border-radius: 8px;
                font-size: 12px;
                padding: 0;
                line-height: 44px;

                &[disabled] {
                    background-color: #ccc;
                }
            }
        }
    }

    .suggestion-box {
        background-color: #F0F9FF;
        border: 1px solid #B3E0FF;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;

        .suggestion-header {
            font-size: 12px;
            color: #007AFF;
            margin-bottom: 12px;
            font-weight: 600;
        }
    }

    .submit-btn {
        width: 100%;
        height: 48px;
        background-color: #07C160;
        color: #FFFFFF;
        border-radius: 24px;
        font-size: 16px;
    }
}
</style>

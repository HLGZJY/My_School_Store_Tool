<template>
    <view class="filter-panel">
        <!-- 筛选按钮 -->
        <view class="filter-bar" @click="togglePanel">
            <view class="filter-tags">
                <view
                    v-if="activeFilters.sourceName"
                    class="filter-tag active"
                    @click.stop="clearSource"
                >
                    {{ activeFilters.sourceName }}
                    <uni-icons type="closeempty" size="12" color="#FFFFFF"></uni-icons>
                </view>
                <view
                    v-if="activeFilters.tag"
                    class="filter-tag active"
                    @click.stop="clearTag"
                >
                    {{ activeFilters.tag }}
                    <uni-icons type="closeempty" size="12" color="#FFFFFF"></uni-icons>
                </view>
                <view
                    v-if="activeFilters.timeRange"
                    class="filter-tag active"
                    @click.stop="clearTimeRange"
                >
                    {{ timeRangeLabels[activeFilters.timeRange] }}
                    <uni-icons type="closeempty" size="12" color="#FFFFFF"></uni-icons>
                </view>
            </view>
            <view class="filter-icon" :class="{ active: showPanel }">
                <uni-icons type="funnel" size="18" :color="hasActiveFilters ? '#00D4AA' : '#A0AEC0'"></uni-icons>
                <text class="filter-text" :class="{ active: hasActiveFilters }">筛选</text>
            </view>
        </view>

        <!-- 筛选面板 - 右侧抽屉 -->
        <view v-if="showPanel" class="filter-drawer" :class="{ open: showPanel }" @click.stop>
            <!-- 来源筛选 -->
            <view class="filter-section" v-if="showSource">
                <view class="section-title">来源</view>

                <!-- 分组模式 -->
                <view v-if="groupByOwner && groupedSources.length > 0" class="source-groups">
                    <view v-for="(group, gi) in groupedSources" :key="group.owner" class="source-group">
                        <view class="group-header" @click="toggleGroup(gi)">
                            <text class="group-name">{{ group.label }}</text>
                            <text class="group-count">{{ group.sources.length }}</text>
                            <uni-icons :type="expandedGroups[gi] ? 'top' : 'bottom'" size="12" color="#A0AEC0"></uni-icons>
                        </view>
                        <view v-if="expandedGroups[gi]" class="group-items">
                            <view
                                v-for="source in group.sources"
                                :key="source.id"
                                class="source-item"
                                :class="{ active: selectedSource === source.id }"
                                @click="selectSource(source.id)"
                            >
                                {{ source.name }}
                            </view>
                        </view>
                    </view>
                </view>

                <!-- 原始横向滚动模式 -->
                <scroll-view v-else scroll-x class="source-scroll">
                    <view class="source-list">
                        <view
                            v-for="source in sources"
                            :key="source.id"
                            class="source-item"
                            :class="{ active: selectedSource === source.id }"
                            @click="selectSource(source.id)"
                        >
                            {{ source.name }}
                        </view>
                    </view>
                </scroll-view>
            </view>

            <!-- 标签筛选 -->
            <view class="filter-section" v-if="showTag">
                <view class="section-title">标签</view>
                <view class="tag-list">
                    <view
                        v-for="tag in tags"
                        :key="tag"
                        class="tag-item"
                        :class="{ active: selectedTag === tag }"
                        @click="selectTag(tag)"
                    >
                        {{ tag }}
                    </view>
                </view>
            </view>

            <!-- 发布时间筛选 -->
            <view class="filter-section" v-if="showTime">
                <view class="section-title">发布时间</view>
                <view class="time-list">
                    <view
                        v-for="item in timeRanges"
                        :key="item.value"
                        class="time-item"
                        :class="{ active: selectedTimeRange === item.value }"
                        @click="selectTimeRange(item.value)"
                    >
                        {{ item.label }}
                    </view>
                </view>
            </view>

            <!-- 操作按钮 -->
            <view class="filter-actions">
                <view class="reset-btn" @click="resetFilters">重置</view>
                <view class="confirm-btn" @click="confirmFilters">确定</view>
            </view>
        </view>

        <!-- 遮罩层 -->
        <view v-if="showPanel" class="filter-mask" @click="closePanel"></view>
    </view>
</template>

<script>
export default {
    name: 'FilterPanel',
    props: {
        // 显示哪些筛选
        showSource: {
            type: Boolean,
            default: true
        },
        showTag: {
            type: Boolean,
            default: true
        },
        showTime: {
            type: Boolean,
            default: true
        },
        // 数据源
        sources: {
            type: Array,
            default: () => [
                { id: 'jwc', name: '教务处' },
                { id: 'library', name: '图书馆' },
                { id: 'xsc', name: '学生处' },
                { id: 'cs', name: '计算机学院' },
                { id: 'jyzd', name: '就业指导中心' },
                { id: 'yjs', name: '研究生院' },
                { id: 'kjc', name: '科技处' },
                { id: 'rsc', name: '人事处' }
            ]
        },
        // 标签选项（对应 category 字段：notice/activity/academic/service/publicity）
        tags: {
            type: Array,
            default: () => []
        },
        // 同步模式：true=即时同步（每次选择变化都emit），false=确认模式（点击确定按钮才emit）
        syncMode: {
            type: Boolean,
            default: false
        },
        // 是否按 owner 分组显示数据源
        groupByOwner: {
            type: Boolean,
            default: false
        }
    },
    emits: ['filterChange'],
    data() {
        return {
            showPanel: false,
            selectedSource: '',
            selectedTag: '',
            selectedTimeRange: '',
            expandedGroups: {},
            timeRangeLabels: {
                '1d': '最近1天',
                '7d': '最近7天',
                '30d': '最近1个月',
                'all': '更久'
            }
        }
    },
    computed: {
        timeRanges() {
            return [
                { value: '1d', label: '最近1天' },
                { value: '7d', label: '最近7天' },
                { value: '30d', label: '最近1个月' },
                { value: 'all', label: '更久' }
            ]
        },
        hasActiveFilters() {
            return !!(this.selectedSource || this.selectedTag || this.selectedTimeRange)
        },
        activeFilters() {
            const filters = {}
            if (this.selectedSource) {
                const source = this.sources.find(s => s.id === this.selectedSource)
                filters.sourceName = source ? source.name : ''
            }
            if (this.selectedTag) {
                filters.tag = this.selectedTag
            }
            if (this.selectedTimeRange) {
                filters.timeRange = this.selectedTimeRange
            }
            return filters
        },
        groupedSources() {
            if (!this.groupByOwner) return []
            const groupMap = {}
            for (const s of this.sources) {
                const owner = s.owner || '其他/未分类'
                // 提取显示标签：如 "机关部处/教务处" -> "机关部处"
                const parts = owner.split('/')
                const label = parts[0]
                const sub = parts[1] || ''
                const key = label
                if (!groupMap[key]) {
                    groupMap[key] = { owner: key, label, sources: [] }
                }
                groupMap[key].sources.push(s)
            }
            // 排序：机关部处 > 学院 > 直属单位 > 新闻/通知 > 学生组织 > 其他
            const order = ['机关部处', '学院', '直属单位', '新闻', '学生组织', '其他']
            return Object.values(groupMap).sort((a, b) => {
                const ai = order.indexOf(a.label) >= 0 ? order.indexOf(a.label) : 999
                const bi = order.indexOf(b.label) >= 0 ? order.indexOf(b.label) : 999
                return ai - bi
            })
        }
    },
    methods: {
        togglePanel() {
            this.showPanel = !this.showPanel
        },
        closePanel() {
            this.showPanel = false
        },
        selectSource(id) {
            this.selectedSource = this.selectedSource === id ? '' : id
            if (this.syncMode) {
                this.confirmFilters()
            }
        },
        selectTag(tag) {
            this.selectedTag = this.selectedTag === tag ? '' : tag
            if (this.syncMode) {
                this.confirmFilters()
            }
        },
        selectTimeRange(value) {
            this.selectedTimeRange = this.selectedTimeRange === value ? '' : value
            if (this.syncMode) {
                this.confirmFilters()
            }
        },
        clearSource() {
            this.selectedSource = ''
        },
        clearTag() {
            this.selectedTag = ''
        },
        clearTimeRange() {
            this.selectedTimeRange = ''
        },
        toggleGroup(index) {
            this.$set(this.expandedGroups, index, !this.expandedGroups[index])
        },
        resetFilters() {
            this.selectedSource = ''
            this.selectedTag = ''
            this.selectedTimeRange = ''
        },
        confirmFilters() {
            const filters = {
                sourceId: this.selectedSource || '',
                tag: this.selectedTag || '',
                timeRange: this.selectedTimeRange || ''
            }
            this.$emit('filterChange', filters)
            // Only close panel in confirm mode (syncMode=false)
            // In syncMode, panel stays open so user can select multiple filters
            if (!this.syncMode) {
                this.showPanel = false
            }
        },
        // 外部设置筛选条件
        setFilters(filters) {
            if (filters.sourceId) this.selectedSource = filters.sourceId
            if (filters.tag) this.selectedTag = filters.tag
            if (filters.timeRange) this.selectedTimeRange = filters.timeRange
        },
        // 清空筛选
        clearFilters() {
            this.resetFilters()
        }
    }
}
</script>

<style lang="scss" scoped>
.filter-panel {
    position: relative;
    background-color: #FFFFFF;
    border-bottom: 1px solid #E8ECF1;
}

.filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
}

.filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex: 1;
}

.filter-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background-color: #00D4AA;
    border-radius: 4px;
    font-size: 12px;
    color: #FFFFFF;
}

.filter-icon {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background-color: #F7F9FA;
    border-radius: 6px;

    &.active {
        background-color: #E6FFF9;
    }
}

.filter-text {
    font-size: 14px;
    color: #A0AEC0;

    &.active {
        color: #00D4AA;
    }
}

.filter-drawer {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background-color: #FFFFFF;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
}

.filter-drawer.open {
    transform: translateX(0);
}

.filter-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    z-index: 99;
}

.filter-section {
    padding: 16px;
    border-bottom: 1px solid #F0F0F0;

    &:last-of-type {
        border-bottom: none;
    }
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: #0A2540;
    margin-bottom: 12px;
}

.source-scroll {
    white-space: nowrap;
}

.source-list {
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 8px;
}

.source-item {
    padding: 8px 16px;
    background-color: #F7F9FA;
    border-radius: 6px;
    font-size: 14px;
    color: #4A5568;
    white-space: nowrap;

    &.active {
        background-color: #00D4AA;
        color: #FFFFFF;
    }
}

.source-groups {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.source-group {
    border: 1px solid #E8ECF1;
    border-radius: 8px;
    overflow: hidden;
}

.group-header {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background-color: #F7F9FA;
    gap: 8px;

    .group-name {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
        color: #0A2540;
    }

    .group-count {
        font-size: 12px;
        color: #A0AEC0;
        background-color: #E8ECF1;
        padding: 2px 8px;
        border-radius: 10px;
    }
}

.group-items {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px;

    .source-item {
        font-size: 13px;
        padding: 6px 12px;
    }
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tag-item {
    padding: 6px 14px;
    background-color: #F7F9FA;
    border-radius: 16px;
    font-size: 13px;
    color: #4A5568;

    &.active {
        background-color: #00D4AA;
        color: #FFFFFF;
    }
}

.time-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.time-item {
    padding: 8px 16px;
    background-color: #F7F9FA;
    border-radius: 6px;
    font-size: 14px;
    color: #4A5568;

    &.active {
        background-color: #00D4AA;
        color: #FFFFFF;
    }
}

.filter-actions {
    display: flex;
    padding: 16px;
    gap: 12px;
    border-top: 1px solid #E8ECF1;
}

.reset-btn {
    flex: 1;
    height: 40px;
    line-height: 40px;
    text-align: center;
    background-color: #F7F9FA;
    border-radius: 8px;
    font-size: 14px;
    color: #4A5568;
}

.confirm-btn {
    flex: 1;
    height: 40px;
    line-height: 40px;
    text-align: center;
    background-color: #00D4AA;
    border-radius: 8px;
    font-size: 14px;
    color: #FFFFFF;
    font-weight: 600;
}
</style>

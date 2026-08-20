<template>
    <view class="section">
        <view class="section-header">
            <text class="section-title">📅 时间轴</text>
            <!-- 时间范围选择器 -->
            <view class="time-range-selector">
                <view
                    v-for="item in timeRanges"
                    :key="item.value"
                    class="range-btn"
                    :class="{ active: selectedRange === item.value }"
                    @click="selectRange(item.value)"
                >
                    {{ item.label }}
                </view>
            </view>
        </view>

        <view class="timeline">
            <view
                v-for="item in timeline"
                :key="item.timestamp"
                class="timeline-item-wrap"
            >
                <view class="timeline-item" @click="toggleItem(item)">
                    <view class="timeline-date">
                        <text class="year">{{ getYear(item) }}</text>
                        <text class="date">{{ item.date }}</text>
                        <text class="count">{{ item.count }}篇</text>
                    </view>
                    <view class="timeline-arrow">
                        <uni-icons :type="item.expanded ? 'up' : 'down'" size="16" color="#A0AEC0"></uni-icons>
                    </view>
                </view>

                <!-- 展开的内容 - 在时间节点下方显示 -->
                <view v-if="item.expanded" class="expanded-content">
                    <view
                        v-for="article in item.articles"
                        :key="article._id"
                        class="timeline-article"
                        @click="goToDetail(article._id)"
                    >
                        <text class="article-title">{{ article.title }}</text>
                        <text class="article-time">{{ formatTime(article.publishTime) }}</text>
                    </view>
                    <view v-if="!item.articles || item.articles.length === 0" class="no-articles">
                        <text class="no-articles-text">暂无文章</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'Timeline',
    props: {
        timeline: {
            type: Array,
            default: () => []
        }
    },
    emits: ['toggle', 'detail', 'rangeChange'],
    data() {
        return {
            selectedRange: 'week',
            timeRanges: [
                { value: 'week', label: '本周' },
                { value: 'month', label: '本月' },
                { value: 'all', label: '全部' }
            ]
        }
    },
    methods: {
        selectRange(range) {
            if (this.selectedRange === range) return
            this.selectedRange = range
            this.$emit('rangeChange', range)
        },
        async toggleItem(item) {
            item.expanded = !item.expanded
            if (item.expanded) {
                // 展开时通知父组件加载文章
                this.$emit('toggle', item)
            }
        },
        getYear(item) {
            // 优先使用 item.year，否则从 timestamp 提取
            if (item.year) return item.year
            if (item.timestamp) {
                return new Date(item.timestamp).getFullYear() + '年'
            }
            return ''
        },
        formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
        },
        goToDetail(id) {
            this.$emit('detail', id)
        }
    }
}
</script>

<style lang="scss" scoped>
.section {
    padding: 20px;
    background-color: #FFFFFF;
    margin-bottom: 8px;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
}

.time-range-selector {
    display: flex;
    gap: 4px;
    background-color: #F7F9FA;
    border-radius: 6px;
    padding: 2px;
}

.range-btn {
    padding: 4px 10px;
    font-size: 12px;
    color: #4A5568;
    border-radius: 4px;

    &.active {
        background-color: #00D4AA;
        color: #FFFFFF;
    }
}

.timeline-item-wrap {
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }
}

.timeline-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;

    &:active {
        background-color: #F7F9FA;
    }
}

.timeline-date {
    display: flex;
    align-items: center;
    gap: 8px;

    .year {
        font-size: 12px;
        color: #00D4AA;
        font-weight: 600;
    }

    .date {
        font-size: 14px;
        font-weight: 600;
        color: #0A2540;
    }

    .count {
        font-size: 12px;
        color: #A0AEC0;
    }
}

.expanded-content {
    padding: 0 12px 12px 12px;
    background-color: #F7F9FA;
}

.timeline-article {
    padding: 12px 0;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }

    &:active {
        background-color: #FFFFFF;
    }

    .article-title {
        display: block;
        font-size: 14px;
        color: #4A5568;
        margin-bottom: 4px;
    }

    .article-time {
        display: block;
        font-size: 12px;
        color: #A0AEC0;
    }
}

.no-articles {
    padding: 20px 0;
    text-align: center;

    .no-articles-text {
        font-size: 14px;
        color: #A0AEC0;
    }
}
</style>

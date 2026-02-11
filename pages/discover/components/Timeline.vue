<template>
    <view class="section">
        <view class="section-header">
            <text class="section-title">📅 时间轴</text>
        </view>

        <view class="timeline">
            <view
                v-for="item in timeline"
                :key="item.timestamp"
                class="timeline-item"
                @click="toggleItem(item)"
            >
                <view class="timeline-date">
                    <text class="date">{{ item.date }}</text>
                    <text class="count">{{ item.count }}篇</text>
                </view>
                <view class="timeline-arrow">
                    <uni-icons :type="item.expanded ? 'up' : 'down'" size="16" color="#A0AEC0"></uni-icons>
                </view>
            </view>
        </view>

        <!-- 展开的内容 -->
        <view v-if="expandedItem" class="expanded-content">
            <view
                v-for="article in expandedItem.articles"
                :key="article._id"
                class="timeline-article"
                @click="goToDetail(article._id)"
            >
                <text class="article-title">{{ article.title }}</text>
                <text class="article-time">{{ formatTime(article.publishTime) }}</text>
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
    emits: ['toggle', 'detail'],
    data() {
        return {
            expandedItem: null
        }
    },
    methods: {
        async toggleItem(item) {
            // 关闭已展开的项目
            if (this.expandedItem && this.expandedItem.timestamp === item.timestamp) {
                item.expanded = !item.expanded
                if (!item.expanded) {
                    this.expandedItem = null
                }
            } else {
                if (this.expandedItem) {
                    this.expandedItem.expanded = false
                }
                item.expanded = true
                this.expandedItem = item
                // 通知父组件加载文章
                this.$emit('toggle', item)
            }
        },
        formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
        },
        goToDetail(id) {
            this.$emit('detail', id)
        }
    },
    watch: {
        timeline: {
            handler(newVal) {
                // 同步展开状态
                if (this.expandedItem) {
                    const found = newVal.find(t => t.timestamp === this.expandedItem.timestamp)
                    if (found) {
                        this.expandedItem = found
                    }
                }
            },
            deep: true
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
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
}

.timeline-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }

    &:active {
        background-color: #F7F9FA;
    }
}

.timeline-date {
    .date {
        font-size: 14px;
        font-weight: 600;
        color: #0A2540;
        margin-right: 12px;
    }

    .count {
        font-size: 12px;
        color: #A0AEC0;
    }
}

.expanded-content {
    padding: 0 20px;
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
</style>

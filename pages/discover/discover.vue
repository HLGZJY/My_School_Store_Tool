<template>
    <view class="container">
        <!-- 热门排行 -->
        <view class="section">
            <view class="section-header">
                <text class="section-title">🔥 热门排行</text>
                <text class="more-link" @click="viewMoreRanking">查看更多</text>
            </view>
            <view class="ranking-list">
                <view
                    v-for="(item, index) in ranking"
                    :key="item._id"
                    class="ranking-item"
                    @click="goToDetail(item._id)"
                >
                    <view class="rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</view>
                    <view class="ranking-info">
                        <text class="article-title">{{ item.title }}</text>
                        <text class="article-meta">{{ item.count }} 阅读</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 标签云 -->
        <view class="section">
            <view class="section-header">
                <text class="section-title">🏷️ 标签云</text>
            </view>
            <view class="tag-cloud">
                <view
                    v-for="tag in tags"
                    :key="tag.name"
                    class="tag-item"
                    :style="{ fontSize: getTagSize(tag.count) }"
                    @click="searchTag(tag.name)"
                >
                    {{ tag.name }}
                </view>
            </view>
        </view>

        <!-- 时间轴 -->
        <view class="section">
            <view class="section-header">
                <text class="section-title">📅 时间轴</text>
            </view>
            <view class="timeline">
                <view
                    v-for="item in timeline"
                    :key="item.timestamp"
                    class="timeline-item"
                    @click="toggleTimeline(item)"
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
        </view>

        <!-- 展开的时间轴内容 -->
        <view v-if="expandedTimeline" class="expanded-content">
            <view
                v-for="article in expandedTimeline.articles"
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
    data() {
        return {
            ranking: [],
            tags: [],
            timeline: [],
            expandedTimeline: null
        }
    },
    onLoad() {
        this.loadHotRanking()
        this.loadTagCloud()
        this.loadTimeline()
    },
    methods: {
        async loadHotRanking() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'getHotRanking',
                    data: {
                        type: 'view',
                        days: 7,
                        limit: 5
                    }
                })

                if (res.result.code === 0) {
                    this.ranking = res.result.data.ranking || []
                }
            } catch (error) {
                console.error('加载热门排行失败:', error)
            }
        },

        async loadTagCloud() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'getTagCloud',
                    data: {
                        limit: 20
                    }
                })

                if (res.result.code === 0) {
                    this.tags = res.result.data.tags || []
                }
            } catch (error) {
                console.error('加载标签云失败:', error)
            }
        },

        async loadTimeline() {
            try {
                const userId = this.$store.state.user.userId

                const res = await uniCloud.callFunction({
                    name: 'getTimeline',
                    data: {
                        userId
                    }
                })

                if (res.result.code === 0) {
                    this.timeline = res.result.data.timeline || []
                }
            } catch (error) {
                console.error('加载时间轴失败:', error)
            }
        },

        getTagSize(count) {
            const minCount = Math.min(...this.tags.map(t => t.count))
            const maxCount = Math.max(...this.tags.map(t => t.count))
            const ratio = (count - minCount) / (maxCount - minCount)
            const minSize = 14
            const maxSize = 18
            return minSize + ratio * (maxSize - minSize) + 'px'
        },

        toggleTimeline(item) {
            if (this.expandedTimeline && this.expandedTimeline.timestamp === item.timestamp) {
                item.expanded = !item.expanded
                if (!item.expanded) {
                    this.expandedTimeline = null
                }
            } else {
                if (this.expandedTimeline) {
                    this.expandedTimeline.expanded = false
                }
                item.expanded = true
                this.expandedTimeline = item
                this.loadTimelineArticles(item)
            }
        },

        async loadTimelineArticles(timelineItem) {
            try {
                const userId = this.$store.state.user.userId

                const res = await uniCloud.callFunction({
                    name: 'getArticles',
                    data: {
                        userId,
                        page: 1,
                        pageSize: 50,
                        startDate: timelineItem.timestamp,
                        endDate: timelineItem.timestamp + 24 * 60 * 60 * 1000
                    }
                })

                if (res.result.code === 0) {
                    timelineItem.articles = res.result.data.articles || []
                }
            } catch (error) {
                console.error('加载时间轴文章失败:', error)
            }
        },

        searchTag(tag) {
            uni.navigateTo({
                url: `/pages/search/search?keyword=${tag}`
            })
        },

        viewMoreRanking() {
            // 可以跳转到专门的热门排行页面
            uni.showToast({
                title: '功能开发中',
                icon: 'none'
            })
        },

        goToDetail(id) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${id}`
            })
        },

        formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

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

.more-link {
    font-size: 14px;
    color: #00D4AA;
}

.ranking-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }
}

.rank {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #E8ECF1;
    color: #4A5568;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    margin-right: 12px;

    &.rank-1 {
        background-color: #FFD700;
        color: #FFFFFF;
    }

    &.rank-2 {
        background-color: #C0C0C0;
        color: #FFFFFF;
    }

    &.rank-3 {
        background-color: #CD7F32;
        color: #FFFFFF;
    }
}

.ranking-info {
    flex: 1;

    .article-title {
        display: block;
        font-size: 14px;
        color: #4A5568;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
    }

    .article-meta {
        display: block;
        font-size: 12px;
        color: #A0AEC0;
    }
}

.tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tag-item {
    padding: 8px 16px;
    background-color: #F7F9FA;
    border-radius: 20px;
    color: #4A5568;

    &:active {
        background-color: #E8ECF1;
    }
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

<template>
    <view class="container">
        <view class="header">
            <text class="title">阅读历史</text>
            <view class="clear-btn" @click="clearHistory">
                <uni-icons type="trash" size="16" color="#EF4444"></uni-icons>
                <text>清空</text>
            </view>
        </view>

        <!-- 筛选面板 -->
        <FilterPanel
            :sources="sources"
            :showTag="false"
            @filterChange="onFilterChange"
        />

        <scroll-view class="content" scroll-y @scrolltolower="loadMore">
            <view v-if="history.length > 0">
                <view
                    v-for="item in history"
                    :key="item._id"
                    class="history-card"
                    @click="goToDetail(item.articleId)"
                >
                    <text class="article-title">{{ item.article?.title || '未知标题' }}</text>
                    <text class="article-meta">{{ item.article?.sourceName || '未知来源' }} | {{ formatTime(item.readTime) }} | 阅读时长 {{ formatDuration(item.duration) }}</text>
                </view>

                <view v-if="loading" class="loading-more">
                    <uni-load-more status="loading"></uni-load-more>
                </view>
                <view v-if="!hasMore && history.length > 0" class="no-more">
                    <text>没有更多了</text>
                </view>
            </view>

            <view v-else class="empty">
                <text class="empty-text">暂无阅读历史</text>
                <text class="empty-tip">去首页看看吧</text>
            </view>
        </scroll-view>
    </view>
</template>

<script>
import FilterPanel from '@/components/FilterPanel.vue'

export default {
    components: {
        FilterPanel
    },
    data() {
        return {
            history: [],
            page: 1,
            hasMore: true,
            loading: false,

            // 筛选条件
            filterSourceId: '',

            // 数据源配置
            sources: [
                { id: 'jwc', name: '教务处' },
                { id: 'library', name: '图书馆' },
                { id: 'xsc', name: '学生处' },
                { id: 'cs', name: '计算机学院' },
                { id: 'jyzd', name: '就业指导中心' }
            ]
        }
    },
    onLoad() {
        this.loadSources()
        this.loadHistory()
    },
    onPullDownRefresh() {
        this.page = 1
        this.hasMore = true
        this.loadHistory(true)
    },
    methods: {
        // 加载数据源
        async loadSources() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'getSubscribeSources'
                });
                if (res.result.code === 0 && res.result.data) {
                    this.sources = res.result.data.map(s => ({
                        id: s.id,
                        name: s.name
                    }));
                }
            } catch (e) {
                console.error('加载数据源失败:', e);
            }
        },
        // 筛选变化
        onFilterChange(filters) {
            this.filterSourceId = filters.sourceId;
            this.page = 1;
            this.hasMore = true;
            this.history = [];
            this.loadHistory(true);
        },
        async loadHistory(refresh = false) {
            // 防止重复请求
            if (refresh) {
                uni.stopPullDownRefresh()
                setTimeout(() => uni.stopPullDownRefresh(), 10)
            }
            if (this.loading && !refresh) return

            this.loading = !refresh

            try {
                const openid = uni.getStorageSync('openid')

                const res = await uniCloud.callFunction({
                    name: 'getReadingHistory',
                    data: {
                        userId: openid,
                        sourceId: this.filterSourceId,
                        page: this.page,
                        pageSize: 20
                    }
                })

                if (res.result.code === 0) {
                    const { history, hasMore } = res.result.data

                    if (refresh || this.page === 1) {
                        this.history = history
                    } else {
                        this.history = [...this.history, ...history]
                    }

                    this.hasMore = hasMore
                }
            } catch (error) {
                console.error('加载阅读历史失败:', error)
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            } finally {
                this.loading = false
                setTimeout(() => uni.stopPullDownRefresh(), 100)
            }
        },

        loadMore() {
            if (this.hasMore && !this.loading) {
                this.page++
                this.loadHistory()
            }
        },

        clearHistory() {
            uni.showModal({
                title: '提示',
                content: '确定清空所有阅读历史吗？',
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '清空中...' })

                        try {
                            const openid = uni.getStorageSync('openid')

                            const res = await uniCloud.callFunction({
                                name: 'clearReadingHistory',
                                data: { userId: openid }
                            })

                            if (res.result.code === 0) {
                                uni.showToast({
                                    title: '清空成功',
                                    icon: 'success'
                                })
                                this.page = 1
                                this.hasMore = true
                                this.history = []
                                this.loadHistory()
                            }
                        } catch (error) {
                            console.error('清空失败:', error)
                            uni.showToast({
                                title: '清空失败',
                                icon: 'none'
                            })
                        } finally {
                            uni.hideLoading()
                        }
                    }
                }
            })
        },

        goToDetail(id) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${id}`
            })
        },

        formatTime(timestamp) {
            const date = new Date(timestamp)
            const now = new Date()
            const diff = now - date
            const hours = Math.floor(diff / (1000 * 60 * 60))

            if (hours < 1) return '刚刚'
            if (hours < 24) return `${hours}小时前`
            if (hours < 48) return '昨天'
            return `${date.getMonth() + 1}月${date.getDate()}日`
        },

        formatDuration(seconds) {
            if (!seconds) return '0秒'
            if (seconds < 60) return `${seconds}秒`
            const minutes = Math.floor(seconds / 60)
            return `${minutes}分钟`
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background-color: #FFFFFF;
}

.title {
    font-size: 18px;
    font-weight: 600;
    color: #0A2540;
}

.clear-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background-color: #FEF2F2;
    border-radius: 6px;
    font-size: 14px;
    color: #EF4444;
}

.content {
    height: calc(100vh - 68px);
}

.history-card {
    background-color: #FFFFFF;
    padding: 16px;
    margin: 8px 16px;
    border-radius: 8px;

    &:active {
        background-color: #F7F9FA;
    }
}

.article-title {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.article-meta {
    display: block;
    font-size: 12px;
    color: #A0AEC0;
}

.loading-more,
.no-more {
    padding: 20px;
    text-align: center;
    color: #A0AEC0;
    font-size: 14px;
}

.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.empty-text {
    font-size: 16px;
    color: #4A5568;
    margin-bottom: 8px;
}

.empty-tip {
    font-size: 14px;
    color: #A0AEC0;
}
</style>

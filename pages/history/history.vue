<template>
    <view class="container">
        <view class="header">
            <text class="title">阅读历史</text>
            <view class="clear-btn" @click="onClearHistory">
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
            <!-- 骨架屏 -->
            <view v-if="loading && history.length === 0" class="skeleton-container">
                <SkeletonBlock :count="3" />
            </view>

            <view v-if="history.length > 0">
                <view
                    v-for="item in history"
                    :key="item._id"
                    class="history-card"
                    @click="goToDetail(item.articleId)"
                >
                    <text class="article-title">{{ item.article?.title || '未知标题' }}</text>
                    <text class="article-meta">{{ getSourceName(item.article?.sourceId, item.article?.sourceName) }} | {{ formatTime(item.readTime) }} | 阅读时长 {{ formatDuration(item.duration) }}</text>
                </view>

                <view v-if="loading && history.length > 0" class="loading-more">
                    <uni-load-more status="loading"></uni-load-more>
                </view>
                <view v-if="!hasMore && history.length > 0" class="no-more">
                    <text>没有更多了</text>
                </view>
            </view>

            <EmptyState
                v-else
                text="暂无阅读历史"
                tip="去首页看看吧"
                actionText="去首页"
                @action="goToIndex"
            />
        </scroll-view>
    </view>
</template>

<script>
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { userApi } from '@/api/index.js'
import FilterPanel from '@/components/FilterPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useHistory, formatTime, formatDuration, getSourceName } from '@/utils/composables/history/useHistory.js'
import { useFilter } from '@/utils/composables/article/useFilter.js'

export default {
    components: {
        FilterPanel,
        EmptyState,
        SkeletonBlock
    },
    setup() {
        // Composables
        const {
            history,
            loading,
            hasMore,
            loadHistory,
            clearHistory,
            setSourceFilter
        } = useHistory({ pageSize: 20 })

        const { updateFilter } = useFilter({ pageKey: 'history' })

        // Data sources
        const sources = [
            { id: 'jwc', name: '教务处' },
            { id: 'library', name: '图书馆' },
            { id: 'xsc', name: '学生处' },
            { id: 'cs', name: '计算机学院' },
            { id: 'jyzd', name: '就业指导中心' }
        ]

        // --- Methods ---
        async function loadSources() {
            try {
                const openid = uni.getStorageSync('openid')
                if (!openid) return
                const result = await userApi.getSubscribeSources(openid)
                if (result && result.code === 0 && result.data) {
                    sources.splice(0, sources.length, ...result.data.map(s => ({
                        id: s.id,
                        name: s.name
                    })))
                }
            } catch (e) {
                console.error('加载数据源失败:', e)
            }
        }

        function onFilterChange(filters) {
            updateFilter('sourceId', filters.sourceId)
            setSourceFilter(filters.sourceId)
        }

        function loadMore() {
            if (hasMore.value && !loading.value) {
                loadHistory(false)
            }
        }

        function onClearHistory() {
            uni.showModal({
                title: '提示',
                content: '确定清空所有阅读历史吗？',
                success: (res) => {
                    if (res.confirm) {
                        clearHistory()
                    }
                }
            })
        }

        function goToDetail(id) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${id}`
            })
        }

        function goToIndex() {
            uni.switchTab({ url: '/pages/index/index' })
        }

        // --- Lifecycle ---
        onLoad(() => {
            loadSources()
            loadHistory()
        })

        onPullDownRefresh(() => {
            loadHistory(true).finally(() => {
                uni.stopPullDownRefresh()
            })
        })

        return {
            history,
            loading,
            hasMore,
            sources,
            loadMore,
            onFilterChange,
            onClearHistory,
            goToDetail,
            goToIndex,
            formatTime,
            formatDuration,
            getSourceName
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

.skeleton-container {
    padding-top: 8px;
}

.history-card {
    background-color: #FFFFFF;
    padding: 16px;
    margin: 8px 16px;
    border-radius: 8px;
    transition: all 0.2s ease;

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

</style>

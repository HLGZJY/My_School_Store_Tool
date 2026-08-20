<template>
    <view class="container">
        <!-- 分类筛选 -->
        <view class="filter-bar">
            <scroll-view scroll-x>
                <view class="filter-list">
                    <view
                        v-for="(item, index) in categories"
                        :key="index"
                        class="filter-item"
                        :class="{ active: currentCategory === index }"
                        @click="selectCategory(index)"
                    >
                        {{ item.name }}
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- 筛选面板 -->
        <FilterPanel
            :sources="sources"
            :showTag="false"
            :showTime="false"
            @filterChange="onFilterChange"
        />

        <!-- 骨架屏 -->
        <view v-if="loading && collections.length === 0" class="skeleton-container">
            <SkeletonBlock :count="3" />
        </view>

        <!-- 收藏列表 -->
        <scroll-view class="content" scroll-y @scrolltolower="loadMore">
            <view v-if="collections.length > 0">
                <view
                    v-for="item in collections"
                    :key="item._id"
                    class="collection-card"
                    @click="goToDetail(item.articleId)"
                >
                    <text class="article-title">{{ item.article?.title || '未知标题' }}</text>
                    <text class="article-meta">{{ getSourceName(item.article?.sourceId, item.article?.sourceName) }} | {{ formatTime(item.collectTime) }}</text>
                    <view class="action" @click.stop="toggleSelect(item._id)">
                        <uni-icons :type="item.selected ? 'checkbox-filled' : 'circle'" size="18" :color="item.selected ? '#00D4AA' : '#A0AEC0'"></uni-icons>
                    </view>
                </view>

                <view v-if="loading && collections.length > 0" class="loading-more">
                    <uni-load-more status="loading"></uni-load-more>
                </view>
                <view v-if="!hasMore && collections.length > 0" class="no-more">
                    <text>没有更多了</text>
                </view>
            </view>

            <EmptyState
                v-else
                text="还没有收藏任何内容"
                tip="去首页看看吧"
                actionText="去发现"
                @action="goToIndex"
            />
        </scroll-view>

        <!-- 底部操作栏 -->
        <view v-if="hasSelected" class="bottom-bar">
            <text class="select-info">已选择 {{ selectedCount }} 篇</text>
            <view class="cancel-btn" @click="cancelSelect">取消</view>
            <view class="delete-btn" @click="onBatchDelete">删除</view>
        </view>
    </view>
</template>

<script>
import { onLoad, onShow, onUnload, onPullDownRefresh } from '@dcloudio/uni-app'
import { articleApi, userApi } from '@/api/index.js'
import FilterPanel from '@/components/FilterPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useCollection } from '@/utils/composables/collection/useCollection.js'
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
            collections,
            loading,
            hasMore,
            selectedCount,
            hasSelected,
            currentCategory,
            loadCollections,
            toggleSelect,
            clearSelection,
            batchDelete,
            selectCategory,
            setSourceFilter
        } = useCollection({ pageSize: 20 })

        const { updateFilter } = useFilter({ pageKey: 'collection' })

        // Category tabs
        const categories = [
            { name: '全部', category: '' },
            { name: '通知公告', category: 'notice' },
            { name: '学术动态', category: 'academic' },
            { name: '社团活动', category: 'activity' },
            { name: '生活服务', category: 'service' }
        ]

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
                loadCollections(false)
            }
        }

        function cancelSelect() {
            clearSelection()
        }

        function onBatchDelete() {
            uni.showModal({
                title: '提示',
                content: `确定删除选中的 ${selectedCount.value} 篇收藏吗？`,
                success: (res) => {
                    if (res.confirm) {
                        batchDelete()
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

        function formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}月${date.getDate()}日`
        }

        function getSourceName(sourceId, sourceName) {
            const sourceMap = {
                'cxcy': '创新创业',
                'wyxy': '外语学院',
                'art': '美术学院',
                'stu': '学生工作部',
                'bwc': '保卫处',
                'qnw': '团委',
                'kfy': '科研发展院',
                'iao': '国际合作'
            }
            if (sourceId && sourceMap[sourceId]) {
                return sourceMap[sourceId]
            }
            return sourceName || '未知来源'
        }

        function onCollectChange({ articleId, collected }) {
            if (!collected) {
                const index = collections.value.findIndex(c => c.articleId === articleId)
                if (index >= 0) {
                    collections.value.splice(index, 1)
                }
            }
        }

        // --- Lifecycle ---
        onLoad(() => {
            loadSources()
            loadCollections()
            uni.$on('collectChange', onCollectChange)
        })

        onShow(() => {
            loadCollections(true)
        })

        onUnload(() => {
            uni.$off('collectChange', onCollectChange)
        })

        onPullDownRefresh(() => {
            loadCollections(true).finally(() => {
                uni.stopPullDownRefresh()
            })
        })

        return {
            collections,
            loading,
            hasMore,
            selectedCount,
            hasSelected,
            currentCategory,
            categories,
            sources,
            loadMore,
            onFilterChange,
            selectCategory,
            cancelSelect,
            onBatchDelete,
            goToDetail,
            goToIndex,
            formatTime,
            getSourceName,
            toggleSelect
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.filter-bar {
    background-color: #FFFFFF;
}

.filter-list {
    display: inline-flex;
    padding: 0 16px;
}

.filter-item {
    padding: 14px 16px;
    font-size: 14px;
    color: #4A5568;
    position: relative;

    &.active {
        color: #0A2540;
        font-weight: 600;

        &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 2px;
            background-color: #00D4AA;
        }
    }
}

.content {
    height: calc(100vh - 96px);
}

.skeleton-container {
    padding: 8px 16px;
}

.collection-card {
    display: flex;
    align-items: center;
    background-color: #FFFFFF;
    padding: 16px;
    margin: 8px 16px;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.article-title {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
    margin-right: 12px;
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

.action {
    padding-left: 12px;
}

.loading-more,
.no-more {
    padding: 20px;
    text-align: center;
    color: #A0AEC0;
    font-size: 14px;
}

.bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background-color: #FFFFFF;
    box-shadow: 0 -2px 8px rgba(10, 37, 64, 0.04);
}

.select-info {
    font-size: 14px;
    color: #4A5568;
}

.cancel-btn {
    padding: 8px 16px;
    font-size: 14px;
    color: #4A5568;
}

.delete-btn {
    padding: 8px 16px;
    background-color: #EF4444;
    color: #FFFFFF;
    border-radius: 8px;
    font-size: 14px;
}
</style>

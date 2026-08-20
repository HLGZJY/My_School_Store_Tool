<template>
    <view class="container">
        <view class="search-bar" @click="goToSearch">
            <uni-icons type="search" size="18" color="#A0AEC0"></uni-icons>
            <text class="placeholder">搜索通知、讲座、活动...</text>
        </view>
        <FilterPanel :sources="sources" :syncMode="true" :groupByOwner="true" :showTag="false" @filterChange="onFilterChange" />
        <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
            <view class="tab-list">
                <view v-for="(tab, index) in tabs" :key="index" class="tab-item" :class="{ active: currentTab.value === index }" @click="onTabChange(index)">{{ tab.name }}</view>
            </view>
        </scroll-view>
        <scroll-view class="article-scroll" scroll-y refresher-enabled :refresher-triggered="refresherTriggered" @refresherrefresh="refresh" @scrolltolower="loadMore" scroll-with-animation>
            <view class="article-list">
                <view v-for="(article, index) in articles" :key="article._id" class="article-item" @click="goToDetail(article)">
                    <view class="swipe-action" :class="{ 'swipe-show': swipeShowIndex === index }">
                        <view class="swipe-btn collect-btn" :class="{ collected: article.isCollected }" @click.stop="toggleCollect(article)">
                            <uni-icons :type="article.isCollected ? 'star-filled' : 'star'" size="20" :color="article.isCollected ? '#00D4AA' : '#FFFFFF'"></uni-icons>
                            <text>{{ article.isCollected ? '已收藏' : '收藏' }}</text>
                        </view>
                    </view>
                    <view class="card-content" :class="{ 'swipe-offset': swipeShowIndex === index }" @touchstart="onTouchStart(index, $event)" @touchend="onTouchEnd(index, $event)" @touchmove="onTouchMove(index, $event)">
                        <ArticleCard :article="article" />
                    </view>
                </view>
            </view>
            <view v-if="loading && articles.length === 0" class="skeleton-container"><SkeletonBlock :count="3" /></view>
            <view v-else-if="loading && articles.length > 0" class="loading-state"><text>加载中...</text></view>
            <view v-else-if="!hasMore && articles.length > 0" class="loading-state"><text>没有更多了</text></view>
            <view v-else-if="articles.length === 0" class="loading-state"><text>暂无内容</text></view>
        </scroll-view>
    </view>
</template>

<script>
import ArticleCard from '@/components/ArticleCard.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { adminApi } from '@/api/index'
import { useArticleList } from '@/utils/composables/article/useArticleList'
import { useFilter } from '@/utils/composables/article/useFilter'

export default {
    components: { ArticleCard, FilterPanel, SkeletonBlock },
    setup() {
        const sources = ref([])
        const { filters, parseUrlFilters, syncToUrl } = useFilter({ pageKey: 'index' })
        const { articles, loading, hasMore, refresherTriggered, refresh, loadMore, updateFilters, toggleCollect, swipeShowIndex, onTouchStart, onTouchEnd } = useArticleList({ pageSize: 20, autoLoad: false, filters })

        const tabs = [{ name: '全部', category: '' }, { name: '通知公告', category: 'notice' }, { name: '学术动态', category: 'academic' }, { name: '社团活动', category: 'activity' }, { name: '生活服务', category: 'service' }]
        const currentTab = { value: 0 }

        function onTabChange(index) {
            currentTab.value = index
            filters.category = tabs[index].category
            refresh()
            // 不再调用 syncUrl()，避免页面 reload 导致 tab 指示器重置
        }

        function onFilterChange(filterValues) {
            updateFilters(filterValues)
            syncUrl()
        }

        function syncUrl() {
            const query = syncToUrl()
            if (Object.keys(query).length > 0) {
                const url = '/pages/index/index?' + Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
                uni.reLaunch({ url })
            }
        }

        async function loadSources() {
            try {
                const result = await adminApi.manageSources('list')
                // manageSources('list') 返回的是数组直接（api.call 会返回 res.result.data）
                if (Array.isArray(result)) {
                    sources.value = result.map(s => ({
                        id: s.sourceId,
                        name: s.sourceName,
                        owner: s.classification?.owner
                    }))
                }
            } catch (e) {
                console.error('加载数据源失败:', e)
            }
        }

        function goToSearch() { uni.navigateTo({ url: '/pages/search/search' }) }
        function goToDetail(article) { uni.navigateTo({ url: `/pages/detail/detail?id=${article._id}` }) }
        function onTouchMove() {}

        // Store options for use in onShow (when page is restored from cache)
        let storedOptions = null

        onLoad((options) => {
            storedOptions = options
            parseUrlFilters({ onQuery: () => options })
            const subscriptions = uni.getStorageSync('subscriptions') || []
            filters.sourceIds = subscriptions.map(s => s.id).filter(id => id)
            loadSources()
            refresh()
        })

        onShow(() => {
            // Re-parse URL filters when page is shown (handles back navigation)
            if (storedOptions) {
                parseUrlFilters({ onQuery: () => storedOptions })
            }
        })

        return { articles, loading, hasMore, refresherTriggered, refresh, loadMore, toggleCollect, swipeShowIndex, onTouchStart, onTouchEnd, onTouchMove, tabs, currentTab, onTabChange, sources, onFilterChange, goToSearch, goToDetail }
    },
    onShareAppMessage() { return { title: '校园信息聚合 - 分享你的校园生活', path: '/pages/index/index' } }
}
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background-color: #F7F9FA; }
.search-bar { display: flex; align-items: center; padding: 16px; background-color: #FFFFFF; margin: 8px 16px; border-radius: 8px; .placeholder { margin-left: 8px; font-size: 14px; color: #A0AEC0; } }
.tab-scroll { background-color: #FFFFFF; white-space: nowrap; .tab-list { display: inline-flex; padding: 0 16px; } }
.tab-item { padding: 14px 16px; font-size: 14px; color: #4A5568; position: relative; &.active { color: #0A2540; font-weight: 600; &::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 20px; height: 2px; background-color: #00D4AA; } } }
.article-scroll { height: calc(100vh - 180px); }
.article-list { padding: 0 16px; }
.article-item { position: relative; margin-bottom: 8px; overflow: hidden; }
.swipe-action { position: absolute; right: 0; top: 0; bottom: 0; display: flex; transform: translateX(100%); transition: transform 0.3s ease; z-index: 1; &.swipe-show { transform: translateX(0); } }
.swipe-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; height: 100%; background-color: #00D4AA; color: #FFFFFF; font-size: 12px; &.collected { background-color: #4A5568; } }
.card-content { transition: margin-right 0.3s ease; &.swipe-offset { margin-right: 80px; } }
.loading-state { padding: 20px; text-align: center; color: #A0AEC0; font-size: 14px; }
.skeleton-container { padding-top: 8px; }
</style>

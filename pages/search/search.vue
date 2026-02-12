<template>
    <view class="container">
        <!-- 搜索栏 -->
        <SearchHeader
            v-model:keyword="keyword"
            :focus="true"
            @search="doSearch"
            @back="goBack"
        />

        <!-- 筛选面板 -->
        <FilterPanel
            v-if="hasSearched"
            :sources="sources"
            :tags="tagOptions"
            @filterChange="onFilterChange"
            ref="filterRef"
        />

        <!-- 搜索结果 -->
        <SearchResult
            v-if="hasSearched"
            :articles="articles"
            :loading="loading"
            :has-more="hasMore"
            :keyword="keyword"
            @load-more="loadMore"
            @detail="goToDetail"
        />

        <!-- 搜索建议 -->
        <SearchSuggest
            v-else
            :history="searchHistory"
            :hot-keywords="hotKeywords"
            @search="searchItem"
            @clear="clearHistory"
        />
    </view>
</template>

<script>
import SearchHeader from './components/SearchHeader.vue'
import SearchSuggest from './components/SearchSuggest.vue'
import SearchResult from './components/SearchResult.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import { loadWithCache } from '@/utils/cache.js'

export default {
    name: 'Search',
    components: {
        SearchHeader,
        SearchSuggest,
        SearchResult,
        FilterPanel
    },
    data() {
        return {
            keyword: '',
            hasSearched: false,
            articles: [],
            page: 1,
            hasMore: true,
            loading: false,
            searchHistory: [],
            hotKeywords: [],

            // 筛选条件
            filterSourceId: '',
            filterTag: '',
            filterTimeRange: '',

            // 数据源配置
            sources: [
                { id: 'jwc', name: '教务处' },
                { id: 'library', name: '图书馆' },
                { id: 'xsc', name: '学生处' },
                { id: 'cs', name: '计算机学院' },
                { id: 'jyzd', name: '就业指导中心' }
            ],
            tagOptions: ['通知', '讲座', '活动', '竞赛', '讲座预告', '考试通知']
        }
    },
    onLoad(options) {
        if (options.keyword) {
            this.keyword = options.keyword
            this.doSearch()
        }
        this.loadHotKeywords()
        this.loadSearchHistory()
        this.loadSources()
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
            this.filterTag = filters.tag;
            this.filterTimeRange = filters.timeRange;
            this.page = 1;
            this.hasMore = true;
            this.articles = [];
            this.loadArticles();
        },
        // 执行搜索
        async doSearch() {
            if (!this.keyword.trim()) {
                uni.showToast({
                    title: '请输入搜索关键词',
                    icon: 'none'
                })
                return
            }

            this.hasSearched = true
            this.page = 1
            this.hasMore = true
            this.articles = []
            await this.loadArticles()
            this.saveSearchHistory()
        },

        // 加载搜索结果
        async loadArticles() {
            if (this.loading) return
            this.loading = true

            // 构建时间范围
            let startDate = 0, endDate = 0;
            if (this.filterTimeRange) {
                const now = Date.now();
                const ranges = {
                    '1d': 1 * 24 * 60 * 60 * 1000,
                    '7d': 7 * 24 * 60 * 60 * 1000,
                    '30d': 30 * 24 * 60 * 60 * 1000
                };
                const days = ranges[this.filterTimeRange] || 0;
                if (days > 0) {
                    endDate = now;
                    startDate = now - days;
                }
            }

            try {
                const res = await uniCloud.callFunction({
                    name: 'searchArticles',
                    data: {
                        keyword: this.keyword,
                        page: this.page,
                        pageSize: 20,
                        sourceId: this.filterSourceId,
                        tag: this.filterTag,
                        startDate,
                        endDate
                    }
                })

                if (res.result.code === 0) {
                    const { articles, hasMore } = res.result.data

                    if (this.page === 1) {
                        this.articles = articles
                    } else {
                        this.articles = [...this.articles, ...articles]
                    }
                    this.hasMore = hasMore
                }
            } catch (error) {
                console.error('搜索失败:', error)
                uni.showToast({
                    title: '搜索失败',
                    icon: 'none'
                })
            } finally {
                this.loading = false
            }
        },

        // 加载更多
        loadMore() {
            if (this.hasMore && !this.loading) {
                this.page++
                this.loadArticles()
            }
        },

        // 加载热门关键词
        async loadHotKeywords() {
            const data = await loadWithCache('search_hot', 'HOT_KEYWORDS', async () => {
                const res = await uniCloud.callFunction({
                    name: 'getHotKeywords',
                    data: { limit: 10 }
                })
                if (res.result.code === 0) {
                    return res.result.data || []
                }
                return []
            })
            this.hotKeywords = data
        },

        // 加载搜索历史
        loadSearchHistory() {
            this.searchHistory = uni.getStorageSync('searchHistory') || []
        },

        // 保存搜索历史
        saveSearchHistory() {
            let history = uni.getStorageSync('searchHistory') || []
            history = history.filter(item => item !== this.keyword)
            history.unshift(this.keyword)
            history = history.slice(0, 10)
            uni.setStorageSync('searchHistory', history)
            this.searchHistory = history

            // 方案A：获取 openid（从 store 或本地存储）
            const openid = this.$store.state.user.userId || uni.getStorageSync('userId') || 'anonymous'

            // 上报搜索记录
            uniCloud.callFunction({
                name: 'reportSearch',
                data: {
                    keyword: this.keyword,
                    resultCount: this.articles.length,
                    userId: openid  // 方案A：传递 openid
                }
            })
        },

        // 清空历史
        clearHistory() {
            uni.showModal({
                title: '提示',
                content: '确定清空搜索历史吗？',
                success: (res) => {
                    if (res.confirm) {
                        uni.removeStorageSync('searchHistory')
                        this.searchHistory = []
                    }
                }
            })
        },

        // 点击搜索项
        searchItem(keyword) {
            this.keyword = keyword
            this.doSearch()
        },

        // 跳转详情
        goToDetail(id) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${id}`
            })
        },

        // 返回
        goBack() {
            uni.navigateBack()
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}
</style>

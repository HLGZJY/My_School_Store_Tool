<template>
    <view class="container">
        <!-- 搜索栏 -->
        <SearchHeader
            v-model:keyword="keyword"
            :focus="true"
            @search="doSearch"
            @back="goBack"
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

export default {
    name: 'Search',
    components: {
        SearchHeader,
        SearchSuggest,
        SearchResult
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
            hotKeywords: []
        }
    },
    onLoad(options) {
        if (options.keyword) {
            this.keyword = options.keyword
            this.doSearch()
        }
        this.loadHotKeywords()
        this.loadSearchHistory()
    },
    methods: {
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

            try {
                const res = await uniCloud.callFunction({
                    name: 'searchArticles',
                    data: {
                        keyword: this.keyword,
                        page: this.page,
                        pageSize: 20
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
            try {
                const res = await uniCloud.callFunction({
                    name: 'getHotKeywords',
                    data: { limit: 10 }
                })

                if (res.result.code === 0) {
                    this.hotKeywords = res.result.data || []
                }
            } catch (error) {
                console.error('加载热门搜索失败:', error)
            }
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

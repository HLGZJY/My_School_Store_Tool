<template>
    <view class="container">
        <!-- 搜索栏 -->
        <view class="search-bar">
            <uni-icons type="back" size="20" color="#0A2540" @click="goBack"></uni-icons>
            <input
                v-model="keyword"
                class="search-input"
                placeholder="搜索通知、讲座、活动..."
                focus
                @confirm="doSearch"
            />
            <view class="search-btn" @click="doSearch">搜索</view>
        </view>

        <!-- 搜索结果 -->
        <scroll-view v-if="hasSearched" class="content" scroll-y @scrolltolower="loadMore">
            <view v-if="articles.length > 0">
                <view
                    v-for="article in articles"
                    :key="article._id"
                    class="article-card"
                    @click="goToDetail(article._id)"
                >
                    <text class="article-title" v-html="highlightKeyword(article.title)"></text>
                    <text class="article-meta">{{ article.sourceName }} | {{ formatTime(article.publishTime) }}</text>
                </view>

                <view v-if="loading" class="loading-more">
                    <uni-load-more status="loading"></uni-load-more>
                </view>
                <view v-if="!hasMore && articles.length > 0" class="no-more">
                    <text>没有更多了</text>
                </view>
            </view>

            <view v-else class="empty">
                <text class="empty-text">未找到相关内容</text>
                <text class="empty-tip">试试其他关键词吧</text>
            </view>
        </scroll-view>

        <!-- 搜索历史和热门搜索 -->
        <scroll-view v-else class="content" scroll-y>
            <!-- 搜索历史 -->
            <view v-if="searchHistory.length > 0" class="section">
                <view class="section-header">
                    <text class="section-title">搜索历史</text>
                    <text class="clear-btn" @click="clearHistory">清空</text>
                </view>
                <view class="tag-list">
                    <view
                        v-for="item in searchHistory"
                        :key="item"
                        class="tag-item"
                        @click="searchItem(item)"
                    >
                        {{ item }}
                    </view>
                </view>
            </view>

            <!-- 热门搜索 -->
            <view class="section">
                <view class="section-header">
                    <text class="section-title">🔥 热门搜索</text>
                </view>
                <view class="tag-list">
                    <view
                        v-for="item in hotKeywords"
                        :key="item.keyword"
                        class="tag-item"
                        :class="{ hot: item.count > 100 }"
                        @click="searchItem(item.keyword)"
                    >
                        {{ item.keyword }}
                    </view>
                </view>
            </view>
        </scroll-view>
    </view>
</template>

<script>
export default {
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
    onLoad() {
        this.loadHotKeywords()
        this.loadSearchHistory()
    },
    methods: {
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

        async loadArticles() {
            if (this.loading) return
            this.loading = true

            try {
                const userId = this.$store.state.user.userId

                const res = await uniCloud.callFunction({
                    name: 'searchArticles',
                    data: {
                        userId,
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

        loadMore() {
            if (this.hasMore && !this.loading) {
                this.page++
                this.loadArticles()
            }
        },

        async loadHotKeywords() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'getHotKeywords',
                    data: {
                        limit: 10
                    }
                })

                if (res.result.code === 0) {
                    this.hotKeywords = res.result.data.tags || []
                }
            } catch (error) {
                console.error('加载热门搜索失败:', error)
            }
        },

        loadSearchHistory() {
            this.searchHistory = uni.getStorageSync('searchHistory') || []
        },

        saveSearchHistory() {
            let history = uni.getStorageSync('searchHistory') || []
            history = history.filter(item => item !== this.keyword)
            history.unshift(this.keyword)
            history = history.slice(0, 10)
            uni.setStorageSync('searchHistory', history)
            this.searchHistory = history

            // 上报搜索记录
            uniCloud.callFunction({
                name: 'reportSearch',
                data: {
                    userId: this.$store.state.user.userId,
                    keyword: this.keyword,
                    resultCount: this.articles.length
                }
            })
        },

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

        searchItem(keyword) {
            this.keyword = keyword
            this.doSearch()
        },

        highlightKeyword(text) {
            if (!this.keyword) return text
            const reg = new RegExp(this.keyword, 'gi')
            return text.replace(reg, `<span class="highlight">${this.keyword}</span>`)
        },

        goToDetail(id) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${id}`
            })
        },

        goBack() {
            uni.navigateBack()
        },

        formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}月${date.getDate()}日`
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.search-bar {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: #FFFFFF;
}

.search-input {
    flex: 1;
    height: 40px;
    padding: 0 12px;
    background-color: #F7F9FA;
    border-radius: 8px;
    font-size: 14px;
    color: #4A5568;
}

.search-btn {
    margin-left: 12px;
    padding: 0 16px;
    font-size: 14px;
    color: #00D4AA;
}

.content {
    height: calc(100vh - 64px);
}

.article-card {
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

    :deep(.highlight) {
        color: #00D4AA;
    }
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

.section {
    padding: 20px;
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

.clear-btn {
    font-size: 14px;
    color: #00D4AA;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tag-item {
    padding: 8px 16px;
    background-color: #FFFFFF;
    border-radius: 20px;
    font-size: 14px;
    color: #4A5568;

    &.hot {
        color: #00D4AA;
    }

    &:active {
        background-color: #F7F9FA;
    }
}
</style>

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
                    <text class="article-meta">{{ item.article?.sourceName || '未知来源' }} | {{ formatTime(item.collectTime) }}</text>
                    <view class="action" @click.stop="toggleSelect(item._id)">
                        <uni-icons :type="item.selected ? 'checkbox-filled' : 'circle'" size="18" :color="item.selected ? '#00D4AA' : '#A0AEC0'"></uni-icons>
                    </view>
                </view>

                <view v-if="loading" class="loading-more">
                    <uni-load-more status="loading"></uni-load-more>
                </view>
                <view v-if="!hasMore && collections.length > 0" class="no-more">
                    <text>没有更多了</text>
                </view>
            </view>

            <view v-else class="empty">
                <text class="empty-text">还没有收藏任何内容</text>
                <text class="empty-tip">去首页看看吧</text>
            </view>
        </scroll-view>

        <!-- 底部操作栏 -->
        <view v-if="hasSelected" class="bottom-bar">
            <text class="select-info">已选择 {{ selectedCount }} 篇</text>
            <view class="cancel-btn" @click="cancelSelect">取消</view>
            <view class="delete-btn" @click="batchDelete">删除</view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            categories: [
                { name: '全部', category: '' },
                { name: '通知公告', category: 'notice' },
                { name: '学术动态', category: 'academic' },
                { name: '社团活动', category: 'activity' },
                { name: '生活服务', category: 'service' }
            ],
            currentCategory: 0,
            collections: [],
            page: 1,
            hasMore: true,
            loading: false
        }
    },
    computed: {
        hasSelected() {
            return this.collections.some(item => item.selected)
        },
        selectedCount() {
            return this.collections.filter(item => item.selected).length
        },
        selectedIds() {
            return this.collections.filter(item => item.selected).map(item => item.articleId)
        }
    },
    onLoad() {
        this.loadCollections()
        uni.$on('collectChange', this.onCollectChange)
    },
    onShow() {
        // 从详情页返回时刷新列表
        this.loadCollections(true)
    },
    onUnload() {
        uni.$off('collectChange', this.onCollectChange)
    },
    onPullDownRefresh() {
        this.page = 1
        this.hasMore = true
        this.loadCollections(true)
    },
    methods: {
        async loadCollections(refresh = false) {
            if (this.loading) return
            this.loading = true

            try {
                const openid = uni.getStorageSync('userId')
                const category = this.categories[this.currentCategory].category

                const res = await uniCloud.callFunction({
                    name: 'getCollections',
                    data: {
                        userId: openid,
                        category,
                        page: this.page,
                        pageSize: 20
                    }
                })

                if (res.result.code === 0) {
                    const { collections, hasMore } = res.result.data

                    const collectionsWithSelected = collections.map(c => ({
                        ...c,
                        selected: false
                    }))

                    if (refresh || this.page === 1) {
                        this.collections = collectionsWithSelected
                    } else {
                        this.collections = [...this.collections, ...collectionsWithSelected]
                    }

                    this.hasMore = hasMore
                }
            } catch (error) {
                console.error('加载收藏失败:', error)
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            } finally {
                this.loading = false
                uni.stopPullDownRefresh()
            }
        },

        loadMore() {
            if (this.hasMore && !this.loading) {
                this.page++
                this.loadCollections()
            }
        },

        selectCategory(index) {
            if (this.currentCategory === index) return
            this.currentCategory = index
            this.page = 1
            this.hasMore = true
            this.collections = []
            this.loadCollections()
        },

        toggleSelect(id) {
            const item = this.collections.find(c => c._id === id)
            if (item) {
                item.selected = !item.selected
            }
        },

        cancelSelect() {
            this.collections.forEach(item => {
                item.selected = false
            })
        },

        async batchDelete() {
            uni.showModal({
                title: '提示',
                content: `确定删除选中的 ${this.selectedCount} 篇收藏吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '删除中...' })

                        try {
                            const openid = uni.getStorageSync('userId')
                            const res = await uniCloud.callFunction({
                                name: 'batchUncollect',
                                data: {
                                    userId: openid,
                                    articleIds: this.selectedIds
                                }
                            })

                            if (res.result.code === 0) {
                                uni.showToast({
                                    title: '删除成功',
                                    icon: 'success'
                                })
                                this.page = 1
                                this.hasMore = true
                                this.collections = []
                                this.loadCollections()
                            }
                        } catch (error) {
                            console.error('删除失败:', error)
                            uni.showToast({
                                title: '删除失败',
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
            return `${date.getMonth() + 1}月${date.getDate()}日`
        },

        onCollectChange({ articleId, collected }) {
            if (!collected) {
                // 如果取消了收藏，从列表中移除
                const index = this.collections.findIndex(c => c.articleId === articleId)
                if (index >= 0) {
                    this.collections.splice(index, 1)
                }
            }
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

.collection-card {
    display: flex;
    align-items: center;
    background-color: #FFFFFF;
    padding: 16px;
    margin: 8px 16px;
    border-radius: 8px;
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

<template>
    <view class="container">
        <!-- 筛选栏 -->
        <view class="filter-bar">
            <view
                :class="['filter-item', { active: filterStatus === 'pending' }]"
                @click="changeFilter('pending')"
            >
                待审核
            </view>
            <view
                :class="['filter-item', { active: filterStatus === 'rejected' }]"
                @click="changeFilter('rejected')"
            >
                已拒绝
            </view>
            <view
                :class="['filter-item', { active: filterStatus === 'all' }]"
                @click="changeFilter('all')"
            >
                全部
            </view>
        </view>

        <!-- 文章列表 -->
        <view class="article-list">
            <view
                class="article-item"
                v-for="item in articleList"
                :key="item._id"
                @click="showDetail(item)"
            >
                <view class="article-header">
                    <text class="article-title">{{ item.title }}</text>
                    <text :class="['article-status', item.status]">
                        {{ getStatusText(item.status) }}
                    </text>
                </view>
                <view class="article-meta">
                    <text class="source">{{ item.sourceName }}</text>
                    <text class="time">{{ formatTime(item.createTime) }}</text>
                </view>
                <view class="article-summary" v-if="item.summary">
                    {{ item.summary }}
                </view>

                <!-- 操作按钮 -->
                <view class="action-btns" v-if="item.status === 'pending'">
                    <button class="btn approve" @click.stop="handleApprove(item)">通过</button>
                    <button class="btn reject" @click.stop="handleReject(item)">拒绝</button>
                </view>
            </view>

            <!-- 空状态 -->
            <view v-if="articleList.length === 0 && !loading" class="empty">
                <text>暂无待审核文章</text>
            </view>

            <!-- 加载中 -->
            <view v-if="loading" class="loading">
                <text>加载中...</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            filterStatus: 'pending',
            articleList: [],
            loading: false,
            page: 1,
            pageSize: 20
        }
    },
    onLoad() {
        this.loadArticles()
    },
    onPullDownRefresh() {
        this.page = 1
        this.loadArticles().then(() => {
            uni.stopPullDownRefresh()
        })
    },
    methods: {
        changeFilter(status) {
            this.filterStatus = status
            this.page = 1
            this.loadArticles()
        },

        async loadArticles() {
            this.loading = true

            try {
                let where = {}
                if (this.filterStatus !== 'all') {
                    where.status = this.filterStatus
                }

                const res = await uniCloud.callFunction({
                    name: 'adminGetArticles',
                    data: {
                        where,
                        page: this.page,
                        pageSize: this.pageSize
                    }
                })

                if (res.result.code === 0) {
                    this.articleList = res.result.data.list
                }
            } catch (e) {
                console.error('加载失败:', e)
            } finally {
                this.loading = false
            }
        },

        showDetail(item) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${item._id}`
            })
        },

        async handleApprove(item) {
            uni.showModal({
                title: '确认通过',
                content: '确定要通过这篇审核吗？',
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const res = await uniCloud.callFunction({
                                name: 'approveArticle',
                                data: {
                                    articleId: item._id,
                                    action: 'approve'
                                }
                            })

                            if (res.result.code === 0) {
                                uni.showToast({ title: '已通过', icon: 'success' })
                                this.loadArticles()
                            } else {
                                uni.showToast({ title: res.result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '操作失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        async handleReject(item) {
            uni.showModal({
                title: '拒绝原因',
                content: '请输入拒绝原因',
                editable: true,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const res = await uniCloud.callFunction({
                                name: 'approveArticle',
                                data: {
                                    articleId: item._id,
                                    action: 'reject',
                                    note: res.content
                                }
                            })

                            if (res.result.code === 0) {
                                uni.showToast({ title: '已拒绝', icon: 'success' })
                                this.loadArticles()
                            } else {
                                uni.showToast({ title: res.result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '操作失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        getStatusText(status) {
            const map = {
                pending: '待审核',
                published: '已发布',
                rejected: '已拒绝',
                draft: '草稿'
            }
            return map[status] || status
        },

        formatTime(timestamp) {
            if (!timestamp) return ''
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
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
    display: flex;
    background-color: #FFFFFF;
    padding: 12px 16px;
    gap: 12px;

    .filter-item {
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        color: #666;

        &.active {
            background-color: #07C160;
            color: #FFFFFF;
        }
    }
}

.article-list {
    padding: 12px 16px;

    .article-item {
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;

        .article-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;

            .article-title {
                flex: 1;
                font-size: 16px;
                font-weight: 600;
                color: #0A2540;
                margin-right: 12px;
            }

            .article-status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 4px;

                &.pending {
                    background-color: #FFF3E0;
                    color: #FF9500;
                }

                &.published {
                    background-color: #E8F5E9;
                    color: #07C160;
                }

                &.rejected {
                    background-color: #FFEBEE;
                    color: #FF3B30;
                }
            }
        }

        .article-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #999;
            margin-bottom: 8px;
        }

        .article-summary {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .action-btns {
            display: flex;
            gap: 12px;
            margin-top: 12px;

            .btn {
                flex: 1;
                height: 36px;
                line-height: 36px;
                font-size: 14px;
                border-radius: 18px;

                &.approve {
                    background-color: #07C160;
                    color: #FFFFFF;
                }

                &.reject {
                    background-color: #FFFFFF;
                    color: #FF3B30;
                    border: 1px solid #FF3B30;
                }
            }
        }
    }

    .empty, .loading {
        text-align: center;
        padding: 40px;
        color: #999;
    }
}
</style>

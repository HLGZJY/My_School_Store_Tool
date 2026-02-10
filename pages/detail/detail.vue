<template>
    <view class="container">
        <!-- 导航栏 -->
        <view class="nav-bar">
            <uni-icons type="back" size="20" color="#0A2540" @click="goBack"></uni-icons>
            <text class="nav-title">详情</text>
            <view class="nav-right" @click="share">
                <uni-icons type="redo" size="20" color="#0A2540"></uni-icons>
            </view>
        </view>

        <scroll-view class="content" scroll-y>
            <!-- 文章信息 -->
            <view class="article-info">
                <view class="title">{{ article.title }}</view>

                <view class="meta">
                    <text class="source">{{ article.sourceName }}</text>
                    <text class="time">{{ formatTime(article.publishTime) }}</text>
                    <text class="views">{{ article.stats?.viewCount || 0 }} 阅读</text>
                </view>

                <view class="tags">
                    <view v-for="tag in article.tags?.source || []" :key="tag" class="tag source-tag">{{ tag }}</view>
                    <view v-for="tag in article.tags?.role || []" :key="tag" class="tag role-tag">{{ tag }}</view>
                </view>
            </view>

            <!-- AI摘要 -->
            <view v-if="article.summary" class="summary-section">
                <view class="summary-title">📝 AI摘要</view>
                <text class="summary-text">{{ article.summary }}</text>
            </view>

            <!-- 正文 -->
            <view class="article-content">
                <rich-text :nodes="article.content"></rich-text>
            </view>

            <!-- 相关推荐 -->
            <view v-if="relatedArticles.length > 0" class="related-section">
                <view class="section-title">你可能还想看</view>
                <view
                    v-for="item in relatedArticles"
                    :key="item._id"
                    class="related-item"
                    @click="goToArticle(item._id)"
                >
                    <text class="related-title">{{ item.title }}</text>
                    <text class="related-meta">{{ item.sourceName }} | {{ formatTime(item.publishTime) }}</text>
                </view>
            </view>
        </scroll-view>

        <!-- 底部操作栏 -->
        <view class="bottom-bar">
            <view class="action-btn" :class="{ active: isCollected }" @click="toggleCollect">
                <uni-icons :type="isCollected ? 'heart-filled' : 'heart'" size="22" :color="isCollected ? '#EF4444' : '#A0AEC0'"></uni-icons>
                <text class="action-text">{{ isCollected ? '已收藏' : '收藏' }}</text>
            </view>
            <view v-if="article.originalUrl" class="action-btn primary" @click="openOriginal">
                <text>打开原文</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            articleId: '',
            article: {},
            relatedArticles: [],
            isCollected: false
        }
    },
    onLoad(options) {
        this.articleId = options.id
        this.loadArticleDetail()
        this.loadCollectStatus()
        this.recordRead()
    },
    methods: {
        async loadArticleDetail() {
            try {
                const userId = this.$store.state.user.userId

                const res = await uniCloud.callFunction({
                    name: 'getArticleDetail',
                    data: {
                        articleId: this.articleId,
                        userId
                    }
                })

                if (res.result.code === 0) {
                    this.article = res.result.data
                    this.relatedArticles = res.result.data.relatedArticles || []
                }
            } catch (error) {
                console.error('加载文章详情失败:', error)
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            }
        },

        async loadCollectStatus() {
            try {
                const userId = this.$store.state.user.userId
                if (!userId) return

                const res = await uniCloud.callFunction({
                    name: 'getCollections',
                    data: {
                        userId,
                        articleId: this.articleId,
                        pageSize: 1
                    }
                })

                if (res.result.code === 0) {
                    this.isCollected = res.result.data.collections.length > 0
                }
            } catch (error) {
                console.error('加载收藏状态失败:', error)
            }
        },

        async recordRead() {
            try {
                const userId = this.$store.state.user.userId
                if (!userId) return

                // 异步记录阅读，不阻塞页面
                uniCloud.callFunction({
                    name: 'recordRead',
                    data: {
                        userId,
                        articleId: this.articleId,
                        duration: 0
                    }
                })
            } catch (error) {
                console.error('记录阅读失败:', error)
            }
        },

        async toggleCollect() {
            const userId = this.$store.state.user.userId
            if (!userId) {
                uni.showToast({
                    title: '请先登录',
                    icon: 'none'
                })
                return
            }

            try {
                const res = await uniCloud.callFunction({
                    name: 'collectArticle',
                    data: {
                        userId,
                        articleId: this.articleId,
                        action: this.isCollected ? 'uncollect' : 'collect'
                    }
                })

                if (res.result.code === 0) {
                    this.isCollected = !this.isCollected
                    uni.showToast({
                        title: this.isCollected ? '收藏成功' : '取消收藏',
                        icon: 'success'
                    })
                }
            } catch (error) {
                console.error('收藏操作失败:', error)
                uni.showToast({
                    title: '操作失败，请重试',
                    icon: 'none'
                })
            }
        },

        openOriginal() {
            if (!this.article.originalUrl) return

            uni.showModal({
                title: '提示',
                content: '即将跳转到第三方网站，请注意辨别信息真伪',
                confirmText: '继续',
                success: (res) => {
                    if (res.confirm) {
                        // #ifdef H5
                        window.open(this.article.originalUrl, '_blank')
                        // #endif

                        // #ifdef MP-WEIXIN
                        uni.setClipboardData({
                            data: this.article.originalUrl,
                            success: () => {
                                uni.showToast({
                                    title: '链接已复制，请粘贴到浏览器打开',
                                    icon: 'none'
                                })
                            }
                        })
                        // #endif
                    }
                }
            })
        },

        share() {
            uni.showShareMenu({
                withShareTicket: true
            })
        },

        goBack() {
            uni.navigateBack()
        },

        goToArticle(id) {
            uni.redirectTo({
                url: `/pages/detail/detail?id=${id}`
            })
        },

        formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    display: flex;
    flex-direction: column;
}

.nav-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background-color: #FFFFFF;

    .nav-title {
        font-size: 18px;
        font-weight: 600;
        color: #0A2540;
    }

    .nav-right {
        width: 40px;
        display: flex;
        justify-content: flex-end;
    }
}

.content {
    flex: 1;
    padding: 0 20px 100px;
}

.article-info {
    padding: 20px 0;
}

.title {
    font-size: 20px;
    font-weight: 600;
    color: #0A2540;
    line-height: 1.5;
    margin-bottom: 16px;
}

.meta {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #A0AEC0;
    margin-bottom: 16px;

    .source {
        margin-right: 12px;
    }

    .time {
        margin-right: 12px;
    }
}

.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tag {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
}

.source-tag {
    background-color: #E8ECF1;
    color: #4A5568;
}

.role-tag {
    background-color: #DBEAFE;
    color: #1E40AF;
}

.summary-section {
    background-color: #F0FDFA;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;

    .summary-title {
        font-size: 14px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 8px;
    }

    .summary-text {
        font-size: 14px;
        color: #4A5568;
        line-height: 1.6;
    }
}

.article-content {
    font-size: 14px;
    color: #4A5568;
    line-height: 1.8;
    margin-bottom: 20px;
}

.related-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #E8ECF1;

    .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 16px;
    }
}

.related-item {
    background-color: #FFFFFF;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;

    &:active {
        background-color: #F7F9FA;
    }
}

.related-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #0A2540;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.related-meta {
    display: block;
    font-size: 12px;
    color: #A0AEC0;
}

.bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    padding: 12px 20px;
    background-color: #FFFFFF;
    box-shadow: 0 -2px 8px rgba(10, 37, 64, 0.04);
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 20px;
    border-radius: 8px;
    background-color: #F7F9FA;

    &.active {
        background-color: #FEF2F2;
    }

    .action-text {
        margin-left: 6px;
        font-size: 14px;
        color: #4A5568;
    }

    &.primary {
        flex: 1;
        margin-left: 12px;
        background-color: #00D4AA;
        color: #0A2540;
        font-size: 14px;
        font-weight: 600;
    }
}
</style>

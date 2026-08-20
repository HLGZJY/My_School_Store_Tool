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

        <!-- 加载状态 -->
        <view v-if="loading" class="loading-mask">
            <view class="loading-content">
                <view class="loading-spinner"></view>
                <text class="loading-text">加载中...</text>
            </view>
        </view>

        <!-- 内容区域 -->
        <scroll-view v-else class="content" scroll-y>
            <!-- 文章信息 -->
            <view class="article-info">
                <view class="title">{{ article.title }}</view>

                <view class="meta">
                    <text class="source">{{ getSourceName(article.sourceId, article.sourceName) }}</text>
                    <text class="time">{{ formatTime(article.publishTime) }}</text>
                    <text class="views">{{ article.stats?.viewCount || 0 }} 阅读</text>
                </view>

                <view class="tags">
                    <view v-for="tag in article.tags?.source || []" :key="tag" class="tag source-tag">{{ tag }}</view>
                    <view v-for="tag in article.tags?.role || []" :key="tag" class="tag role-tag">{{ tag }}</view>
                    <view v-for="tag in article.tags?.custom || []" :key="tag" class="tag custom-tag">{{ tag }}</view>
                </view>
            </view>

            <!-- AI摘要 -->
            <view v-if="article.summary" class="summary-section">
                <view class="summary-title">📝 AI摘要</view>
                <text class="summary-text">{{ article.summary }}</text>
            </view>

            <!-- 正文（始终显示，支持展开/收起） -->
            <view v-if="article.content" class="article-content">
                <rich-text :nodes="getTruncatedContent(article.content)"></rich-text>
                <view v-if="article.content.length > 500" class="expand-btn" @click="toggleContent">
                    {{ contentExpanded ? '收起全文' : '展开全文' }}
                </view>
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
                    <text class="related-meta">{{ getSourceName(item.sourceId, item.sourceName) }} | {{ formatTime(item.publishTime) }}</text>
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
import { articleApi } from '@/api/index'
import { loadWithCache, clearCache } from '@/utils/cache.js'

export default {
    data() {
        return {
            articleId: '',
            article: {},
            relatedArticles: [],
            isCollected: false,
            loading: true,
            contentExpanded: false  // 内容是否展开
        }
    },
    onLoad(options) {
        this.articleId = options.id
        this.loadArticleDetail()
        this.loadCollectStatus()
        this.recordRead()

        // 监听收藏状态变化
        uni.$on('collectChange', this.onCollectChange)
    },
    onUnload() {
        uni.$off('collectChange', this.onCollectChange)
    },
    methods: {
        // 获取截断后的内容
        getTruncatedContent(content) {
            if (!content) return ''
            if (this.contentExpanded) return content
            // 截取前500字符
            return content.length > 500 ? content.substring(0, 500) + '...' : content
        },

        // 切换内容展开/收起
        toggleContent() {
            this.contentExpanded = !this.contentExpanded
        },

        async loadArticleDetail() {
            this.loading = true
            const cacheKey = `detail_${this.articleId}`
            console.log('[detail] loadArticleDetail, cacheKey:', cacheKey)
            const { data } = await loadWithCache(cacheKey, async () => {
                console.log('[detail] fetchFn called, articleId:', this.articleId)
                const result = await articleApi.getArticleDetail(this.articleId)
                console.log('[detail] getArticleDetail returned:', JSON.stringify(result)?.substring(0, 200))
                return result
            })

            console.log('[detail] loadWithCache returned data:', JSON.stringify(data)?.substring(0, 200))
            if (data) {
                this.article = data
                this.relatedArticles = data.relatedArticles || []
                console.log('文章详情加载成功:', this.article._id)
            } else {
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            }
            this.loading = false
        },

        async loadCollectStatus() {
            try {
                // 从本地存储获取 openid
                const openid = uni.getStorageSync('openid')
                if (!openid) {
                    console.log('loadCollectStatus: 未登录，不检查收藏状态')
                    return
                }

                const result = await articleApi.getCollections({
                    userId: openid,
                    articleId: this.articleId,
                    pageSize: 1
                })

                this.isCollected = result.collections.length > 0
            } catch (error) {
                console.error('加载收藏状态失败:', error)
            }
        },

        async recordRead() {
            try {
                // 从本地存储获取 openid
                const openid = uni.getStorageSync('openid')

                // 异步记录阅读，不阻塞页面
                articleApi.recordRead(openid || 'anonymous', this.articleId, 0)
            } catch (error) {
                console.error('记录阅读失败:', error)
            }
        },

        async toggleCollect() {
            // 获取 openid
            const openid = uni.getStorageSync('openid')
            if (!openid) {
                uni.showToast({
                    title: '请先登录',
                    icon: 'none'
                })
                return
            }

            try {
                const result = await articleApi.collectArticle(openid, this.articleId, this.isCollected ? 'uncollect' : 'collect')

                console.log('收藏响应:', result)
                this.isCollected = !this.isCollected
                // 发出事件，通知其他页面刷新
                uni.$emit('collectChange', { articleId: this.articleId, collected: this.isCollected })
                uni.showToast({
                    title: this.isCollected ? '收藏成功' : '取消收藏',
                    icon: 'success'
                })
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

        onCollectChange({ articleId, collected }) {
            if (articleId === this.articleId) {
                this.isCollected = collected
            }
        },

        goToArticle(id) {
            uni.redirectTo({
                url: `/pages/detail/detail?id=${id}`
            })
        },

        formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        },

        // 来源简称映射
        getSourceName(sourceId, sourceName) {
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

// 加载状态
.loading-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #F7F9FA;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99;
}

.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #E8ECF1;
    border-top-color: #00D4AA;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    font-size: 14px;
    color: #A0AEC0;
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
    max-width: 100%;
    box-sizing: border-box;
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

.custom-tag {
    background-color: #F0FDF4;
    color: #166534;
}

.summary-section {
    background-color: #F0FDFA;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    word-break: break-all;
    overflow: hidden;

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
        word-break: break-all;
    }
}

.article-content {
    font-size: 14px;
    color: #4A5568;
    line-height: 1.8;
    margin-bottom: 20px;
    word-break: break-all;
    overflow: hidden;
    max-width: 100%;

    :deep(img) {
        max-width: 100% !important;
        height: auto !important;
    }

    :deep(p) {
        max-width: 100% !important;
        word-wrap: break-word !important;
    }

    .expand-btn {
        text-align: center;
        padding: 12px;
        color: #07C160;
        font-size: 14px;
    }
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

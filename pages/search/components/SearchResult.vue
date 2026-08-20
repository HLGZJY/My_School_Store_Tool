<template>
    <scroll-view class="content" scroll-y @scrolltolower="$emit('loadMore')">
        <view v-if="articles.length > 0">
            <view
                v-for="article in articles"
                :key="article._id"
                class="article-card"
                @click="$emit('detail', article._id)"
            >
                <text class="article-title">{{ article.title }}</text>
                <text class="article-meta">{{ getSourceName(article.sourceId, article.sourceName) }} | {{ formatTime(article.publishTime) }}</text>
            </view>

            <view v-if="loading" class="loading-more">
                <uni-load-more status="loading"></uni-load-more>
            </view>
            <view v-if="!hasMore && articles.length > 0" class="no-more">
                <text>没有更多了</text>
            </view>
        </view>

        <view v-if="loading && articles.length === 0" class="loading">
            <uni-load-more status="loading"></uni-load-more>
        </view>
        <view v-else-if="articles.length === 0" class="empty">
            <text class="empty-text">未找到相关内容</text>
            <text class="empty-tip">试试其他关键词吧</text>
        </view>
    </scroll-view>
</template>

<script>
export default {
    name: 'SearchResult',
    props: {
        articles: {
            type: Array,
            default: () => []
        },
        loading: {
            type: Boolean,
            default: false
        },
        hasMore: {
            type: Boolean,
            default: true
        },
        keyword: {
            type: String,
            default: ''
        }
    },
    emits: ['loadMore', 'detail'],
    methods: {
        highlightTitle(text) {
            if (!this.keyword) return text
            const reg = new RegExp(this.keyword, 'gi')
            return text.replace(reg, match => `<span class="highlight">${match}</span>`)
        },
        formatTime(timestamp) {
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}月${date.getDate()}日`
        },
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
.content {
    height: calc(100vh - 64px);
}

.article-card {
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

.empty,
.loading {
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
</style>

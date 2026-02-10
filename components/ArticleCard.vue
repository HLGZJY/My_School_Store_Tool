<template>
    <view class="article-card" @click="onClick">
        <view class="article-header">
            <view v-if="article.urgency === 'high'" class="urgent-tag">📍 紧急</view>
            <text class="article-title">{{ article.title }}</text>
        </view>
        <view class="article-meta">
            <text class="source">{{ article.sourceName }}</text>
            <text class="time">{{ formatTime(article.publishTime) }}</text>
            <text class="views">{{ article.stats?.viewCount || 0 }} 阅读</text>
        </view>
        <view class="tags">
            <view v-for="tag in article.tags?.role || []" :key="tag" class="tag role-tag">{{ tag }}</view>
            <view v-if="article.urgency === 'medium'" class="tag urgent-medium">⏰ 本周截止</view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'ArticleCard',
    props: {
        article: {
            type: Object,
            required: true
        }
    },
    methods: {
        onClick() {
            this.$emit('click', this.article)
        },

        formatTime(timestamp) {
            const date = new Date(timestamp)
            const now = new Date()
            const diff = now - date
            const hours = Math.floor(diff / (1000 * 60 * 60))

            if (hours < 1) return '刚刚'
            if (hours < 24) return `${hours}小时前`
            if (hours < 48) return '昨天'
            return `${date.getMonth() + 1}月${date.getDate()}日`
        }
    }
}
</script>

<style lang="scss" scoped>
.article-card {
    background-color: #FFFFFF;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 2px 8px rgba(10, 37, 64, 0.04);

    &:active {
        transform: scale(0.98);
    }
}

.article-header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 8px;
}

.urgent-tag {
    font-size: 12px;
    color: #EF4444;
    margin-right: 8px;
    flex-shrink: 0;
}

.article-title {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.article-meta {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #A0AEC0;
    margin-bottom: 12px;

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

.role-tag {
    background-color: #DBEAFE;
    color: #1E40AF;
}

.urgent-medium {
    background-color: #FFEDD5;
    color: #F97316;
}
</style>

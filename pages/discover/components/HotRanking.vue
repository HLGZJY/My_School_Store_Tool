<template>
    <view class="section">
        <view class="section-header">
            <text class="section-title">🔥 热门排行</text>
            <text class="more-link" @click="viewMore">查看更多</text>
        </view>
        <view class="ranking-list">
            <view
                v-for="(item, index) in ranking"
                :key="item._id"
                class="ranking-item"
                @click="goToDetail(item._id)"
            >
                <view class="rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</view>
                <view class="ranking-info">
                    <text class="article-title">{{ item.title }}</text>
                    <text class="article-meta">{{ item.count }} 阅读</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'HotRanking',
    props: {
        ranking: {
            type: Array,
            default: () => []
        }
    },
    emits: ['more', 'detail'],
    methods: {
        viewMore() {
            this.$emit('more')
        },
        goToDetail(id) {
            this.$emit('detail', id)
        }
    }
}
</script>

<style lang="scss" scoped>
.section {
    padding: 20px;
    background-color: #FFFFFF;
    margin-bottom: 8px;
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

.more-link {
    font-size: 14px;
    color: #00D4AA;
}

.ranking-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }
}

.rank {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #E8ECF1;
    color: #4A5568;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    margin-right: 12px;

    &.rank-1 {
        background-color: #FFD700;
        color: #FFFFFF;
    }

    &.rank-2 {
        background-color: #C0C0C0;
        color: #FFFFFF;
    }

    &.rank-3 {
        background-color: #CD7F32;
        color: #FFFFFF;
    }
}

.ranking-info {
    flex: 1;

    .article-title {
        display: block;
        font-size: 14px;
        color: #4A5568;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
    }

    .article-meta {
        display: block;
        font-size: 12px;
        color: #A0AEC0;
    }
}
</style>

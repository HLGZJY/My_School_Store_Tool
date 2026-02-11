<template>
    <scroll-view class="content" scroll-y>
        <!-- 搜索历史 -->
        <view v-if="history.length > 0" class="section">
            <view class="section-header">
                <text class="section-title">搜索历史</text>
                <text class="clear-btn" @click="$emit('clear')">清空</text>
            </view>
            <view class="tag-list">
                <view
                    v-for="item in history"
                    :key="item"
                    class="tag-item"
                    @click="$emit('search', item)"
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
                    @click="$emit('search', item.keyword)"
                >
                    {{ item.keyword }}
                </view>
            </view>
        </view>
    </scroll-view>
</template>

<script>
export default {
    name: 'SearchSuggest',
    props: {
        history: {
            type: Array,
            default: () => []
        },
        hotKeywords: {
            type: Array,
            default: () => []
        }
    },
    emits: ['search', 'clear']
}
</script>

<style lang="scss" scoped>
.content {
    height: calc(100vh - 64px);
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
    transition: all 0.2s ease;

    &.hot {
        color: #00D4AA;
    }

    &:active {
        background-color: #F7F9FA;
        transform: scale(0.95);
    }
}
</style>

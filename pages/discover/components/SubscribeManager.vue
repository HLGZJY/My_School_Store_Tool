<template>
    <view class="section">
        <view class="section-header">
            <text class="section-title">📑 订阅管理</text>
            <text class="more-link" @click="viewMore">系统推荐</text>
        </view>

        <!-- 已订阅 -->
        <view class="subscribe-group">
            <view class="group-title">已订阅</view>
            <view class="subscribe-list">
                <view
                    v-for="item in subscribed"
                    :key="item.id"
                    class="subscribe-item subscribed"
                >
                    <text class="item-name">{{ item.name }}</text>
                    <view class="unsubscribe-btn" @click="unsubscribe(item)">
                        <text>取消订阅</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 推荐订阅 -->
        <view class="subscribe-group">
            <view class="group-title">为你推荐</view>
            <view class="subscribe-list">
                <view
                    v-for="item in recommended"
                    :key="item.id"
                    class="subscribe-item"
                >
                    <text class="item-name">{{ item.name }}</text>
                    <view class="subscribe-btn" @click="subscribe(item)">
                        <text>+ 订阅</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'SubscribeManager',
    props: {
        subscribed: {
            type: Array,
            default: () => []
        },
        recommended: {
            type: Array,
            default: () => []
        }
    },
    emits: ['subscribe', 'unsubscribe', 'more'],
    methods: {
        subscribe(item) {
            this.$emit('subscribe', item)
        },
        unsubscribe(item) {
            this.$emit('unsubscribe', item)
        },
        viewMore() {
            this.$emit('more')
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

.subscribe-group {
    margin-bottom: 20px;

    &:last-child {
        margin-bottom: 0;
    }
}

.group-title {
    font-size: 14px;
    font-weight: 600;
    color: #4A5568;
    margin-bottom: 12px;
}

.subscribe-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.subscribe-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: #F7F9FA;
    border-radius: 8px;

    &.subscribed {
        background-color: #E6FFFA;
        border: 1px solid #00D4AA;
    }

    &:active {
        opacity: 0.8;
    }
}

.item-name {
    font-size: 14px;
    color: #0A2540;
}

.subscribe-btn {
    padding: 4px 12px;
    background-color: #00D4AA;
    border-radius: 4px;

    text {
        font-size: 12px;
        color: #FFFFFF;
    }
}

.unsubscribe-btn {
    padding: 4px 12px;
    background-color: #E8ECF1;
    border-radius: 4px;

    text {
        font-size: 12px;
        color: #4A5568;
    }
}
</style>

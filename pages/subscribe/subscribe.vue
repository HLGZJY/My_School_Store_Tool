<template>
    <view class="container">
        <!-- 已订阅 -->
        <view class="section">
            <text class="section-title">已订阅</text>
            <view v-if="subscribed.length > 0">
                <view
                    v-for="item in subscribed"
                    :key="item._id"
                    class="source-card"
                >
                    <view class="source-info">
                        <text class="source-name">{{ item.name }}</text>
                        <text class="source-desc">{{ item.description }}</text>
                    </view>
                    <view class="subscribe-btn subscribed" @click="unsubscribe(item._id)">
                        <text>已订阅</text>
                    </view>
                </view>
            </view>
            <view v-else class="empty-tip">
                <text>还没有订阅任何源</text>
            </view>
        </view>

        <!-- 系统推荐 -->
        <view class="section">
            <text class="section-title">系统推荐</text>
            <view v-if="recommended.length > 0">
                <view
                    v-for="item in recommended"
                    :key="item._id"
                    class="source-card"
                >
                    <view class="source-info">
                        <text class="source-name">{{ item.name }}</text>
                        <text class="source-desc">{{ item.description }}</text>
                    </view>
                    <view
                        class="subscribe-btn"
                        :class="{ subscribed: isSubscribed(item._id) }"
                        @click="toggleSubscribe(item)"
                    >
                        <text>{{ isSubscribed(item._id) ? '已订阅' : '订阅' }}</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            subscribed: [],
            recommended: []
        }
    },
    onLoad() {
        this.loadSubscribeSources()
    },
    methods: {
        async loadSubscribeSources() {
            try {
                const userId = this.$store.state.user.userId

                const res = await uniCloud.callFunction({
                    name: 'getSubscribeSources',
                    data: { userId }
                })

                if (res.result.code === 0) {
                    this.subscribed = res.result.data.subscribed || []
                    this.recommended = res.result.data.recommended || []
                }
            } catch (error) {
                console.error('加载订阅源失败:', error)
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            }
        },

        isSubscribed(sourceId) {
            return this.subscribed.some(s => s._id === sourceId)
        },

        async toggleSubscribe(source) {
            const userId = this.$store.state.user.userId
            if (!userId) {
                uni.showToast({
                    title: '请先登录',
                    icon: 'none'
                })
                return
            }

            const isSub = this.isSubscribed(source._id)
            const action = isSub ? 'unsubscribe' : 'subscribe'

            try {
                const res = await uniCloud.callFunction({
                    name: 'toggleSubscribe',
                    data: {
                        userId,
                        sourceId: source._id,
                        action
                    }
                })

                if (res.result.code === 0) {
                    uni.showToast({
                        title: isSub ? '已取消订阅' : '订阅成功',
                        icon: 'success'
                    })
                    this.loadSubscribeSources()
                }
            } catch (error) {
                console.error('订阅操作失败:', error)
                uni.showToast({
                    title: '操作失败',
                    icon: 'none'
                })
            }
        },

        unsubscribe(sourceId) {
            this.toggleSubscribe(this.subscribed.find(s => s._id === sourceId))
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.section {
    margin-top: 16px;
    background-color: #FFFFFF;
}

.section-title {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
    padding: 20px 20px 12px;
}

.source-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }
}

.source-info {
    flex: 1;

    .source-name {
        display: block;
        font-size: 16px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 4px;
    }

    .source-desc {
        display: block;
        font-size: 12px;
        color: #A0AEC0;
    }
}

.subscribe-btn {
    padding: 8px 20px;
    background-color: #00D4AA;
    color: #0A2540;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;

    &.subscribed {
        background-color: #E8ECF1;
        color: #4A5568;
    }
}

.empty-tip {
    padding: 40px 20px;
    text-align: center;
    font-size: 14px;
    color: #A0AEC0;
}
</style>

<template>
    <view class="container">
        <view class="header">
            <text class="title">消息通知</text>
            <view v-if="hasUnread" class="mark-read" @click="markAllRead">
                <text>全部已读</text>
            </view>
        </view>

        <scroll-view class="content" scroll-y @scrolltolower="loadMore">
            <view v-if="messages.length > 0">
                <view
                    v-for="item in messages"
                    :key="item._id"
                    class="message-card"
                    :class="{ unread: !item.isRead }"
                    @click="handleMessageClick(item)"
                >
                    <view class="message-header">
                        <text class="message-title">{{ item.title }}</text>
                        <text class="message-time">{{ formatTime(item.createTime) }}</text>
                    </view>
                    <text class="message-content">{{ item.content }}</text>
                </view>

                <view v-if="loading" class="loading-more">
                    <uni-load-more status="loading"></uni-load-more>
                </view>
                <view v-if="!hasMore && messages.length > 0" class="no-more">
                    <text>没有更多了</text>
                </view>
            </view>

            <view v-else class="empty">
                <text class="empty-text">暂无消息</text>
            </view>
        </scroll-view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            messages: [],
            page: 1,
            hasMore: true,
            loading: false
        }
    },
    computed: {
        hasUnread() {
            return this.messages.some(m => !m.isRead)
        }
    },
    onLoad() {
        this.loadMessages()
    },
    onShow() {
        this.page = 1
        this.hasMore = true
        this.loadMessages()
    },
    methods: {
        async loadMessages() {
            if (this.loading) return
            this.loading = true

            try {
                const userId = this.$store.state.user.userId

                const res = await uniCloud.callFunction({
                    name: 'getMessages',
                    data: {
                        userId,
                        type: 'all',
                        page: this.page,
                        pageSize: 20
                    }
                })

                if (res.result.code === 0) {
                    const { messages, hasMore } = res.result.data

                    if (this.page === 1) {
                        this.messages = messages
                    } else {
                        this.messages = [...this.messages, ...messages]
                    }

                    this.hasMore = hasMore
                }
            } catch (error) {
                console.error('加载消息失败:', error)
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            } finally {
                this.loading = false
            }
        },

        loadMore() {
            if (this.hasMore && !this.loading) {
                this.page++
                this.loadMessages()
            }
        },

        async handleMessageClick(message) {
            // 标记为已读
            if (!message.isRead) {
                await this.markAsRead(message._id)
                message.isRead = true
            }

            // 如果有跳转链接，执行跳转
            if (message.link) {
                uni.navigateTo({
                    url: message.link,
                    fail: () => {
                        // 如果页面跳转失败，可能是tabbar页面
                        uni.switchTab({
                            url: message.link
                        })
                    }
                })
            }
        },

        async markAsRead(messageId) {
            try {
                await uniCloud.callFunction({
                    name: 'markMessageRead',
                    data: {
                        userId: this.$store.state.user.userId,
                        messageId
                    }
                })
            } catch (error) {
                console.error('标记已读失败:', error)
            }
        },

        async markAllRead() {
            uni.showModal({
                title: '提示',
                content: '确定将所有消息标记为已读吗？',
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            await uniCloud.callFunction({
                                name: 'markMessageRead',
                                data: {
                                    userId: this.$store.state.user.userId,
                                    all: true
                                }
                            })

                            uni.showToast({
                                title: '已全部标记为已读',
                                icon: 'success'
                            })

                            this.messages.forEach(m => {
                                m.isRead = true
                            })
                        } catch (error) {
                            console.error('标记已读失败:', error)
                            uni.showToast({
                                title: '操作失败',
                                icon: 'none'
                            })
                        }
                    }
                }
            })
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
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background-color: #FFFFFF;
}

.title {
    font-size: 18px;
    font-weight: 600;
    color: #0A2540;
}

.mark-read {
    padding: 6px 12px;
    background-color: #F7F9FA;
    border-radius: 6px;
    font-size: 14px;
    color: #4A5568;
}

.content {
    height: calc(100vh - 68px);
}

.message-card {
    background-color: #FFFFFF;
    padding: 16px;
    margin: 8px 16px;
    border-radius: 8px;

    &.unread {
        background-color: #F0FDFA;
        border-left: 3px solid #00D4AA;
    }

    &:active {
        background-color: #F7F9FA;
    }
}

.message-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.message-title {
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
}

.message-time {
    font-size: 12px;
    color: #A0AEC0;
}

.message-content {
    display: block;
    font-size: 14px;
    color: #4A5568;
    line-height: 1.6;
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
}
</style>

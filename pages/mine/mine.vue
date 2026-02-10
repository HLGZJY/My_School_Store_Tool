<template>
    <view class="container">
        <!-- 用户信息 -->
        <view class="user-section">
            <image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFill"></image>
            <view class="user-info">
                <text class="nickname">{{ userInfo.nickname || '未登录' }}</text>
                <view class="role-badge" v-if="userInfo.role">
                    <text>{{ getRoleName(userInfo.role) }}</text>
                </view>
            </view>
        </view>

        <!-- 统计信息 -->
        <view class="stats-section">
            <view class="stat-item" @click="goToCollection">
                <text class="stat-value">{{ stats.collectCount || 0 }}</text>
                <text class="stat-label">收藏</text>
            </view>
            <view class="stat-item" @click="goToHistory">
                <text class="stat-value">{{ stats.readCount || 0 }}</text>
                <text class="stat-label">阅读</text>
            </view>
        </view>

        <!-- 功能列表 -->
        <view class="menu-section">
            <view class="menu-item" @click="goToSubscribe">
                <view class="menu-left">
                    <uni-icons type="notification" size="20" color="#00D4AA"></uni-icons>
                    <text class="menu-text">订阅管理</text>
                </view>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
            <view class="menu-item" @click="goToMessage">
                <view class="menu-left">
                    <uni-icons type="email" size="20" color="#00D4AA"></uni-icons>
                    <text class="menu-text">消息通知</text>
                </view>
                <view class="menu-right">
                    <view v-if="unreadCount > 0" class="badge">{{ unreadCount }}</view>
                    <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
                </view>
            </view>
            <view class="menu-item" @click="goToSettings">
                <view class="menu-left">
                    <uni-icons type="gear" size="20" color="#00D4AA"></uni-icons>
                    <text class="menu-text">设置</text>
                </view>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            userInfo: {},
            stats: {
                collectCount: 0,
                readCount: 0
            },
            unreadCount: 0
        }
    },
    onLoad() {
        this.loadUserInfo()
        this.loadStats()
        this.loadUnreadCount()
    },
    onShow() {
        this.loadUnreadCount()
    },
    methods: {
        async loadUserInfo() {
            try {
                const userId = this.$store.state.user.userId
                if (!userId) return

                const res = await uniCloud.callFunction({
                    name: 'getUserInfo',
                    data: { userId }
                })

                if (res.result.code === 0) {
                    this.userInfo = res.result.data
                }
            } catch (error) {
                console.error('加载用户信息失败:', error)
            }
        },

        async loadStats() {
            try {
                const userId = this.$store.state.user.userId
                if (!userId) return

                const res = await uniCloud.callFunction({
                    name: 'getUserInfo',
                    data: { userId }
                })

                if (res.result.code === 0) {
                    this.stats = res.result.data.stats
                }
            } catch (error) {
                console.error('加载统计信息失败:', error)
            }
        },

        async loadUnreadCount() {
            try {
                const userId = this.$store.state.user.userId
                if (!userId) return

                const res = await uniCloud.callFunction({
                    name: 'getMessages',
                    data: {
                        userId,
                        type: 'unread',
                        page: 1,
                        pageSize: 1
                    }
                })

                if (res.result.code === 0) {
                    this.unreadCount = res.result.data.unreadCount || 0
                }
            } catch (error) {
                console.error('加载未读消息数失败:', error)
            }
        },

        getRoleName(role) {
            const roleMap = {
                'student': '学生',
                'teacher': '教师',
                'admin': '行政人员'
            }
            return roleMap[role] || ''
        },

        goToCollection() {
            uni.navigateTo({
                url: '/pages/collection/collection'
            })
        },

        goToHistory() {
            uni.navigateTo({
                url: '/pages/history/history'
            })
        },

        goToSubscribe() {
            uni.navigateTo({
                url: '/pages/subscribe/subscribe'
            })
        },

        goToMessage() {
            uni.navigateTo({
                url: '/pages/message/message'
            })
        },

        goToSettings() {
            uni.navigateTo({
                url: '/pages/settings/settings'
            })
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.user-section {
    display: flex;
    align-items: center;
    padding: 40px 20px 20px;
    background-color: #FFFFFF;
}

.avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin-right: 16px;
}

.user-info {
    flex: 1;

    .nickname {
        display: block;
        font-size: 18px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 8px;
    }

    .role-badge {
        display: inline-block;
        padding: 4px 12px;
        background-color: #F0FDFA;
        border-radius: 12px;
        font-size: 12px;
        color: #00D4AA;
    }
}

.stats-section {
    display: flex;
    padding: 20px;
    background-color: #FFFFFF;
    margin-top: 8px;
}

.stat-item {
    flex: 1;
    text-align: center;

    &:not(:last-child) {
        position: relative;

        &::after {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 1px;
            height: 30px;
            background-color: #E8ECF1;
        }
    }

    .stat-value {
        display: block;
        font-size: 20px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 4px;
    }

    .stat-label {
        display: block;
        font-size: 12px;
        color: #A0AEC0;
    }
}

.menu-section {
    margin-top: 8px;
    background-color: #FFFFFF;
}

.menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }

    &:active {
        background-color: #F7F9FA;
    }
}

.menu-left {
    display: flex;
    align-items: center;

    .menu-text {
        margin-left: 12px;
        font-size: 14px;
        color: #4A5568;
    }
}

.menu-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.badge {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background-color: #EF4444;
    border-radius: 10px;
    font-size: 12px;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>

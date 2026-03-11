<template>
    <view class="container">
        <!-- 顶部欢迎区 -->
        <view class="header">
            <view class="welcome">
                <text class="title">管理后台</text>
                <text class="subtitle">{{ adminInfo.nickname || '管理员' }}</text>
            </view>
            <view class="logout-btn" @click="handleLogout">
                <text>退出</text>
            </view>
        </view>

        <!-- 统计卡片 -->
        <view class="stats-grid">
            <view class="stat-card" @click="goToReview">
                <text class="stat-num">{{ stats.totalArticles }}</text>
                <text class="stat-label">文章总数</text>
            </view>
            <view class="stat-card">
                <text class="stat-num">{{ stats.todayArticles }}</text>
                <text class="stat-label">今日新增</text>
            </view>
            <view class="stat-card" @click="goToReview">
                <text class="stat-num">{{ stats.pendingReview }}</text>
                <text class="stat-label">待审核</text>
            </view>
            <view class="stat-card" @click="goToSources">
                <text class="stat-num">{{ stats.sources }}</text>
                <text class="stat-label">数据源</text>
            </view>
        </view>

        <!-- 链接池状态 -->
        <view class="link-pool-section" v-if="stats.pendingLinks > 0">
            <view class="link-pool-info" @click="goToSimpleFetch">
                <view class="link-pool-left">
                    <uni-icons type="link" size="20" color="#FF9500"></uni-icons>
                    <text class="link-pool-text">链接池待处理</text>
                </view>
                <view class="link-pool-right">
                    <text class="link-pool-count">{{ stats.pendingLinks }} 条</text>
                    <text class="link-pool-arrow">去处理 ></text>
                </view>
            </view>
        </view>

        <!-- 功能菜单 -->
        <view class="menu-section">
            <text class="section-title">数据管理</text>
            <view class="menu-grid">
                <view class="menu-item" @click="goToReview">
                    <view class="menu-icon review">
                        <uni-icons type="flag" size="24" color="#FF9500"></uni-icons>
                    </view>
                    <text class="menu-text">文章审核</text>
                    <view class="badge" v-if="stats.pendingReview > 0">{{ stats.pendingReview }}</view>
                </view>
                <view class="menu-item" @click="goToSources">
                    <view class="menu-icon source">
                        <uni-icons type="link" size="24" color="#007AFF"></uni-icons>
                    </view>
                    <text class="menu-text">数据源</text>
                </view>
                <view class="menu-item" @click="goToUsers">
                    <view class="menu-icon users">
                        <uni-icons type="person" size="24" color="#5856D6"></uni-icons>
                    </view>
                    <text class="menu-text">用户管理</text>
                </view>
                <view class="menu-item" @click="goToWcTest">
                    <view class="menu-icon wc">
                        <uni-icons type="weixin" size="24" color="#07C160"></uni-icons>
                    </view>
                    <text class="menu-text">微信采集</text>
                </view>
                <view class="menu-item" @click="goToSimpleFetch">
                    <view class="menu-icon simple-fetch">
                        <uni-icons type="search" size="24" color="#5856D6"></uni-icons>
                    </view>
                    <text class="menu-text">简化测试</text>
                </view>
            </view>
        </view>

        <!-- 最近操作日志 -->
        <view class="log-section">
            <text class="section-title">最近采集日志</text>
            <view class="log-list">
                <view class="log-item" v-for="(item, index) in recentLogs" :key="index">
                    <text class="log-time">{{ formatTime(item.time) }}</text>
                    <text class="log-content">{{ item.message }}</text>
                    <text :class="['log-status', item.status]">{{ item.statusText }}</text>
                </view>
                <view v-if="recentLogs.length === 0" class="empty-log">
                    <text>暂无采集记录</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            adminInfo: {},
            stats: {
                totalArticles: 0,
                todayArticles: 0,
                pendingReview: 0,
                sources: 0,
                pendingLinks: 0
            },
            recentLogs: []
        }
    },
    onLoad() {
        this.checkAdminAuth()
        this.loadAdminInfo()
        this.loadStats()
    },
    onShow() {
        this.loadStats()
        this.loadLogs()
    },
    methods: {
        // 检查管理员权限
        checkAdminAuth() {
            const entryType = uni.getStorageSync('entryType')
            if (entryType !== 'admin') {
                uni.showToast({
                    title: '无管理员权限',
                    icon: 'none'
                })
                setTimeout(() => {
                    uni.reLaunch({
                        url: '/pages/login/login'
                    })
                }, 1500)
            }
        },

        // 加载管理员信息
        loadAdminInfo() {
            const userInfo = this.$store.state.user.userInfo
            if (userInfo) {
                this.adminInfo = userInfo
            }
        },

        // 加载统计数据
        async loadStats() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'adminStats',
                    data: { action: 'getStats' }
                })

                console.log('[adminStats] 响应:', res.result)

                if (res.result.code === 0) {
                    this.stats = res.result.data
                } else {
                    console.error('获取统计数据失败:', res.result.message)
                }
            } catch (e) {
                console.error('加载统计数据失败:', e)
            }
        },

        // 加载最近日志
        async loadLogs() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'adminStats',
                    data: { action: 'getLogs' }
                })

                if (res.result.code === 0) {
                    this.recentLogs = res.result.data || []
                }
            } catch (e) {
                console.error('加载日志失败:', e)
            }
        },

        // 跳转审核页面
        goToReview() {
            uni.navigateTo({
                url: '/pages/admin/review'
            })
        },

        // 跳转数据源管理
        goToSources() {
            uni.navigateTo({
                url: '/pages/admin/sources'
            })
        },

        // 跳转用户管理
        goToUsers() {
            uni.navigateTo({
                url: '/pages/admin/users'
            })
        },

        // 跳转微信采集测试
        goToWcTest() {
            uni.navigateTo({
                url: '/pages/admin/wc-test'
            })
        },

        // 跳转简化抓取测试
        goToSimpleFetch() {
            uni.navigateTo({
                url: '/pages/admin/simple-fetch'
            })
        },

        // 退出登录
        handleLogout() {
            uni.showModal({
                title: '确认退出',
                content: '确定要退出管理端吗？',
                success: (res) => {
                    if (res.confirm) {
                        this.$store.commit('user/clear')
                        uni.clearStorageSync()
                        uni.reLaunch({
                            url: '/pages/login/login'
                        })
                    }
                }
            })
        },

        // 格式化时间
        formatTime(timestamp) {
            if (!timestamp) return ''
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    padding: 16px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, #07C160 0%, #06AD56 100%);
    border-radius: 12px;
    margin-bottom: 16px;

    .welcome {
        display: flex;
        flex-direction: column;

        .title {
            font-size: 20px;
            font-weight: 600;
            color: #FFFFFF;
        }

        .subtitle {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 4px;
        }
    }

    .logout-btn {
        padding: 8px 16px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 20px;

        text {
            font-size: 14px;
            color: #FFFFFF;
        }
    }
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    .stat-card {
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 16px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;

        .stat-num {
            font-size: 24px;
            font-weight: 600;
            color: #0A2540;
        }

        .stat-label {
            font-size: 12px;
            color: #A0AEC0;
            margin-top: 4px;
        }
    }
}

.link-pool-section {
    margin-bottom: 20px;
}

.link-pool-info {
    background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.link-pool-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.link-pool-text {
    font-size: 14px;
    font-weight: 500;
    color: #FFFFFF;
}

.link-pool-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.link-pool-count {
    font-size: 14px;
    font-weight: 600;
    color: #FFFFFF;
}

.link-pool-arrow {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
}

.menu-section {
    margin-bottom: 20px;

    .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 12px;
        display: block;
    }

    .menu-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;

        .menu-item {
            background-color: #FFFFFF;
            border-radius: 12px;
            padding: 16px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;

            .menu-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 8px;

                &.sync { background-color: #E8F5E9; }
                &.review { background-color: #FFF3E0; }
                &.source { background-color: #E3F2FD; }
                &.users { background-color: #F3E5F5; }
                &.wc { background-color: #E0F2F1; }
                &.simple-fetch { background-color: #E3F2FD; }
            }

            .menu-text {
                font-size: 12px;
                color: #0A2540;
            }

            .badge {
                position: absolute;
                top: 8px;
                right: 8px;
                background-color: #FF3B30;
                color: #FFFFFF;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            }
        }
    }
}

.log-section {
    .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 12px;
        display: block;
    }

    .log-list {
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 12px;

        .log-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #F0F0F0;

            &:last-child {
                border-bottom: none;
            }

            .log-time {
                font-size: 12px;
                color: #A0AEC0;
                width: 70px;
            }

            .log-content {
                flex: 1;
                font-size: 14px;
                color: #0A2540;
            }

            .log-status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 4px;

                &.success {
                    background-color: #E8F5E9;
                    color: #07C160;
                }

                &.error {
                    background-color: #FFEBEE;
                    color: #FF3B30;
                }
            }
        }

        .empty-log {
            text-align: center;
            padding: 30px;
            color: #A0AEC0;
            font-size: 14px;
        }
    }
}
</style>

<template>
    <view class="container">
        <!-- 已登录状态 -->
        <template v-if="isLoggedIn">
            <UserCard
                :avatar="userInfo.avatar || userInfo.avatarUrl"
                :nickname="userInfo.nickname || userInfo.nickName"
                :role="userInfo.role"
                :roleDetail="userInfo.roleDetail"
            />

            <StatsCard
                @click="goToPage"
            />
        </template>

        <!-- 未登录状态 -->
        <template v-else>
            <view class="not-login-card" @click="goToLogin">
                <image class="avatar" src="/static/logo.png" mode="aspectFill"></image>
                <view class="info">
                    <text class="nickname">点击登录</text>
                    <text class="tip">登录后可使用更多功能</text>
                </view>
                <uni-icons type="arrowright" size="20" color="#A0AEC0"></uni-icons>
            </view>
        </template>

        <!-- 菜单列表 -->
        <view class="menu-list">
            <view class="menu-item" @click="goToPage('message')">
                <view class="left">
                    <uni-icons type="email" size="20" color="#00D4AA"></uni-icons>
                    <text class="text">消息通知</text>
                </view>
                <view class="right">
                    <view v-if="unreadCount > 0" class="badge">{{ unreadCount }}</view>
                    <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
                </view>
            </view>

            <view class="menu-item" @click="goToAbout">
                <view class="left">
                    <uni-icons type="info" size="20" color="#00D4AA"></uni-icons>
                    <text class="text">关于小程序</text>
                </view>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>

            <view class="menu-item" @click="clearCache">
                <view class="left">
                    <uni-icons type="trash" size="20" color="#00D4AA"></uni-icons>
                    <text class="text">清除缓存</text>
                </view>
                <text class="cache-size">{{ cacheSize }}</text>
            </view>

            <view class="menu-item" @click="contactUs">
                <view class="left">
                    <uni-icons type="chat" size="20" color="#00D4AA"></uni-icons>
                    <text class="text">联系我们</text>
                </view>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>

            <view v-if="isLoggedIn" class="menu-item danger" @click="deleteAccount">
                <view class="left">
                    <uni-icons type="close" size="20" color="#EF4444"></uni-icons>
                    <text class="text">注销账号</text>
                </view>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
        </view>

        <!-- 退出登录 -->
        <view v-if="isLoggedIn" class="logout-btn" @click="logout">
            <text>退出登录</text>
        </view>

        <view class="version">v1.0.0</view>
    </view>
</template>

<script>
import { userApi } from '@/api/index'
import { useUserStore } from '@/store'
import UserCard from './components/UserCard.vue';
import StatsCard from './components/StatsCard.vue';

const PAGE_MAP = {
    collect: '/pages/collection/collection',
    read: '/pages/history/history',
    message: '/pages/message/message',
    about: '/pages/about/about'
};

export default {
    name: 'Mine',
    components: { UserCard, StatsCard },
    data: () => ({
        userInfo: {},
        unreadCount: 0,
        cacheSize: '0MB'
    }),
    computed: {
        isLoggedIn() {
            const userStore = useUserStore()
            return userStore.isLoggedIn
        }
    },
    onLoad() {
        this.calculateCacheSize();
        this.applySystemSettings();
    },
    onShow() {
        this.loadData();
        this.loadUnread();
    },
    methods: {
        async loadData() {
            const openid = uni.getStorageSync('openid');
            if (!openid) return;

            try {
                const result = await userApi.getUserInfo(openid);
                this.userInfo = result;
            } catch (e) {
                console.error('加载用户信息失败:', e);
            }
        },
        async loadUnread() {
            const openid = uni.getStorageSync('openid');
            if (!openid) return;

            try {
                const result = await userApi.getMessages({ userId: openid, type: 'unread' });
                this.unreadCount = result.unreadCount || 0;
            } catch (e) {
                console.error('加载未读消息数失败:', e);
            }
        },
        applySystemSettings() {
            // 获取系统信息，跟随系统设置
            const systemInfo = uni.getSystemInfoSync();
            const { fontSizeRatio } = systemInfo;

            // 微信小程序支持监听主题变化
            if (uni.onThemeChange) {
                uni.onThemeChange((res) => {
                    if (res.theme === 'dark') {
                        uni.setStorageSync('darkMode', true);
                    } else {
                        uni.removeStorageSync('darkMode');
                    }
                });
            }
        },
        calculateCacheSize() {
            try {
                const res = uni.getStorageInfoSync();
                const size = res.currentSize;
                const sizeMB = (size / 1024).toFixed(2);
                this.cacheSize = `${sizeMB}MB`;
            } catch (error) {
                console.error('计算缓存大小失败:', error);
            }
        },
        goToPage(name) {
            const url = PAGE_MAP[name];
            if (url) uni.navigateTo({ url });
        },
        goToAbout() {
            uni.navigateTo({ url: '/pages/about/about' });
        },
        clearCache() {
            uni.showModal({
                title: '清除缓存',
                content: '清除本地缓存数据',
                success: (res) => {
                    if (res.confirm) {
                        try {
                            const userStore = useUserStore()
                            userStore.logout();
                            uni.showToast({ title: '缓存已清除', icon: 'success' });
                            this.calculateCacheSize();
                        } catch (error) {
                            console.error('清除缓存失败:', error);
                            uni.showToast({ title: '清除失败', icon: 'none' });
                        }
                    }
                }
            });
        },
        contactUs() {
            uni.showModal({
                title: '联系我们',
                content: '如遇到问题，请通过以下方式联系我们：\n邮箱：support@example.com',
                showCancel: false
            });
        },
        deleteAccount() {
            uni.showModal({
                title: '注销账号',
                content: '注销后将删除您的所有数据（收藏、阅读历史、搜索历史、订阅信息等），且无法恢复。确定要注销吗？',
                confirmText: '确定注销',
                confirmColor: '#EF4444',
                success: async (res) => {
                    if (res.confirm) {
                        uni.showModal({
                            title: '再次确认',
                            content: '注销后您将无法找回任何数据，请确认是否继续？',
                            confirmText: '确认注销',
                            confirmColor: '#EF4444',
                            async success(res2) {
                                if (res2.confirm) {
                                    uni.showLoading({ title: '注销中...' });
                                    try {
                                        // 从本地存储获取 openid
                                        const openid = uni.getStorageSync('openid');
                                        if (!openid) {
                                            uni.hideLoading();
                                            uni.showToast({ title: '用户未登录', icon: 'none' });
                                            return;
                                        }
                                        const res3 = await userApi.deleteUserAccount(openid);
                                        if (res3.code === 0) {
                                            uni.showToast({ title: '账号已注销', icon: 'success' });
                                            setTimeout(() => {
                                                uni.clearStorageSync();
                                                uni.reLaunch({ url: '/pages/login/login' });
                                            }, 1500);
                                        } else {
                                            uni.showToast({ title: res3.message || '注销失败', icon: 'none' });
                                        }
                                    } catch (error) {
                                        console.error('注销失败:', error);
                                        uni.showToast({ title: '注销失败，请重试', icon: 'none' });
                                    } finally {
                                        uni.hideLoading();
                                    }
                                }
                            }
                        });
                    }
                }
            });
        },
        goToLogin() {
            uni.navigateTo({ url: '/pages/login/login' });
        },

        logout() {
            uni.showModal({
                title: '提示',
                content: '确定退出登录吗？',
                success: (res) => {
                    if (res.confirm) {
                        const userStore = useUserStore()
                        userStore.logout();
                        uni.reLaunch({ url: '/pages/login/login' });
                    }
                }
            });
        }
    }
};
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    padding-bottom: 20px;
}

.not-login-card {
    display: flex;
    align-items: center;
    padding: 40px 20px 24px;
    background-color: #FFFFFF;

    .avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        margin-right: 16px;
    }

    .info {
        flex: 1;

        .nickname {
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #0A2540;
            margin-bottom: 4px;
        }

        .tip {
            font-size: 13px;
            color: #A0AEC0;
        }
    }
}

.menu-list {
    background-color: #FFFFFF;
    margin-top: 8px;
}

.menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #E8ECF1;
    background-color: #FFFFFF;

    &:last-child { border-bottom: none; }
    &:active { background-color: #F7F9FA; }

    &.danger {
        .text {
            color: #EF4444;
        }
    }
}

.left, .right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.text {
    font-size: 14px;
    color: #4A5568;
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

.cache-size {
    font-size: 14px;
    color: #A0AEC0;
}

.logout-btn {
    margin: 40px 20px;
    padding: 16px;
    background-color: #FFFFFF;
    border-radius: 8px;
    text-align: center;
    font-size: 16px;
    color: #EF4444;

    &:active {
        background-color: #F7F9FA;
    }
}

.version {
    padding: 20px 0;
    text-align: center;
    font-size: 12px;
    color: #A0AEC0;
}
</style>

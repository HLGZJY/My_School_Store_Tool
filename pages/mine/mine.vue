<template>
    <view class="container">
        <UserCard
            :avatar="userInfo.avatar"
            :nickname="userInfo.nickname"
            :role="userInfo.role"
            :roleDetail="userInfo.roleDetail"
            @click="goToRole"
            @switchRole="goToRole"
        />

        <StatsCard
            @click="goToPage"
        />

        <!-- 菜单列表 -->
        <view class="menu-list">
            <view class="menu-item" @click="goToPage('subscribe')">
                <view class="left">
                    <uni-icons type="notification" size="20" color="#00D4AA"></uni-icons>
                    <text class="text">订阅管理</text>
                </view>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>

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
        </view>

        <!-- 通用设置 -->
        <view class="section">
            <text class="section-title">通用设置</text>
            <view class="menu-item">
                <text class="menu-label">字体大小</text>
                <picker mode="selector" :range="fontSizes" :value="fontSizeIndex" @change="onFontSizeChange">
                    <view class="picker-value">
                        {{ currentFontSize }}
                        <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
                    </view>
                </picker>
            </view>
            <view class="menu-item">
                <text class="menu-label">深色模式</text>
                <switch :checked="darkMode" @change="onDarkModeChange" color="#00D4AA" />
            </view>
        </view>

        <!-- 其他 -->
        <view class="section">
            <text class="section-title">其他</text>
            <view class="menu-item" @click="goToAbout">
                <text class="menu-label">关于小程序</text>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
            <view class="menu-item" @click="clearCache">
                <text class="menu-label">清除缓存</text>
                <text class="cache-size">{{ cacheSize }}</text>
            </view>
            <view class="menu-item" @click="contactUs">
                <text class="menu-label">联系我们</text>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
        </view>

        <!-- 退出登录 -->
        <view class="logout-btn" @click="logout">
            <text>退出登录</text>
        </view>

        <view class="version">v1.0.0</view>
    </view>
</template>

<script>
import UserCard from './components/UserCard.vue';
import StatsCard from './components/StatsCard.vue';

const PAGE_MAP = {
    collect: '/pages/collection/collection',
    read: '/pages/history/history',
    subscribe: '/pages/subscribe/subscribe',
    message: '/pages/message/message',
    about: '/pages/about/about'
};

export default {
    name: 'Mine',
    components: { UserCard, StatsCard },
    data: () => ({
        userInfo: {},
        unreadCount: 0,
        fontSizes: ['小', '中', '大'],
        currentFontSize: '中',
        darkMode: false,
        cacheSize: '0MB'
    }),
    computed: {
        fontSizeIndex() {
            return this.fontSizes.indexOf(this.currentFontSize);
        }
    },
    onLoad() {
        this.loadSettings();
        this.calculateCacheSize();
    },
    onShow() {
        this.loadData();
        this.loadUnread();
    },
    methods: {
        async loadData() {
            const openid = this.$store.state.user.userId || uni.getStorageSync('userId');
            if (!openid) return;

            try {
                const res = await uniCloud.callFunction({
                    name: 'getUserInfo',
                    data: { userId: openid }
                });
                if (res.result.code === 0) {
                    this.userInfo = res.result.data;
                }
            } catch (e) {
                console.error('加载用户信息失败:', e);
            }
        },
        async loadUnread() {
            const openid = this.$store.state.user.userId || uni.getStorageSync('userId');
            if (!openid) return;

            try {
                const res = await uniCloud.callFunction({
                    name: 'getMessages',
                    data: { userId: openid, type: 'unread' }
                });
                if (res.result.code === 0) {
                    this.unreadCount = res.result.data.unreadCount || 0;
                }
            } catch (e) {
                console.error('加载未读消息数失败:', e);
            }
        },
        loadSettings() {
            const settings = uni.getStorageSync('settings') || {};
            this.currentFontSize = settings.fontSize || '中';
            this.darkMode = settings.darkMode || false;
        },
        saveSettings() {
            const settings = {
                fontSize: this.currentFontSize,
                darkMode: this.darkMode
            };
            uni.setStorageSync('settings', settings);
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
        onFontSizeChange(e) {
            const index = e.detail.value;
            this.currentFontSize = this.fontSizes[index];
            this.saveSettings();
            uni.showToast({ title: '已设置字体大小', icon: 'success' });
        },
        onDarkModeChange(e) {
            this.darkMode = e.detail.value;
            this.saveSettings();
            uni.showToast({
                title: this.darkMode ? '深色模式已开启' : '深色模式已关闭',
                icon: 'success'
            });
        },
        goToPage(name) {
            const url = PAGE_MAP[name];
            if (url) uni.navigateTo({ url });
        },
        goToRole() {
            uni.navigateTo({
                url: `/pages/role/role?switch=1&currentRole=${this.userInfo.role || ''}`
            });
        },
        goToAbout() {
            uni.navigateTo({ url: '/pages/about/about' });
        },
        clearCache() {
            uni.showModal({
                title: '提示',
                content: '确定清除缓存吗？',
                success: (res) => {
                    if (res.confirm) {
                        try {
                            uni.clearStorageSync();
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
        logout() {
            uni.showModal({
                title: '提示',
                content: '确定退出登录吗？',
                success: (res) => {
                    if (res.confirm) {
                        uni.clearStorageSync();
                        this.$store.commit('user/clear');
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

.section {
    margin-top: 8px;
    padding: 0 20px;
    background-color: #FFFFFF;
}

.section-title {
    display: block;
    font-size: 14px;
    color: #A0AEC0;
    padding: 20px 0 12px;
}

.menu-label {
    font-size: 14px;
    color: #4A5568;
}

.picker-value {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #A0AEC0;
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

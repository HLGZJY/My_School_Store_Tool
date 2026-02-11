<template>
    <view class="container">
        <UserCard
            :avatar="userInfo.avatar"
            :nickname="userInfo.nickname || '未登录'"
            :role="userInfo.role"
            @switchRole="goToRole"
        />

        <StatsCard
            :collectCount="stats.collectCount"
            :readCount="stats.readCount"
            @click="goToPage"
        />

        <MenuList
            :unreadCount="unreadCount"
            @click="goToPage"
        />

        <view class="version">v1.0.0</view>
    </view>
</template>

<script>
import UserCard from './components/UserCard.vue';
import StatsCard from './components/StatsCard.vue';
import MenuList from './components/MenuList.vue';

const PAGE_MAP = {
    collect: '/pages/collection/collection',
    read: '/pages/history/history',
    subscribe: '/pages/subscribe/subscribe',
    message: '/pages/message/message',
    settings: '/pages/settings/settings'
};

export default {
    name: 'Mine',
    components: { UserCard, StatsCard, MenuList },
    data: () => ({
        userInfo: {},
        stats: { collectCount: 0, readCount: 0 },
        unreadCount: 0
    }),
    onLoad() {
        this.loadData()
        uni.$on('collectChange', this.refreshStats)
    },
    onUnload() {
        uni.$off('collectChange', this.refreshStats)
    },
    onShow() {
        this.loadUnread()
        this.loadData()
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
                    this.stats = res.result.data.stats || {};
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
        goToPage(name) {
            const url = PAGE_MAP[name];
            if (url) uni.navigateTo({ url });
        },
        goToRole() {
            uni.navigateTo({ url: '/pages/role/role' });
        },

        refreshStats() {
            this.loadData()
        }
    }
};
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.version {
    padding: 40px 0;
    text-align: center;
    font-size: 12px;
    color: #A0AEC0;
}
</style>

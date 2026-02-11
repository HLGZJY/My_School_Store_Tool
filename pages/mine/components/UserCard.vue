<template>
    <view class="user-card">
        <image class="avatar" :src="avatar" mode="aspectFill"></image>
        <view class="info">
            <text class="nickname">{{ nickname }}</text>
            <view v-if="role" class="role-badge">
                <text>{{ roleName }}</text>
            </view>
        </view>
        <view class="switch-btn" @click="$emit('switchRole')">
            <text>切换身份</text>
        </view>
    </view>
</template>

<script>
export default {
    name: 'UserCard',
    props: {
        avatar: { type: String, default: '/static/logo.png' },
        nickname: { type: String, default: '未登录' },
        role: { type: String, default: '' }
    },
    computed: {
        roleName() {
            const map = { student: '学生', teacher: '教师', admin: '行政人员' };
            return map[this.role] || '';
        }
    }
};
</script>

<style lang="scss" scoped>
.user-card {
    display: flex;
    align-items: center;
    padding: 40px 20px 24px;
    background-color: #FFFFFF;
}

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
        margin-bottom: 8px;
    }
}

.role-badge {
    display: inline-block;
    padding: 4px 12px;
    background-color: #F0FDFA;
    border-radius: 12px;
    font-size: 12px;
    color: #00D4AA;
}

.switch-btn {
    padding: 8px 16px;
    background-color: #F7F9FA;
    border-radius: 16px;
    font-size: 13px;
    color: #4A5568;

    &:active {
        background-color: #E8ECF1;
    }
}
</style>

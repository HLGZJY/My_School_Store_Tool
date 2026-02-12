<template>
    <view class="user-card">
        <image class="avatar" :src="avatar" mode="aspectFill" @click="$emit('click')"></image>
        <view class="info">
            <text class="nickname">{{ nickname || '未登录' }}</text>
            <view v-if="role" class="role-badge">
                <text>{{ roleName }}</text>
            </view>
            <view v-if="roleDetailText" class="role-detail">
                <text>{{ roleDetailText }}</text>
            </view>
        </view>
        <view class="switch-btn" @click="$emit('switchRole')">
            <text>编辑资料</text>
        </view>
    </view>
</template>

<script>
export default {
    name: 'UserCard',
    props: {
        avatar: { type: String, default: '/static/logo.png' },
        nickname: { type: String, default: '' },
        role: { type: String, default: '' },
        roleDetail: { type: Object, default: () => ({}) }
    },
    computed: {
        roleName() {
            const map = { student: '学生', teacher: '教师', admin: '行政人员' };
            return map[this.role] || '';
        },
        roleDetailText() {
            if (!this.role || !this.roleDetail) return '';

            if (this.role === 'student') {
                const { college, grade } = this.roleDetail;
                const parts = [];
                if (college) parts.push(college);
                if (grade) parts.push(grade);
                return parts.join(' · ');
            }

            if (this.role === 'teacher') {
                return this.roleDetail.department || '';
            }

            if (this.role === 'admin') {
                return this.roleDetail.department || '';
            }

            return '';
        }
    }
};
</script>

<style lang="scss" scoped>
.user-card {
    display: flex;
    align-items: flex-start;
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
    margin-bottom: 8px;
}

.role-detail {
    font-size: 13px;
    color: #718096;
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

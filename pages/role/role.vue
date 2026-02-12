<template>
    <view class="container">
        <view class="header">
            <text class="title">{{ isSwitching ? '切换身份' : '请选择您的身份' }}</text>
            <text class="subtitle">{{ isSwitching ? '您当前是 ' + currentRoleName : '我们将根据您的身份推送相关内容' }}</text>
        </view>

        <view class="role-list">
            <view
                v-for="role in roles"
                :key="role.value"
                class="role-card"
                :class="{ active: selectedRole === role.value }"
                @click="selectRole(role.value)"
            >
                <view class="role-icon">{{ role.icon }}</view>
                <view class="role-info">
                    <text class="role-name">{{ role.name }}</text>
                    <text class="role-desc">{{ role.description }}</text>
                </view>
                <view v-if="selectedRole === role.value" class="check-icon">
                    <uni-icons type="checkmarkempty" size="24" color="#00D4AA"></uni-icons>
                </view>
            </view>
        </view>

        <view class="footer">
            <button class="confirm-btn" :disabled="!selectedRole" @click="confirmRole">
                {{ isSwitching ? '确认切换' : '确认选择' }}
            </button>
            <button v-if="isSwitching" class="cancel-btn" @click="goBack">
                取消
            </button>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            currentRole: '',
            selectedRole: '',
            isSwitching: false,
            roles: [
                {
                    value: 'student',
                    name: '在校学生',
                    icon: '🎓',
                    description: '关注课程通知、社团活动、就业信息'
                },
                {
                    value: 'teacher',
                    name: '教师',
                    icon: '👨‍🏫',
                    description: '关注教务通知、科研申报、学术会议'
                },
                {
                    value: 'admin',
                    name: '行政人员',
                    icon: '👔',
                    description: '关注校内公文、会议通知、政策文件'
                }
            ]
        }
    },
    computed: {
        currentRoleName() {
            const map = { student: '在校学生', teacher: '教师', admin: '行政人员' };
            return map[this.currentRole] || '未设置';
        }
    },
    onLoad(options) {
        this.currentRole = options.currentRole || '';
        this.isSwitching = !!options.switch;
    },
    methods: {
        selectRole(value) {
            this.selectedRole = value;
        },
        goBack() {
            uni.navigateBack();
        },
        async confirmRole() {
            if (!this.selectedRole) return;

            // 如果是同一个角色，提示并返回
            if (this.selectedRole === this.currentRole && this.isSwitching) {
                uni.showToast({
                    title: '您已是该身份',
                    icon: 'none'
                });
                uni.navigateBack();
                return;
            }

            uni.showLoading({ title: '设置中...' });

            try {
                const userId = this.$store.state.user.userId;

                // 跳转到角色详情设置页
                uni.redirectTo({
                    url: `/pages/role/role-detail?role=${this.selectedRole}`
                });
            } catch (error) {
                console.error('设置角色失败:', error);
                uni.showToast({
                    title: '设置失败，请重试',
                    icon: 'none'
                });
            } finally {
                uni.hideLoading();
            }
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    padding: 40px 20px;
}

.header {
    text-align: center;
    margin-bottom: 40px;

    .title {
        display: block;
        font-size: 24px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 8px;
    }

    .subtitle {
        display: block;
        font-size: 14px;
        color: #A0AEC0;
    }
}

.role-list {
    margin-bottom: 40px;
}

.role-card {
    display: flex;
    align-items: center;
    background-color: #FFFFFF;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 16px;
    border: 2px solid transparent;
    transition: all 0.2s ease;

    &.active {
        border-color: #00D4AA;
        background-color: #F0FDFA;
    }

    &:active {
        transform: scale(0.98);
    }
}

.role-icon {
    font-size: 48px;
    margin-right: 16px;
}

.role-info {
    flex: 1;

    .role-name {
        display: block;
        font-size: 16px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 4px;
    }

    .role-desc {
        display: block;
        font-size: 12px;
        color: #A0AEC0;
    }
}

.check-icon {
    padding-left: 8px;
}

.footer {
    .confirm-btn {
        width: 100%;
        height: 48px;
        line-height: 48px;
        background-color: #00D4AA;
        color: #0A2540;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;

        &:disabled {
            opacity: 0.5;
        }

        &::after {
            border: none;
        }
    }

    .cancel-btn {
        width: 100%;
        height: 48px;
        line-height: 48px;
        background-color: #FFFFFF;
        color: #4A5568;
        border: 1px solid #E8ECF1;
        border-radius: 8px;
        font-size: 16px;

        &::after {
            border: none;
        }
    }
}
</style>

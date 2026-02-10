<template>
    <view class="container">
        <!-- 用户信息 -->
        <view class="user-section">
            <image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFill"></image>
            <view class="user-info">
                <text class="nickname">{{ userInfo.nickname || '未登录' }}</text>
                <text class="role">{{ getRoleName(userInfo.role) }}</text>
            </view>
            <view class="edit-btn" @click="editRole">
                <text>切换身份</text>
            </view>
        </view>

        <!-- 功能设置 -->
        <view class="section">
            <text class="section-title">通用设置</text>
            <view class="menu-item">
                <text class="menu-label">字体大小</text>
                <picker mode="selector" :range="fontSizes" @change="onFontSizeChange">
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
    </view>
</template>

<script>
export default {
    data() {
        return {
            userInfo: {},
            fontSizes: ['小', '中', '大'],
            currentFontSize: '中',
            darkMode: false,
            cacheSize: '0MB'
        }
    },
    onLoad() {
        this.loadUserInfo()
        this.loadSettings()
        this.calculateCacheSize()
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

        loadSettings() {
            const settings = uni.getStorageSync('settings') || {}
            this.currentFontSize = settings.fontSize || '中'
            this.darkMode = settings.darkMode || false
        },

        calculateCacheSize() {
            try {
                const res = uni.getStorageInfoSync()
                const size = res.currentSize
                const sizeMB = (size / 1024).toFixed(2)
                this.cacheSize = `${sizeMB}MB`
            } catch (error) {
                console.error('计算缓存大小失败:', error)
            }
        },

        onFontSizeChange(e) {
            const index = e.detail.value
            const fontSize = this.fontSizes[index]
            this.currentFontSize = fontSize
            this.saveSettings()
            uni.showToast({
                title: '已设置字体大小',
                icon: 'success'
            })
        },

        onDarkModeChange(e) {
            this.darkMode = e.detail.value
            this.saveSettings()
            uni.showToast({
                title: this.darkMode ? '深色模式已开启' : '深色模式已关闭',
                icon: 'success'
            })
        },

        saveSettings() {
            const settings = {
                fontSize: this.currentFontSize,
                darkMode: this.darkMode
            }
            uni.setStorageSync('settings', settings)
        },

        editRole() {
            uni.navigateTo({
                url: '/pages/role/role-detail?role=' + this.userInfo.role
            })
        },

        goToAbout() {
            uni.navigateTo({
                url: '/pages/about/about'
            })
        },

        clearCache() {
            uni.showModal({
                title: '提示',
                content: '确定清除缓存吗？',
                success: (res) => {
                    if (res.confirm) {
                        try {
                            uni.clearStorageSync()
                            uni.showToast({
                                title: '缓存已清除',
                                icon: 'success'
                            })
                            this.calculateCacheSize()
                        } catch (error) {
                            console.error('清除缓存失败:', error)
                            uni.showToast({
                                title: '清除失败',
                                icon: 'none'
                            })
                        }
                    }
                }
            })
        },

        contactUs() {
            uni.showModal({
                title: '联系我们',
                content: '如遇到问题，请通过以下方式联系我们：\n邮箱：support@example.com',
                showCancel: false
            })
        },

        logout() {
            uni.showModal({
                title: '提示',
                content: '确定退出登录吗？',
                success: (res) => {
                    if (res.confirm) {
                        uni.clearStorageSync()
                        this.$store.commit('user/clear')
                        uni.reLaunch({
                            url: '/pages/login/login'
                        })
                    }
                }
            })
        },

        getRoleName(role) {
            const roleMap = {
                'student': '学生',
                'teacher': '教师',
                'admin': '行政人员'
            }
            return roleMap[role] || '未设置'
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
    padding: 20px;
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
        margin-bottom: 4px;
    }

    .role {
        display: block;
        font-size: 14px;
        color: #A0AEC0;
    }
}

.edit-btn {
    padding: 8px 16px;
    background-color: #F7F9FA;
    border-radius: 6px;
    font-size: 14px;
    color: #4A5568;
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

.menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }
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
</style>

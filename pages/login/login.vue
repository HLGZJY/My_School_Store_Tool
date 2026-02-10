<template>
    <view class="container">
        <view class="login-section">
            <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
            <text class="app-name">我的校园信息收藏工具</text>
            <text class="welcome-text">欢迎登录使用，民大er~</text>

            <button
                class="login-btn"
                open-type="getUserInfo"
                @getuserinfo="onGetUserInfo"
            >
                <uni-icons type="weixin" size="20" color="#FFFFFF"></uni-icons>
                <text>微信一键登录</text>
            </button>
		
			<!-- <button @click="toLogin">前往登录</button -->>

            <view class="tips">
                <text>登录即表示同意</text>
                <text class="link" @click="showUserAgreement">《用户协议》</text>
                <text>和</text>
                <text class="link" @click="showPrivacyPolicy">《隐私政策》</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
    	return '';
    },
    onLoad() {
        // 检查是否已登录
        const userId = this.$store.state.user.userId
        if (userId) {
            uni.switchTab({
                url: '/pages/index/index'
            })
        }
    },
    methods: {
        onGetUserInfo(e) {
            if (e.detail.userInfo) {
                this.userInfo = e.detail.userInfo
                this.login()
            } else {
                uni.showToast({
                    title: '需要授权才能继续使用',
                    icon: 'none'
                })
            }
        },

        async login() {
            uni.showLoading({ title: '登录中...' })

            try {
                // 获取微信登录code
                const loginRes = await uni.login({
                    provider: 'weixin'
                })

                // 调用云函数登录
                const res = await uniCloud.callFunction({
                    name: 'login',
                    data: {
                        code: loginRes.code,
                        userInfo: this.userInfo
                    }
                })

                if (res.result.code === 0) {
                    const { userId, token, hasRole } = res.result.data

                    // 使用store保存用户信息
                    this.$store.commit('user/setUserId', userId)
                    this.$store.commit('user/setToken', token)
                    this.$store.commit('user/setUserInfo', res.result.data.userInfo)

                    uni.setStorageSync('userId', userId)
                    uni.setStorageSync('token', token)

                    uni.hideLoading()

                    // 检查是否需要选择角色
                    if (!hasRole) {
                        uni.redirectTo({
                            url: '/pages/role/role'
                        })
                    } else {
                        uni.showToast({
                            title: '登录成功',
                            icon: 'success'
                        })

                        setTimeout(() => {
                            uni.switchTab({
                                url: '/pages/index/index'
                            })
                        }, 1500)
                    }
                } else {
                    throw new Error(res.result.message)
                }
            } catch (error) {
                console.error('登录失败:', error)
                uni.hideLoading()
                uni.showToast({
                    title: '登录失败，请重试',
                    icon: 'none'
                })
            }
        },
		// toLogin() {
		// 		uni.navigateTo({
		// 			url: "/uni_modules/uni-id-pages/pages/login/login-withpwd"
		// 		}) 
		// }
		
        showUserAgreement() {
            uni.showModal({
                title: '用户协议',
                content: '用户协议内容...',
                showCancel: false
            })
        },

        showPrivacyPolicy() {
            uni.showModal({
                title: '隐私政策',
                content: '隐私政策内容...',
                showCancel: false
            })
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-section {
    width: 100%;
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.logo {
    width: 120px;
    height: 120px;
    border-radius: 24px;
    margin-bottom: 24px;
}

.app-name {
    font-size: 24px;
    font-weight: 600;
    color: #0A2540;
    margin-bottom: 8px;
}

.welcome-text {
    font-size: 16px;
    color: #A0AEC0;
    margin-bottom: 60px;
}

.login-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 48px;
    background-color: #07C160;
    color: #FFFFFF;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 20px;

    &::after {
        border: none;
    }

    text {
        margin-left: 8px;
    }
}

.tips {
    font-size: 12px;
    color: #A0AEC0;

    .link {
        color: #00D4AA;
    }
}
.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 6rpx;
	}

	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-top: 200rpx;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 50rpx;
	}

	.text-area {
		display: flex;
		justify-content: center;
	}

	.title {
		font-size: 18px;
		color: #8f8f94;
	}
</style>

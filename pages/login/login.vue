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
        // 自动获取微信登录并检测用户状态
        this.autoLogin()
    },
    methods: {
        async autoLogin() {
            // 获取微信登录code
            const loginRes = await uni.login({
                provider: 'weixin'
            })

            try {
                uni.showLoading({ title: '检测中...' })

                // 调用云函数，自动查询用户状态
                const res = await uniCloud.callFunction({
                    name: 'login',
                    data: {
                        code: loginRes.code,
                        userInfo: null  // null 表示只查询不创建
                    }
                })

                // 调试：显示openid
                console.log('登录结果:', res.result)

                uni.hideLoading()

                if (res.result.code === 0) {
                    const data = res.result.data

                    // 需要选择入口（同时是用户和管理员）
                    if (data.needSelect) {
                        this.showEntrySelector(data)
                        return
                    }

                    const { userId, openid, token, entryType } = data
                    const hasRole = data.userInfo?.role ? true : false

                    // 保存用户信息
                    this.$store.commit('user/setUserId', userId)
                    this.$store.commit('user/setToken', token)
                    this.$store.commit('user/setUserInfo', data.userInfo || data.adminInfo)
                    this.$store.commit('user/setEntryType', entryType)
                    uni.setStorageSync('openid', openid)
                    uni.setStorageSync('token', token)
                    uni.setStorageSync('entryType', entryType)

                    // 根据入口类型跳转
                    if (entryType === 'admin') {
                        // 管理员进入管理端
                        uni.showToast({
                            title: '管理员登录成功',
                            icon: 'success'
                        })
                        setTimeout(() => {
                            uni.reLaunch({
                                url: '/pages/admin/dashboard'
                            })
                        }, 1000)
                    } else if (!hasRole) {
                        // 新用户或未设置角色，跳转到角色选择
                        uni.redirectTo({
                            url: '/pages/role/role'
                        })
                    } else {
                        // 老用户，直接进入首页
                        uni.showToast({
                            title: '登录成功',
                            icon: 'success'
                        })
                        setTimeout(() => {
                            uni.switchTab({
                                url: '/pages/index/index'
                            })
                        }, 1000)
                    }
                } else {
                    // 用户不存在，需要走完整登录流程（获取用户信息）
                    console.log('需要新用户注册')
                }
            } catch (error) {
                console.error('自动登录失败:', error)
                uni.hideLoading()
            }
        },

        // 显示入口选择器
        showEntrySelector(data) {
            uni.showModal({
                title: '请选择入口',
                content: '您同时拥有用户和管理员身份，请选择要进入的端',
                confirmText: '管理端',
                cancelText: '客户端',
                success: async (res) => {
                    const entryType = res.confirm ? 'admin' : 'user'

                    // 保存选择结果
                    uni.setStorageSync('openid', data.userInfo?.openid || data.adminInfo?.openid)
                    uni.setStorageSync('token', data.token)
                    uni.setStorageSync('entryType', entryType)
                    this.$store.commit('user/setEntryType', entryType)

                    if (entryType === 'admin') {
                        this.$store.commit('user/setUserId', data.adminInfo?.adminId)
                        this.$store.commit('user/setUserInfo', data.adminInfo)
                        uni.showToast({
                            title: '进入管理端',
                            icon: 'success'
                        })
                        setTimeout(() => {
                            uni.reLaunch({
                                url: '/pages/admin/dashboard'
                            })
                        }, 1000)
                    } else {
                        this.$store.commit('user/setUserId', data.userInfo?.userId)
                        this.$store.commit('user/setUserInfo', data.userInfo)
                        const hasRole = data.userInfo?.role ? true : false
                        if (!hasRole) {
                            uni.redirectTo({
                                url: '/pages/role/role'
                            })
                        } else {
                            uni.showToast({
                                title: '进入客户端',
                                icon: 'success'
                            })
                            setTimeout(() => {
                                uni.switchTab({
                                    url: '/pages/index/index'
                                })
                            }, 1000)
                        }
                    }
                }
            })
        },

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
                    const data = res.result.data

                    // 需要选择入口（同时是用户和管理员）
                    if (data.needSelect) {
                        uni.hideLoading()
                        this.showEntrySelector(data)
                        return
                    }

                    const { userId, openid, token, entryType } = data
                    const hasRole = data.userInfo?.role ? true : false

                    // 使用store保存用户信息
                    this.$store.commit('user/setUserId', userId)
                    this.$store.commit('user/setToken', token)
                    this.$store.commit('user/setUserInfo', data.userInfo || data.adminInfo)
                    this.$store.commit('user/setEntryType', entryType)

                    // 存储用户信息
                    uni.setStorageSync('openid', openid)
                    uni.setStorageSync('token', token)
                    uni.setStorageSync('entryType', entryType)

                    uni.hideLoading()

                    // 根据入口类型跳转
                    if (entryType === 'admin') {
                        uni.showToast({
                            title: '管理员登录成功',
                            icon: 'success'
                        })
                        setTimeout(() => {
                            uni.reLaunch({
                                url: '/pages/admin/dashboard'
                            })
                        }, 1500)
                    } else if (!hasRole) {
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

<script>
import { useUserStore } from './store'

export default {
    onLaunch() {
        console.log('App Launch')

        // 初始化云开发
        this.initCloud()

        // 检查登录状态并引导
        this.checkLoginStatus()

        // 检查隐私政策同意状态
        this.checkPrivacyConsent()
    },
    onShow() {
        console.log('App Show')
    },
    onHide() {
        console.log('App Hide')
    },
    methods: {
        initCloud() {
            // 初始化云开发环境
            // 注意：需要在HBuilderX中关联云服务空间
            console.log('Cloud initialized')
        },

        checkLoginStatus() {
            // 使用 Pinia store 检查登录状态
            // 已登录则恢复状态，未登录则允许游客访问
            const userStore = useUserStore()
            const openid = uni.getStorageSync('openid')
            const token = uni.getStorageSync('token')

            if (openid && token) {
                // 已登录，恢复状态
                userStore.userId = openid
                userStore.token = token
                userStore.persist()
            }
            // 未登录时，允许游客访问首页，不强制跳转登录页
        },

        checkPrivacyConsent() {
            // 检查用户是否已同意隐私政策
            const hasConsent = uni.getStorageSync('privacyConsent')
            if (!hasConsent) {
                // 首次使用，弹出隐私政策同意框
                uni.showModal({
                    title: '隐私政策提示',
                    content: '感谢您使用校易通小程序。在使用前，请您仔细阅读并同意《隐私政策》。\n\n我们将根据隐私政策收集您的必要信息以提供核心功能，包括：\n• 微信登录信息\n• 收藏记录\n• 浏览历史\n\n您可以在"我的"页面随时撤回同意。',
                    confirmText: '同意并继续',
                    cancelText: '暂不使用',
                    success: (res) => {
                        if (res.confirm) {
                            // 用户同意隐私政策
                            uni.setStorageSync('privacyConsent', true)
                        } else {
                            // 用户取消，跳转到关于页面阅读完整政策后再决定
                            uni.showModal({
                                title: '提示',
                                content: '您可以先阅读完整的《隐私政策》和《用户协议》，了解我们如何保护您的信息后再决定是否同意。',
                                confirmText: '阅读协议',
                                cancelText: '返回首页',
                                success: (confirmRes) => {
                                    if (confirmRes.confirm) {
                                        uni.navigateTo({
                                            url: '/pages/about/policy?type=privacy-policy&title=' + encodeURIComponent('隐私政策')
                                        })
                                    }
                                }
                            })
                        }
                    }
                })
            }
        }
    }
}
</script>

<style lang="scss">
/* 全局样式 */
@import './styles/common.scss';

page {
    background-color: #F7F9FA;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
</style>

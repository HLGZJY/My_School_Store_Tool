<script>
export default {
    onLaunch() {
        console.log('App Launch')

        // 初始化云开发
        this.initCloud()

        // 检查登录状态并引导
        this.checkLoginStatus()
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
            // 检查登录状态
            const openid = uni.getStorageSync('openid')
            const token = uni.getStorageSync('token')

            if (openid && token) {
                // 已登录，恢复状态
                this.$store.commit('user/setUserId', openid)
                this.$store.commit('user/setToken', token)

                // 获取完整用户信息（检查是否有角色）
                this.getUserInfoAndCheckRole(openid)
            } else {
                // 未登录，跳转到登录页
                uni.reLaunch({
                    url: '/pages/login/login'
                })
            }
        },

        async getUserInfoAndCheckRole(userId) {
            try {
                const res = await uniCloud.callFunction({
                    name: 'login',
                    data: { code: 'restore' } // 使用特殊code触发查询模式
                })

                if (res.result.code === 0) {
                    const { userInfo, hasRole } = res.result.data

                    // 保存用户信息
                    this.$store.commit('user/setUserInfo', userInfo)

                    // 检查角色
                    if (!hasRole) {
                        // 未选择角色，跳转到角色选择页
                        uni.reLaunch({
                            url: '/pages/role/role'
                        })
                    }
                    // 有角色则留在首页
                }
            } catch (error) {
                console.error('获取用户信息失败:', error)
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

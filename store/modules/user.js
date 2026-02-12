export default {
    namespaced: true,
    state: {
        userId: null,  // 现在等于 openid
        token: null,
        userInfo: null
    },
    mutations: {
        setUserId(state, userId) {
            state.userId = userId
        },
        setToken(state, token) {
            state.token = token
        },
        setUserInfo(state, userInfo) {
            state.userInfo = userInfo
        },
        setRole(state, role) {
            if (state.userInfo) {
                state.userInfo.role = role
            }
        },
        clear(state) {
            state.userId = null
            state.token = null
            state.userInfo = null
        }
    },
    actions: {
        async login({ commit }, { code, userInfo }) {
            const res = await uniCloud.callFunction({
                name: 'login',
                data: { code, userInfo }
            })

            if (res.result.code === 0) {
                const { userId, openid, token } = res.result.data
                commit('setUserId', userId)
                commit('setToken', token)
                // 存储 openid（现在 userId 就是 openid）
                uni.setStorageSync('openid', openid)
                uni.setStorageSync('token', token)
            }

            return res.result
        },
        async logout({ commit }) {
            commit('clear')
            uni.clearStorageSync()
        }
    }
}

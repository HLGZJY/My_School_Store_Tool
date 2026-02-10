export default {
    namespaced: true,
    state: {
        userId: null,
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
                const { userId, token } = res.result.data
                commit('setUserId', userId)
                commit('setToken', token)
                uni.setStorageSync('userId', userId)
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

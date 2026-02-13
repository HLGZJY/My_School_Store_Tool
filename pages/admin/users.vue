<template>
    <view class="container">
        <!-- 搜索栏 -->
        <view class="search-bar">
            <input
                class="search-input"
                v-model="keyword"
                placeholder="搜索用户昵称或OpenID"
                @confirm="searchUsers"
            />
            <button class="search-btn" @click="searchUsers">搜索</button>
        </view>

        <!-- 用户列表 -->
        <view class="user-list">
            <view
                class="user-item"
                v-for="item in userList"
                :key="item._id"
            >
                <image class="user-avatar" :src="item.avatar || '/static/icons/default-avatar.png'" />
                <view class="user-info">
                    <view class="user-name">{{ item.nickname || '未设置昵称' }}</view>
                    <view class="user-meta">
                        <text class="role">{{ getRoleText(item.role) }}</text>
                        <text class="time">注册: {{ formatDate(item.createTime) }}</text>
                    </view>
                    <view class="user-stats">
                        <text>阅读: {{ item.stats?.readCount || 0 }}</text>
                        <text>收藏: {{ item.stats?.collectCount || 0 }}</text>
                    </view>
                </view>
                <view class="user-actions">
                    <view class="action-btn" @click="setAsAdmin(item)">设为管理员</view>
                    <view class="action-btn" @click="viewDetail(item)">详情</view>
                </view>
            </view>

            <view v-if="userList.length === 0 && !loading" class="empty">
                <text>暂无用户</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            userList: [],
            keyword: '',
            loading: false,
            page: 1,
            pageSize: 20
        }
    },
    onLoad() {
        this.loadUsers()
    },
    onPullDownRefresh() {
        this.page = 1
        this.loadUsers().then(() => {
            uni.stopPullDownRefresh()
        })
    },
    methods: {
        async loadUsers() {
            this.loading = true

            try {
                const res = await uniCloud.callFunction({
                    name: 'manageUsers',
                    data: {
                        action: 'list',
                        keyword: this.keyword,
                        page: this.page,
                        pageSize: this.pageSize
                    }
                })

                if (res.result.code === 0) {
                    this.userList = res.result.data.list
                }
            } catch (e) {
                console.error('加载失败:', e)
            } finally {
                this.loading = false
            }
        },

        searchUsers() {
            this.page = 1
            this.loadUsers()
        },

        setAsAdmin(user) {
            uni.showModal({
                title: '确认设置',
                content: `确定要将 "${user.nickname || '该用户'}" 设为管理员吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const res = await uniCloud.callFunction({
                                name: 'addAdmin',
                                data: {
                                    secret: 'test_admin_key_2024',
                                    openid: user.openid,
                                    nickname: user.nickname
                                }
                            })

                            if (res.result.code === 0) {
                                uni.showToast({ title: '设置成功', icon: 'success' })
                            } else {
                                uni.showToast({ title: res.result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '设置失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        viewDetail(user) {
            uni.showModal({
                title: '用户详情',
                content: `
OpenID: ${user.openid}
昵称: ${user.nickname || '未设置'}
角色: ${this.getRoleText(user.role)}
学院: ${user.roleDetail?.college || '-'}
年级: ${user.roleDetail?.grade || '-'}
注册时间: ${this.formatDate(user.createTime)}
最后登录: ${this.formatDate(user.lastLoginTime)}
                `,
                showCancel: false
            })
        },

        getRoleText(role) {
            const map = {
                student: '学生',
                teacher: '教师',
                admin: '管理员'
            }
            return map[role] || '未设置'
        },

        formatDate(timestamp) {
            if (!timestamp) return '-'
            const date = new Date(timestamp)
            return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.search-bar {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    background-color: #FFFFFF;

    .search-input {
        flex: 1;
        height: 40px;
        background-color: #F7F9FA;
        border-radius: 20px;
        padding: 0 16px;
        font-size: 14px;
    }

    .search-btn {
        width: 70px;
        height: 40px;
        line-height: 40px;
        background-color: #07C160;
        color: #FFFFFF;
        border-radius: 20px;
        font-size: 14px;
        padding: 0;
    }
}

.user-list {
    padding: 12px 16px;

    .user-item {
        display: flex;
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;

        .user-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-right: 12px;
        }

        .user-info {
            flex: 1;

            .user-name {
                font-size: 16px;
                font-weight: 600;
                color: #0A2540;
                margin-bottom: 4px;
            }

            .user-meta {
                display: flex;
                gap: 12px;
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;

                .role {
                    color: #07C160;
                }
            }

            .user-stats {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: #999;
            }
        }

        .user-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;

            .action-btn {
                font-size: 12px;
                color: #07C160;
            }
        }
    }

    .empty {
        text-align: center;
        padding: 40px;
        color: #999;
    }
}
</style>

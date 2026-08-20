<template>
    <view class="container">
        <!-- 搜索栏 -->
        <view class="search-bar">
            <input
                class="search-input"
                v-model="keyword"
                placeholder="搜索文章标题..."
                @confirm="searchArticles"
            />
            <button class="search-btn" @click="searchArticles" size="mini">搜索</button>
        </view>

        <!-- 筛选栏 -->
        <view class="filter-bar">
            <view
                :class="['filter-item', { active: filterStatus === 'pending' }]"
                @click="changeFilter('pending')"
            >
                待审核
            </view>
            <view
                :class="['filter-item', { active: filterStatus === 'published' }]"
                @click="changeFilter('published')"
            >
                已发布
            </view>
            <view
                :class="['filter-item', { active: filterStatus === 'rejected' }]"
                @click="changeFilter('rejected')"
            >
                已拒绝
            </view>
            <view
                :class="['filter-item', { active: filterStatus === 'all' }]"
                @click="changeFilter('all')"
            >
                全部
            </view>
            <view class="select-mode" @click="toggleSelectMode">
                {{ selectMode ? '取消' : '多选' }}
            </view>
        </view>

        <!-- 批量操作栏 -->
        <view class="batch-bar" v-if="selectMode">
            <checkbox :checked="isAllSelected" @click="toggleSelectAll" />
            <text>全选</text>
            <text class="selected-count">已选 {{ selectedArticles.length }} 篇</text>
            <view class="batch-btns">
                <button class="batch-btn approve" @click="batchApprove" :disabled="selectedArticles.length === 0">批量通过</button>
                <button class="batch-btn delete" @click="batchDelete" :disabled="selectedArticles.length === 0">批量删除</button>
            </view>
        </view>

        <!-- 文章列表 -->
        <view class="article-list">
            <view
                class="article-item"
                :class="{ selected: selectedArticles.includes(item._id) }"
                v-for="item in articleList"
                :key="item._id"
            >
                <!-- 多选框 -->
                <view class="checkbox-col" v-if="selectMode" @click.stop="toggleSelect(item._id)">
                    <checkbox :checked="selectedArticles.includes(item._id)" />
                </view>

                <view class="article-content" @click="selectMode ? toggleSelect(item._id) : showDetail(item)">
                <view class="article-header">
                    <text class="article-title">{{ item.title }}</text>
                    <text :class="['article-status', item.status]">
                        {{ getStatusText(item.status) }}
                    </text>
                </view>
                <view class="article-meta">
                    <text class="source">{{ item.sourceName }}</text>
                    <text class="time">{{ formatTime(item.createTime) }}</text>
                </view>
                <view class="article-summary" v-if="item.summary">
                    {{ item.summary }}
                </view>

                <!-- 操作按钮 -->
                <view class="action-btns">
                    <view v-if="item.status === 'pending'" class="btn-group">
                        <button class="btn approve" @click.stop="handleApprove(item)">通过</button>
                        <button class="btn reject" @click.stop="handleReject(item)">拒绝</button>
                    </view>
                    <view class="btn-group manage">
                        <button class="btn edit" @click.stop="handleEdit(item)">修改</button>
                        <button class="btn delete" @click.stop="handleDelete(item)">删除</button>
                    </view>
                </view>
                </view> <!-- article-content -->
            </view>

            <!-- 空状态 -->
            <view v-if="articleList.length === 0 && !loading" class="empty">
                <text>暂无待审核文章</text>
            </view>

            <!-- 加载中 -->
            <view v-if="loading" class="loading">
                <text>加载中...</text>
            </view>
        </view>
    </view>

    <!-- 编辑弹窗 -->
    <view class="edit-modal" v-if="showEditModal">
        <view class="modal-mask" @click="showEditModal = false"></view>
        <view class="modal-content">
            <view class="modal-header">
                <text>编辑文章</text>
                <text class="close-btn" @click="showEditModal = false">×</text>
            </view>
            <view class="modal-body">
                <view class="form-item">
                    <text class="label">标题</text>
                    <textarea class="title-input" v-model="editForm.title" placeholder="请输入标题" :maxlength="200" auto-height />
                </view>
                <view class="form-item">
                    <text class="label">分类</text>
                    <picker :range="categoryOptions" @change="onCategoryChange">
                        <view class="picker-value">{{ editForm.category || '请选择分类' }}</view>
                    </picker>
                </view>
                <view class="form-item">
                    <text class="label">摘要</text>
                    <textarea class="textarea" v-model="editForm.summary" placeholder="请输入摘要" />
                </view>
            </view>
            <view class="modal-footer">
                <button class="btn cancel" @click="showEditModal = false">取消</button>
                <button class="btn confirm" @click="saveEdit">保存</button>
            </view>
        </view>
    </view>
</template>

<script>
import { articleApi, adminApi } from '@/api/index'

export default {
    data() {
        return {
            filterStatus: 'pending',
            keyword: '',
            articleList: [],
            loading: false,
            page: 1,
            pageSize: 20,
            // 编辑弹窗
            showEditModal: false,
            editForm: {
                _id: '',
                title: '',
                summary: '',
                content: '',
                category: ''
            },
            categoryOptions: ['通知公告', '学术动态', '活动赛事', '生活服务', '其他'],
            // 多选功能
            selectMode: false,
            selectedArticles: []
        }
    },
    computed: {
        isAllSelected() {
            return this.articleList.length > 0 && this.selectedArticles.length === this.articleList.length
        }
    },
    onLoad() {
        this.loadArticles()
    },
    onPullDownRefresh() {
        this.page = 1
        this.loadArticles().then(() => {
            uni.stopPullDownRefresh()
        })
    },
    methods: {
        changeFilter(status) {
            this.filterStatus = status
            this.keyword = ''
            this.page = 1
            this.selectMode = false
            this.selectedArticles = []
            this.loadArticles()
        },

        // 切换多选模式
        toggleSelectMode() {
            this.selectMode = !this.selectMode
            if (!this.selectMode) {
                this.selectedArticles = []
            }
        },

        // 切换单选
        toggleSelect(id) {
            const idx = this.selectedArticles.indexOf(id)
            if (idx > -1) {
                this.selectedArticles.splice(idx, 1)
            } else {
                this.selectedArticles.push(id)
            }
        },

        // 全选/取消全选
        toggleSelectAll() {
            if (this.isAllSelected) {
                this.selectedArticles = []
            } else {
                this.selectedArticles = this.articleList.map(item => item._id)
            }
        },

        async loadArticles() {
            this.loading = true

            try {
                let where = {}
                if (this.filterStatus !== 'all') {
                    where.status = this.filterStatus
                }
                // 关键字搜索
                if (this.keyword) {
                    where.title = { $regex: this.keyword }
                }

                const result = await adminApi.getArticles({
                    where,
                    page: this.page,
                    pageSize: this.pageSize
                })

                this.articleList = result.list
            } catch (e) {
                console.error('加载失败:', e)
            } finally {
                this.loading = false
            }
        },

        // 搜索文章
        searchArticles() {
            this.page = 1
            this.loadArticles()
        },

        showDetail(item) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${item._id}`
            })
        },

        async handleApprove(item) {
            uni.showModal({
                title: '确认通过',
                content: '确定要通过这篇审核吗？',
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const result = await adminApi.approveArticle(item._id, 'approve', { openid: uni.getStorageSync('openid') })

                            if (result && result.code === 0) {
                                uni.showToast({ title: '已通过', icon: 'success' })
                                this.loadArticles()
                            } else {
                                uni.showToast({ title: result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '操作失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        async handleReject(item) {
            uni.showModal({
                title: '拒绝原因',
                content: '请输入拒绝原因',
                editable: true,
                success: async (modalRes) => {
                    if (modalRes.confirm) {
                        try {
                            const result = await adminApi.approveArticle(item._id, 'reject', { note: modalRes.content, openid: uni.getStorageSync('openid') })

                            if (result && result.code === 0) {
                                uni.showToast({ title: '已拒绝', icon: 'success' })
                                this.loadArticles()
                            } else {
                                uni.showToast({ title: result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '操作失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        getStatusText(status) {
            const map = {
                pending: '待审核',
                published: '已发布',
                rejected: '已拒绝',
                draft: '草稿'
            }
            return map[status] || status
        },

        formatTime(timestamp) {
            if (!timestamp) return ''
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        },

        // 删除文章
        async handleDelete(item) {
            uni.showModal({
                title: '确认删除',
                content: `确定要删除文章"${item.title}"吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const result = await adminApi.manageArticle(item._id, 'delete', { openid: uni.getStorageSync('openid') })

                            if (result && result.code === 0) {
                                uni.showToast({ title: '删除成功', icon: 'success' })
                                this.loadArticles()
                            } else {
                                uni.showToast({ title: result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '删除失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        // 批量通过审核
        async batchApprove() {
            if (this.selectedArticles.length === 0) return

            uni.showModal({
                title: '批量审核',
                content: `确定要通过选中的 ${this.selectedArticles.length} 篇文章吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const result = await adminApi.approveArticle(null, 'batchApprove', { articleIds: this.selectedArticles, openid: uni.getStorageSync('openid') })

                            if (result && result.code === 0) {
                                uni.showToast({ title: '批量通过成功', icon: 'success' })
                                this.selectedArticles = []
                                this.selectMode = false
                                this.loadArticles()
                            } else {
                                uni.showToast({ title: result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '操作失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        // 批量删除
        async batchDelete() {
            if (this.selectedArticles.length === 0) return

            uni.showModal({
                title: '批量删除',
                content: `确定要删除选中的 ${this.selectedArticles.length} 篇文章吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const result = await adminApi.manageArticle(null, 'batchDelete', { articleIds: this.selectedArticles, openid: uni.getStorageSync('openid') })

                            if (result && result.code === 0) {
                                uni.showToast({ title: '批量删除成功', icon: 'success' })
                                this.selectedArticles = []
                                this.selectMode = false
                                this.loadArticles()
                            } else {
                                uni.showToast({ title: result.message, icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '删除失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        // 编辑文章
        handleEdit(item) {
            this.editForm = {
                _id: item._id,
                title: item.title,
                summary: item.summary || '',
                content: item.content || '',
                category: item.category || ''
            }
            this.showEditModal = true
        },

        // 分类变更
        onCategoryChange(e) {
            this.editForm.category = this.categoryOptions[e.detail.value]
        },

        // 保存编辑
        async saveEdit() {
            if (!this.editForm.title) {
                uni.showToast({ title: '标题不能为空', icon: 'none' })
                return
            }

            try {
                const result = await adminApi.manageArticle(this.editForm._id, 'update', {
                    title: this.editForm.title,
                    summary: this.editForm.summary,
                    category: this.editForm.category,
                    openid: uni.getStorageSync('openid')
                })

                if (result && result.code === 0) {
                    uni.showToast({ title: '保存成功', icon: 'success' })
                    this.showEditModal = false
                    this.loadArticles()
                } else {
                    uni.showToast({ title: result.message, icon: 'none' })
                }
            } catch (e) {
                uni.showToast({ title: '保存失败', icon: 'none' })
            }
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
    gap: 8px;
    padding: 12px 16px;
    background-color: #FFFFFF;

    .search-input {
        flex: 1;
        height: 36px;
        padding: 0 12px;
        background-color: #F7F9FA;
        border-radius: 18px;
        font-size: 14px;
    }

    .search-btn {
        background-color: #07C160;
        color: #FFFFFF;
    }
}

.filter-bar {
    display: flex;
    background-color: #FFFFFF;
    padding: 12px 16px;
    gap: 12px;

    .filter-item {
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        color: #666;

        &.active {
            background-color: #07C160;
            color: #FFFFFF;
        }
    }

    .select-mode {
        margin-left: auto;
        padding: 6px 12px;
        font-size: 13px;
        color: #07C160;
    }
}

// 批量操作栏
.batch-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background-color: #E8F5E9;
    font-size: 14px;

    .selected-count {
        flex: 1;
        color: #666;
    }

    .batch-btns {
        display: flex;
        gap: 8px;
    }

    .batch-btn {
        height: 30px;
        line-height: 30px;
        font-size: 12px;
        padding: 0 12px;
        border-radius: 15px;

        &.approve {
            background-color: #07C160;
            color: #FFFFFF;
        }

        &.delete {
            background-color: #FF3B30;
            color: #FFFFFF;
        }

        &[disabled] {
            background-color: #ccc;
        }
    }
}

.article-list {
    padding: 12px 16px;

    .article-item {
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;

        &.selected {
            background-color: #E8F5E9;
            border: 1px solid #07C160;
        }

        .checkbox-col {
            margin-right: 12px;
            padding-top: 2px;
        }

        .article-content {
            flex: 1;
        }

        .article-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;

            .article-title {
                flex: 1;
                font-size: 16px;
                font-weight: 600;
                color: #0A2540;
                margin-right: 12px;
            }

            .article-status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 4px;

                &.pending {
                    background-color: #FFF3E0;
                    color: #FF9500;
                }

                &.published {
                    background-color: #E8F5E9;
                    color: #07C160;
                }

                &.rejected {
                    background-color: #FFEBEE;
                    color: #FF3B30;
                }
            }
        }

        .article-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #999;
            margin-bottom: 8px;
        }

        .article-summary {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .action-btns {
            display: flex;
            gap: 12px;
            margin-top: 12px;

            .btn-group {
                display: flex;
                gap: 8px;

                &.manage {
                    margin-left: auto;
                }
            }

            .btn {
                height: 32px;
                line-height: 32px;
                font-size: 12px;
                border-radius: 16px;
                padding: 0 12px;

                &.approve {
                    background-color: #07C160;
                    color: #FFFFFF;
                }

                &.reject {
                    background-color: #FFFFFF;
                    color: #FF3B30;
                    border: 1px solid #FF3B30;
                }

                &.edit {
                    background-color: #FFFFFF;
                    color: #007AFF;
                    border: 1px solid #007AFF;
                }

                &.delete {
                    background-color: #FFFFFF;
                    color: #FF3B30;
                    border: 1px solid #FF3B30;
                }
            }
        }
    }

    .empty, .loading {
        text-align: center;
        padding: 40px;
        color: #999;
    }
}

// 编辑弹窗
.edit-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;

    .modal-mask {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .modal-content {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #FFFFFF;
        border-radius: 16px 16px 0 0;
        max-height: 80vh;
        overflow-y: auto;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        font-size: 18px;
        font-weight: 600;
        border-bottom: 1px solid #eee;

        .close-btn {
            font-size: 24px;
            color: #999;
            padding: 0 8px;
        }
    }

    .modal-body {
        padding: 16px;
    }

    .form-item {
        margin-bottom: 16px;

        .label {
            display: block;
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }

        .input, .textarea, .title-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
        }

        .title-input {
            min-height: 60px;
            max-height: 120px;
        }

        .textarea {
            height: 100px;
        }

        .picker-value {
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
        }
    }

    .modal-footer {
        display: flex;
        gap: 12px;
        padding: 16px;
        border-top: 1px solid #eee;

        .btn {
            flex: 1;
            height: 44px;
            line-height: 44px;
            border-radius: 22px;
            font-size: 16px;

            &.cancel {
                background-color: #F7F9FA;
                color: #666;
            }

            &.confirm {
                background-color: #07C160;
                color: #FFFFFF;
            }
        }
    }
}
</style>

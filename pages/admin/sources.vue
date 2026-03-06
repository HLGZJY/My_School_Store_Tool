<template>
    <view class="container">
        <!-- 添加按钮 -->
        <view class="add-btn" @click="showAddModal">
            <uni-icons type="plus" size="20" color="#FFFFFF"></uni-icons>
            <text>添加数据源</text>
        </view>

        <!-- 数据源列表 -->
        <view class="source-list">
            <view
                class="source-item"
                v-for="item in sourceList"
                :key="item._id"
            >
                <view class="source-header">
                    <view class="source-info">
                        <text class="source-name">{{ item.sourceName }}</text>
                        <text :class="['source-type', item.sourceType]">{{ getTypeText(item.sourceType) }}</text>
                        <text v-if="item.category" class="source-category">[{{ item.category }}]</text>
                    </view>
                    <switch
                        :checked="item.enabled"
                        @change="toggleEnabled(item)"
                        color="#07C160"
                    />
                </view>
                <view class="source-url">{{ item.config?.url || '未配置URL' }}</view>
                <view class="source-stats">
                    <text>文章数: {{ item.stats?.totalArticles || 0 }}</text>
                    <text>最后采集: {{ formatTime(item.schedule?.lastRunTime) }}</text>
                    <text v-if="item.stats?.hasUpdates" class="update-badge">有更新</text>
                </view>
                <view class="source-actions">
                    <view class="action-btn" @click="editSource(item)">编辑</view>
                    <view class="action-btn" @click="testSource(item)">测试</view>
                    <view class="action-btn delete" @click="deleteSource(item)">删除</view>
                </view>
            </view>

            <view v-if="sourceList.length === 0 && !loading" class="empty">
                <text>暂无数据源</text>
            </view>
        </view>

        <!-- 添加/编辑弹窗 -->
        <uni-popup ref="popup" type="bottom">
            <view class="popup-content">
                <view class="popup-header">
                    <text class="popup-title">{{ isEdit ? '编辑数据源' : '添加数据源' }}</text>
                    <text class="popup-close" @click="closePopup">×</text>
                </view>

                <view class="form-group">
                    <text class="label">名称</text>
                    <input class="input" v-model="formData.name" placeholder="如：教务处通知" />
                </view>

                <view class="form-group">
                    <text class="label">类型</text>
                    <picker :range="sourceTypes" @change="onTypeChange">
                        <view class="picker">
                            {{ sourceTypes[formData.typeIndex] }}
                        </view>
                    </picker>
                </view>

                <view class="form-group">
                    <text class="label">URL</text>
                    <view class="url-input-group">
                        <input class="input" v-model="formData.url" placeholder="数据源地址，如 https://www.scuec.edu.cn/wyxy/..." @blur="onUrlBlur" />
                        <button class="analyze-btn" @click="analyzeUrl" :disabled="analyzing">
                            {{ analyzing ? '分析中...' : '智能分析' }}
                        </button>
                    </view>
                </view>

                <!-- 智能分析建议 -->
                <view v-if="suggestion" class="suggestion-box">
                    <view class="suggestion-header">智能建议（可修改）</view>
                    <view class="form-group">
                        <text class="label">来源ID</text>
                        <input class="input" v-model="formData.sourceId" placeholder="自动提取" />
                    </view>
                    <view class="form-group">
                        <text class="label">来源名称</text>
                        <input class="input" v-model="formData.sourceName" placeholder="自动获取" />
                    </view>
                    <view class="form-group">
                        <text class="label">分类</text>
                        <input class="input" v-model="formData.category" placeholder="自动提取" />
                    </view>
                </view>

                <view class="form-group">
                    <text class="label">采集间隔(分钟)</text>
                    <input class="input" type="number" v-model="formData.interval" placeholder="60" />
                </view>

                <view class="form-group">
                    <text class="label">默认标签</text>
                    <input class="input" v-model="formData.defaultTags" placeholder="用逗号分隔，如：教务处,重要" />
                </view>

                <button class="submit-btn" @click="submitSource">保存</button>
            </view>
        </uni-popup>
    </view>
</template>

<script>
export default {
    data() {
        return {
            sourceList: [],
            loading: false,
            isEdit: false,
            editId: null,
            analyzing: false,
            suggestion: null,
            sourceTypes: ['官方部门', '学院', 'RSS订阅', 'API接口', '网站抓取', '手动录入'],
            formData: {
                sourceId: '',
                sourceName: '',
                category: '',
                typeIndex: 4,
                type: 'website',
                url: '',
                interval: 60,
                defaultTags: ''
            }
        }
    },
    onLoad() {
        this.loadSources()
    },
    methods: {
        async loadSources() {
            this.loading = true
            try {
                const res = await uniCloud.callFunction({
                    name: 'manageSources',
                    data: { action: 'list' }
                })

                if (res.result.code === 0) {
                    this.sourceList = res.result.data
                }
            } catch (e) {
                console.error('加载失败:', e)
            } finally {
                this.loading = false
            }
        },

        onTypeChange(e) {
            const types = ['official', 'college', 'rss', 'api', 'website', 'manual']
            this.formData.typeIndex = e.detail.value
            this.formData.type = types[e.detail.value]
        },

        // URL失去焦点时自动分析
        async onUrlBlur() {
            if (this.formData.url && !this.suggestion) {
                await this.analyzeUrl()
            }
        },

        // 智能分析URL
        async analyzeUrl() {
            if (!this.formData.url) {
                uni.showToast({ title: '请先输入URL', icon: 'none' })
                return
            }

            // 检查URL格式
            if (!this.formData.url.startsWith('http://') && !this.formData.url.startsWith('https://')) {
                uni.showToast({ title: '请输入以http://或https://开头的URL', icon: 'none' })
                return
            }

            this.analyzing = true
            try {
                const res = await uniCloud.callFunction({
                    name: 'manageSources',
                    data: { action: 'analyze', url: this.formData.url }
                })

                if (res.result.code === 0) {
                    this.suggestion = res.result.data
                    // 自动填充表单
                    this.formData.sourceId = res.result.data.sourceId || ''
                    this.formData.sourceName = res.result.data.sourceName || ''
                    this.formData.category = res.result.data.category || ''
                    this.formData.type = res.result.data.sourceType || 'website'

                    const typeMap = { official: 0, college: 1, rss: 2, api: 3, website: 4, manual: 5 }
                    this.formData.typeIndex = typeMap[this.formData.type] || 4

                    uni.showToast({ title: '分析成功', icon: 'success' })
                } else {
                    uni.showToast({ title: res.result.message || '分析失败', icon: 'none' })
                }
            } catch (e) {
                console.error('分析失败:', e)
                uni.showToast({ title: '分析失败', icon: 'none' })
            } finally {
                this.analyzing = false
            }
        },

        showAddModal() {
            this.isEdit = false
            this.editId = null
            this.suggestion = null
            this.formData = {
                sourceId: '',
                sourceName: '',
                category: '',
                typeIndex: 4,
                type: 'website',
                url: '',
                interval: 60,
                defaultTags: ''
            }
            this.$refs.popup.open()
        },

        editSource(item) {
            this.isEdit = true
            this.editId = item._id
            this.suggestion = null

            const typeMap = { official: 0, college: 1, rss: 2, api: 3, website: 4, manual: 5 }
            this.formData = {
                sourceId: item.sourceId || '',
                sourceName: item.sourceName || '',
                category: item.category || '',
                typeIndex: typeMap[item.sourceType] || 4,
                type: item.sourceType || 'website',
                url: item.config?.url || '',
                interval: (item.schedule?.interval || 3600000) / 60000,
                defaultTags: item.defaultTags?.source?.join(',') || ''
            }
            this.$refs.popup.open()
        },

        closePopup() {
            this.$refs.popup.close()
        },

        async toggleEnabled(item) {
            try {
                const res = await uniCloud.callFunction({
                    name: 'manageSources',
                    data: {
                        action: 'toggle',
                        id: item._id,
                        enabled: !item.enabled
                    }
                })

                if (res.result.code === 0) {
                    uni.showToast({ title: '更新成功', icon: 'success' })
                    this.loadSources()
                }
            } catch (e) {
                uni.showToast({ title: '更新失败', icon: 'none' })
                this.loadSources()
            }
        },

        async submitSource() {
            if (!this.formData.sourceName || !this.formData.url) {
                uni.showToast({ title: '请填写来源名称和URL', icon: 'none' })
                return
            }

            const data = {
                action: this.isEdit ? 'update' : 'create',
                sourceId: this.formData.sourceId,
                sourceName: this.formData.sourceName,
                sourceType: this.formData.type,
                category: this.formData.category || this.formData.sourceId,
                config: {
                    url: this.formData.url
                },
                schedule: {
                    interval: this.formData.interval * 60000
                },
                defaultTags: {
                    source: this.formData.defaultTags ? this.formData.defaultTags.split(',').filter(t => t) : [],
                    role: ['通用'],
                    custom: []
                }
            }

            if (this.isEdit) {
                data.id = this.editId
            }

            try {
                const res = await uniCloud.callFunction({
                    name: 'manageSources',
                    data
                })

                if (res.result.code === 0) {
                    uni.showToast({ title: '保存成功', icon: 'success' })
                    this.closePopup()
                    this.loadSources()
                } else {
                    uni.showToast({ title: res.result.message, icon: 'none' })
                }
            } catch (e) {
                uni.showToast({ title: '保存失败', icon: 'none' })
            }
        },

        async testSource(item) {
            uni.showLoading({ title: '测试中...' })
            try {
                const res = await uniCloud.callFunction({
                    name: 'syncSource',
                    data: { sourceId: item._id }
                })

                uni.hideLoading()

                if (res.result.code === 0) {
                    uni.showToast({
                        title: `获取${res.result.data.newArticles}条`,
                        icon: 'success'
                    })
                    this.loadSources()
                } else {
                    uni.showToast({ title: res.result.message, icon: 'none' })
                }
            } catch (e) {
                uni.hideLoading()
                uni.showToast({ title: '测试失败', icon: 'none' })
            }
        },

        deleteSource(item) {
            uni.showModal({
                title: '确认删除',
                content: `确定要删除"${item.sourceName}"吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            const res = await uniCloud.callFunction({
                                name: 'manageSources',
                                data: {
                                    action: 'delete',
                                    id: item._id
                                }
                            })

                            if (res.result.code === 0) {
                                uni.showToast({ title: '已删除', icon: 'success' })
                                this.loadSources()
                            }
                        } catch (e) {
                            uni.showToast({ title: '删除失败', icon: 'none' })
                        }
                    }
                }
            })
        },

        getTypeText(type) {
            const map = {
                official: '官方',
                college: '学院',
                rss: 'RSS',
                api: 'API',
                website: '网站',
                manual: '手动'
            }
            return map[type] || type
        },

        formatTime(timestamp) {
            if (!timestamp) return '从未'
            const date = new Date(timestamp)
            return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    padding: 16px;
}

.add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
    background-color: #07C160;
    color: #FFFFFF;
    border-radius: 12px;
    margin-bottom: 16px;
    font-size: 16px;
}

.source-list {
    .source-item {
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;

        .source-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;

            .source-info {
                display: flex;
                align-items: center;
                gap: 8px;

                .source-name {
                    font-size: 16px;
                    font-weight: 600;
                    color: #0A2540;
                }

                .source-type {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background-color: #E3F2FD;
                    color: #007AFF;

                    &.official { background-color: #E3F2FD; color: #007AFF; }
                    &.college { background-color: #F3E5F5; color: #5856D6; }
                    &.rss { background-color: #FFF3E0; color: #FF9500; }
                    &.api { background-color: #E3F2FD; color: #007AFF; }
                    &.website { background-color: #F3E5F5; color: #5856D6; }
                    &.manual { background-color: #E8F5E9; color: #07C160; }
                }

                .source-category {
                    font-size: 12px;
                    color: #999;
                }
            }
        }

        .source-url {
            font-size: 12px;
            color: #999;
            margin-bottom: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .source-stats {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: #666;
            margin-bottom: 12px;
            align-items: center;

            .update-badge {
                background-color: #FF3B30;
                color: #fff;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
            }
        }

        .source-actions {
            display: flex;
            gap: 12px;
            padding-top: 12px;
            border-top: 1px solid #F0F0F0;

            .action-btn {
                font-size: 14px;
                color: #07C160;

                &.delete {
                    color: #FF3B30;
                }
            }
        }
    }

    .empty {
        text-align: center;
        padding: 40px;
        color: #999;
    }
}

.popup-content {
    background-color: #FFFFFF;
    border-radius: 16px 16px 0 0;
    padding: 20px;

    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        .popup-title {
            font-size: 18px;
            font-weight: 600;
        }

        .popup-close {
            font-size: 24px;
            color: #999;
        }
    }

    .form-group {
        margin-bottom: 16px;

        .label {
            display: block;
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }

        .input {
            width: 100%;
            height: 44px;
            background-color: #F7F9FA;
            border-radius: 8px;
            padding: 0 12px;
            font-size: 14px;
        }

        .picker {
            height: 44px;
            background-color: #F7F9FA;
            border-radius: 8px;
            padding: 0 12px;
            line-height: 44px;
            font-size: 14px;
        }

        .url-input-group {
            display: flex;
            gap: 8px;

            .input {
                flex: 1;
            }

            .analyze-btn {
                width: 90px;
                height: 44px;
                background-color: #07C160;
                color: #fff;
                border-radius: 8px;
                font-size: 12px;
                padding: 0;
                line-height: 44px;

                &[disabled] {
                    background-color: #ccc;
                }
            }
        }
    }

    .suggestion-box {
        background-color: #F0F9FF;
        border: 1px solid #B3E0FF;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;

        .suggestion-header {
            font-size: 12px;
            color: #007AFF;
            margin-bottom: 12px;
            font-weight: 600;
        }
    }

    .submit-btn {
        width: 100%;
        height: 48px;
        background-color: #07C160;
        color: #FFFFFF;
        border-radius: 24px;
        font-size: 16px;
        margin-top: 20px;
    }
}
</style>

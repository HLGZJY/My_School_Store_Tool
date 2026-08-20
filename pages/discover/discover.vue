<template>
    <view class="container">
        <!-- 热门排行 -->
        <HotRanking
            :ranking="ranking"
            @detail="goToDetail"
        />

        <!-- 标签云 -->
        <TagCloud
            :tags="tags"
            @search="searchTag"
        />

        <!-- 时间轴 -->
        <Timeline
            ref="timelineRef"
            :timeline="timeline"
            @toggle="loadTimelineArticles"
            @detail="goToDetail"
            @rangeChange="onTimelineRangeChange"
        />

        <!-- 订阅管理 - 已禁用 -->
        <!-- <SubscribeManager
            :subscribed="subscribed"
            :recommended="recommended"
            @subscribe="handleSubscribe"
            @unsubscribe="handleUnsubscribe"
            @more="viewMoreSubscribe"
        /> -->
    </view>
</template>

<script>
import HotRanking from './components/HotRanking.vue'
import TagCloud from './components/TagCloud.vue'
import Timeline from './components/Timeline.vue'
import SubscribeManager from './components/SubscribeManager.vue'
import { articleApi, adminApi } from '@/api/index'
import { loadWithCache } from '@/utils/cache.js'

export default {
    name: 'Discover',
    components: {
        HotRanking,
        TagCloud,
        Timeline,
        SubscribeManager
    },
    data() {
        return {
            ranking: [],
            tags: [],
            timeline: [],
            subscribed: [],
            recommended: [],
            timelineRange: 'week'
        }
    },
    onLoad() {
        // 启用下拉刷新
        uni.showPullDownRefresh = true

        // 加载所有数据（批量调用）
        this.loadAllData()
    },
    onPullDownRefresh() {
        // 强制刷新所有数据
        this.loadAllData(true).finally(() => {
            uni.stopPullDownRefresh()
        })
    },
    methods: {
        // 批量加载所有发现页数据
        async loadAllData(forceRefresh = false) {
            // 清除各类型缓存
            if (forceRefresh) {
                uni.removeStorageSync('discover_hot')
                uni.removeStorageSync('discover_tags')
                uni.removeStorageSync(`discover_timeline_${this.timelineRange}`)
            }
            uni.removeStorageSync('discover_all')

            const cacheKey = 'discover_all'
            if (forceRefresh) {
                uni.removeStorageSync(cacheKey)
            }

            const { data } = await loadWithCache(cacheKey, async () => {
                const result = await articleApi.getDiscoverData({
                    days: 7,
                    limit: 10,
                    tagLimit: 20,
                    range: this.timelineRange
                })
                return result || {}
            })

            if (data) {
                this.ranking = data.ranking || []
                this.tags = data.tags || []
                this.timeline = data.timeline || []
                if (data.subscriptions) {
                    this.subscribed = data.subscriptions.subscribed || []
                    this.recommended = data.subscriptions.recommended || []
                }
            }
        },

        // 时间轴范围变化
        onTimelineRangeChange(range) {
            this.timelineRange = range
            uni.removeStorageSync(`discover_timeline_${range}`)
            uni.removeStorageSync('discover_all')
            this.loadAllData(true)
        },

        // 加载时间轴文章
        async loadTimelineArticles(timelineItem) {
            try {
                const result = await articleApi.getArticles({
                    page: 1,
                    pageSize: 50,
                    startDate: timelineItem.timestamp,
                    endDate: timelineItem.timestamp + 24 * 60 * 60 * 1000
                })

                const articles = result.list || []
                // 更新对应项的 articles
                const index = this.timeline.findIndex(t => t.timestamp === timelineItem.timestamp)
                if (index >= 0) {
                    this.timeline[index].articles = articles
                }
            } catch (error) {
                console.error('加载时间轴文章失败:', error)
            }
        },

        // 加载订阅列表
        async loadSubscriptions() {
            try {
                // 调用一次云函数，获取带订阅状态的数据源列表
                const result = await adminApi.manageSources('listWithSubscription')

                if (result && result.code === 0 && result.data) {
                    const sourceList = result.data

                    // 提取已订阅和未订阅
                    const subscribed = sourceList.filter(s => s.isSubscribed)
                    const recommended = sourceList.filter(s => !s.isSubscribed)

                    // 转换为组件需要的格式
                    this.subscribed = subscribed.map(s => ({
                        id: s.sourceId,
                        name: s.sourceName,
                        type: s.sourceType || 'website'
                    }))
                    this.recommended = recommended.map(s => ({
                        id: s.sourceId,
                        name: s.sourceName,
                        type: s.sourceType || 'website'
                    }))

                    // 保存到 localStorage 缓存
                    uni.setStorageSync('subscriptions', this.subscribed.map(s => ({
                        id: s.id,
                        name: s.name,
                        subscribeTime: Date.now()
                    })))
                }

            } catch (error) {
                console.error('加载订阅列表失败:', error)
                // 失败时从 localStorage 读取
                const subscriptions = uni.getStorageSync('subscriptions') || []
                const allSources = [
                    { id: 'jwc', name: '教务处', type: 'official' },
                    { id: 'library', name: '图书馆', type: 'official' },
                    { id: 'xsc', name: '学生处', type: 'official' },
                    { id: 'cs', name: '计算机学院', type: 'college' },
                    { id: 'jyzd', name: '就业指导中心', type: 'official' }
                ]

                this.subscribed = allSources.filter(s =>
                    subscriptions.some(sub => sub.id === s.id)
                )
                this.recommended = allSources.filter(s =>
                    !subscriptions.some(sub => sub.id === s.id)
                )
            }
        },

        // 搜索标签
        searchTag(tagName) {
            uni.navigateTo({
                url: `/pages/search/search?keyword=${tagName}`
            })
        },

        // 查看更多订阅 - 订阅管理在发现页直接进行
        viewMoreSubscribe() {
            uni.showToast({
                title: '请在发现页管理订阅',
                icon: 'none'
            })
        },

        // 订阅
        async handleSubscribe(item) {
            try {
                const result = await adminApi.manageSubscriptions('add', {
                    sourceId: item.id,
                    sourceName: item.name
                })

                if (result && result.code === 0) {
                    // 更新 localStorage 缓存
                    const subscriptions = uni.getStorageSync('subscriptions') || []
                    subscriptions.push({
                        id: item.id,
                        name: item.name,
                        subscribeTime: Date.now()
                    })
                    uni.setStorageSync('subscriptions', subscriptions)

                    // 更新本地状态
                    this.subscribed.push(item)
                    this.recommended = this.recommended.filter(r => r.id !== item.id)

                    uni.showToast({
                        title: '订阅成功',
                        icon: 'success'
                    })
                } else {
                    uni.showToast({
                        title: res.result.message || '订阅失败',
                        icon: 'none'
                    })
                }
            } catch (error) {
                console.error('订阅失败:', error)
                uni.showToast({
                    title: '订阅失败',
                    icon: 'none'
                })
            }
        },

        // 取消订阅
        async handleUnsubscribe(item) {
            try {
                const result = await adminApi.manageSubscriptions('remove', {
                    sourceId: item.id
                })

                if (result && result.code === 0) {
                    // 更新 localStorage 缓存
                    const subscriptions = uni.getStorageSync('subscriptions') || []
                    const filtered = subscriptions.filter(s => s.id !== item.id)
                    uni.setStorageSync('subscriptions', filtered)

                    // 更新本地状态
                    this.recommended.push(item)
                    this.subscribed = this.subscribed.filter(s => s.id !== item.id)

                    uni.showToast({
                        title: '已取消订阅',
                        icon: 'none'
                    })
                } else {
                    uni.showToast({
                        title: result.message || '取消订阅失败',
                        icon: 'none'
                    })
                }
            } catch (error) {
                console.error('取消订阅失败:', error)
                uni.showToast({
                    title: '取消订阅失败',
                    icon: 'none'
                })
            }
        },

        // 跳转详情
        goToDetail(id) {
            uni.navigateTo({
                url: `/pages/detail/detail?id=${id}`
            })
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    padding-bottom: 20px;
}
</style>

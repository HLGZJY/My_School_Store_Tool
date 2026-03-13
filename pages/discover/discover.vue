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
        />

        <!-- 订阅管理 -->
        <SubscribeManager
            :subscribed="subscribed"
            :recommended="recommended"
            @subscribe="handleSubscribe"
            @unsubscribe="handleUnsubscribe"
            @more="viewMoreSubscribe"
        />
    </view>
</template>

<script>
import HotRanking from './components/HotRanking.vue'
import TagCloud from './components/TagCloud.vue'
import Timeline from './components/Timeline.vue'
import SubscribeManager from './components/SubscribeManager.vue'
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
            recommended: []
        }
    },
    onLoad() {
        // 启用下拉刷新
        uni.showPullDownRefresh = true

        // 加载数据
        this.loadHotRanking()
        this.loadTagCloud()
        this.loadTimeline()
        this.loadSubscriptions()
    },
    onPullDownRefresh() {
        // 强制刷新所有数据
        Promise.all([
            this.loadHotRanking(true),
            this.loadTagCloud(true),
            this.loadTimeline(true),
            this.loadSubscriptions()
        ]).finally(() => {
            uni.stopPullDownRefresh()
        })
    },
    methods: {
        // 加载热门排行
        async loadHotRanking(forceRefresh = false) {
            const data = await loadWithCache('discover_hot', 'DISCOVER', async () => {
                const res = await uniCloud.callFunction({
                    name: 'getHotArticles',
                    data: {
                        days: 7,
                        limit: 10
                    }
                })
                if (res.result.code === 0) {
                    return res.result.data || []
                }
                return []
            }, forceRefresh)
            this.ranking = data
        },

        // 加载标签云
        async loadTagCloud(forceRefresh = false) {
            const data = await loadWithCache('discover_tags', 'DISCOVER', async () => {
                const res = await uniCloud.callFunction({
                    name: 'getTagCloud',
                    data: {
                        limit: 20
                    }
                })
                if (res.result.code === 0) {
                    return res.result.data || []
                }
                return []
            }, forceRefresh)
            this.tags = data
        },

        // 加载时间轴
        async loadTimeline(forceRefresh = false) {
            const data = await loadWithCache('discover_timeline', 'DISCOVER', async () => {
                const res = await uniCloud.callFunction({
                    name: 'getTimeline'
                })
                if (res.result.code === 0) {
                    return res.result.data || []
                }
                return []
            }, forceRefresh)
            this.timeline = data
        },

        // 加载时间轴文章
        async loadTimelineArticles(timelineItem) {
            try {
                const res = await uniCloud.callFunction({
                    name: 'adminGetArticles',
                    data: {
                        page: 1,
                        pageSize: 50,
                        startDate: timelineItem.timestamp,
                        endDate: timelineItem.timestamp + 24 * 60 * 60 * 1000
                    }
                })

                if (res.result.code === 0) {
                    const articles = res.result.data.list || []
                    // 更新对应项的 articles
                    const index = this.timeline.findIndex(t => t.timestamp === timelineItem.timestamp)
                    if (index >= 0) {
                        this.timeline[index].articles = articles
                    }
                }
            } catch (error) {
                console.error('加载时间轴文章失败:', error)
            }
        },

        // 加载订阅列表
        async loadSubscriptions() {
            try {
                // 调用一次云函数，获取带订阅状态的数据源列表
                const res = await uniCloud.callFunction({
                    name: 'manageSources',
                    data: { action: 'listWithSubscription' }
                })

                if (res.result.code === 0 && res.result.data) {
                    const sourceList = res.result.data

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

        // 查看更多订阅
        viewMoreSubscribe() {
            uni.navigateTo({
                url: '/pages/subscribe/subscribe'
            })
        },

        // 订阅
        async handleSubscribe(item) {
            try {
                const res = await uniCloud.callFunction({
                    name: 'manageSubscriptions',
                    data: {
                        action: 'add',
                        data: {
                            sourceId: item.id,
                            sourceName: item.name
                        }
                    }
                })

                if (res.result.code === 0) {
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
                const res = await uniCloud.callFunction({
                    name: 'manageSubscriptions',
                    data: {
                        action: 'remove',
                        data: {
                            sourceId: item.id
                        }
                    }
                })

                if (res.result.code === 0) {
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
                        title: res.result.message || '取消订阅失败',
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

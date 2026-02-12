<template>
    <view class="container">
        <!-- 热门排行 -->
        <HotRanking
            :ranking="ranking"
            @more="viewMoreRanking"
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
        this.loadHotRanking()
        this.loadTagCloud()
        this.loadTimeline()
        this.loadSubscriptions()
    },
    methods: {
        // 加载热门排行
        async loadHotRanking() {
            const data = await loadWithCache('discover_hot', 'DISCOVER', async () => {
                const res = await uniCloud.callFunction({
                    name: 'getHotArticles',
                    data: {
                        days: 7,
                        limit: 5
                    }
                })
                if (res.result.code === 0) {
                    return res.result.data || []
                }
                return []
            })
            this.ranking = data
        },

        // 加载标签云
        async loadTagCloud() {
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
            })
            this.tags = data
        },

        // 加载时间轴
        async loadTimeline() {
            const data = await loadWithCache('discover_timeline', 'DISCOVER', async () => {
                const res = await uniCloud.callFunction({
                    name: 'getTimeline'
                })
                if (res.result.code === 0) {
                    return res.result.data || []
                }
                return []
            })
            this.timeline = data
        },

        // 加载时间轴文章
        async loadTimelineArticles(timelineItem) {
            try {
                const res = await uniCloud.callFunction({
                    name: 'getArticles',
                    data: {
                        page: 1,
                        pageSize: 50,
                        startDate: timelineItem.timestamp,
                        endDate: timelineItem.timestamp + 24 * 60 * 60 * 1000
                    }
                })

                if (res.result.code === 0) {
                    const articles = res.result.data.articles || []
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
        loadSubscriptions() {
            const allSources = [
                { id: 'jwc', name: '教务处', type: 'official' },
                { id: 'library', name: '图书馆', type: 'official' },
                { id: 'xsc', name: '学生处', type: 'official' },
                { id: 'cs', name: '计算机学院', type: 'college' },
                { id: 'jyzd', name: '就业指导中心', type: 'official' }
            ]

            const subscriptions = uni.getStorageSync('subscriptions') || []

            this.subscribed = allSources.filter(s =>
                subscriptions.some(sub => sub.id === s.id)
            )
            this.recommended = allSources.filter(s =>
                !subscriptions.some(sub => sub.id === s.id)
            )
        },

        // 搜索标签
        searchTag(tagName) {
            uni.navigateTo({
                url: `/pages/search/search?keyword=${tagName}`
            })
        },

        // 查看更多排行
        viewMoreRanking() {
            uni.showToast({
                title: '功能开发中',
                icon: 'none'
            })
        },

        // 查看更多订阅
        viewMoreSubscribe() {
            uni.navigateTo({
                url: '/pages/subscribe/subscribe'
            })
        },

        // 订阅
        handleSubscribe(item) {
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
        },

        // 取消订阅
        handleUnsubscribe(item) {
            const subscriptions = uni.getStorageSync('subscriptions') || []
            const index = subscriptions.findIndex(s => s.id === item.id)
            if (index >= 0) {
                subscriptions.splice(index, 1)
            }
            uni.setStorageSync('subscriptions', subscriptions)

            // 更新本地状态
            this.recommended.push(item)
            this.subscribed = this.subscribed.filter(s => s.id !== item.id)

            uni.showToast({
                title: '已取消订阅',
                icon: 'none'
            })
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

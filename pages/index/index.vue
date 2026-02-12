<template>
    <view class="container">
        <!-- 搜索栏 -->
        <view class="search-bar" @click="goToSearch">
            <uni-icons type="search" size="18" color="#A0AEC0"></uni-icons>
            <text class="placeholder">搜索通知、讲座、活动...</text>
        </view>
		
		 <!-- 筛选面板 -->
		        <FilterPanel
		            :sources="sources"
		            :tags="tagOptions"
		            @filterChange="onFilterChange"
		            ref="filterRef"
		        />

        <!-- 分类Tab -->
        <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
            <view class="tab-list">
                <view
                    v-for="(tab, index) in tabs"
                    :key="index"
                    class="tab-item"
                    :class="{ active: currentTab === index }"
                    @click="onTabChange(index)"
                >
                    {{ tab.name }}
                </view>
            </view>
        </scroll-view>

        <!-- 智能推荐区 -->
        <view v-if="currentTab === 0 && recommendations.length > 0" class="recommend-section">
            <view class="section-header">
                <uni-icons type="light" size="16" color="#00D4AA"></uni-icons>
                <text class="section-title">猜你需要</text>
            </view>
            <scroll-view class="recommend-scroll" scroll-x :show-scrollbar="false">
                <view
                    v-for="item in recommendations"
                    :key="item._id"
                    class="recommend-card"
                    @click="goToDetail(item)"
                >
                    <text class="recommend-title">{{ item.title }}</text>
                    <text class="recommend-source">{{ item.sourceName }}</text>
                </view>
            </scroll-view>
        </view>

        <!-- 瀑布流文章列表 -->
        <scroll-view
            class="article-scroll"
            scroll-y
            refresher-enabled
            refresher-triggered="refresherTriggered"
            @refresherrefresh="onRefresh"
            @scrolltolower="onLoadMore"
            scroll-into-view="scrollIntoView"
            scroll-with-animation
        >
            <!-- 文章卡片列表 -->
            <view class="article-list" id="article-list">
                <view
                    v-for="(article, index) in articleList"
                    :key="article._id"
                    class="article-item"
                    @click="goToDetail(article)"
                >
                    <!-- 左滑操作区域 -->
                    <view
                        class="swipe-action"
                        :class="{ 'swipe-show': swipeShowIndex === index }"
                    >
                        <view
                            class="swipe-btn collect-btn"
                            :class="{ collected: article.isCollected }"
                            @click.stop="toggleCollect(article, index)"
                        >
                            <uni-icons
                                :type="article.isCollected ? 'star-filled' : 'star'"
                                size="20"
                                :color="article.isCollected ? '#00D4AA' : '#FFFFFF'"
                            ></uni-icons>
                            <text>{{ article.isCollected ? '已收藏' : '收藏' }}</text>
                        </view>
                    </view>

                    <!-- 卡片主体 -->
                    <view
                        class="card-content"
                        :class="{ 'swipe-offset': swipeShowIndex === index }"
                        @touchstart="onTouchStart"
                        @touchend="onTouchEnd"
                        @touchmove="onTouchMove"
                    >
                        <ArticleCard :article="article" />
                    </view>
                </view>
            </view>

            <!-- 加载状态 -->
            <view v-if="loading" class="loading-state">
                <text>加载中...</text>
            </view>
            <view v-else-if="!hasMore && articleList.length > 0" class="loading-state">
                <text>没有更多了</text>
            </view>
            <view v-else-if="articleList.length === 0" class="loading-state">
                <text>暂无内容</text>
            </view>
        </scroll-view>
    </view>
</template>

<script>
import ArticleCard from '@/components/ArticleCard.vue';
import FilterPanel from '@/components/FilterPanel.vue';

export default {
    components: {
        ArticleCard,
        FilterPanel
    },
    data() {
        return {
            currentTab: 0,
            tabs: [
                { name: '全部', category: '' },
                { name: '通知公告', category: 'notice' },
                { name: '学术动态', category: 'academic' },
                { name: '社团活动', category: 'activity' },
                { name: '生活服务', category: 'service' }
            ],
            articleList: [],
            recommendations: [],
            page: 1,
            pageSize: 10,
            loading: false,
            hasMore: true,
            refresherTriggered: false,
			
			// 筛选条件
			            filterSourceId: '',
			            filterTag: '',
			            filterTimeRange: '',
			
			            // 数据源配置
			            sources: [
			                { id: 'jwc', name: '教务处' },
			                { id: 'library', name: '图书馆' },
			                { id: 'xsc', name: '学生处' },
			                { id: 'cs', name: '计算机学院' },
			                { id: 'jyzd', name: '就业指导中心' },
			                { id: 'yjs', name: '研究生院' },
			                { id: 'kjc', name: '科技处' },
			                { id: 'rsc', name: '人事处' }
			            ],
			            tagOptions: ['通知', '讲座', '活动', '竞赛', '讲座预告', '考试通知', '比赛', '招聘'],
			
            // 滚动位置记录
            scrollPositions: {},

            // 左滑收藏相关
            swipeShowIndex: null,
            touchStartX: 0,
            touchEndX: 0,
            touchThreshold: 50,
            scrollIntoView: ''
        };
    },
    onLoad() {
		this.loadSources();
        this.loadArticles();
        this.loadRecommendations();
    },
    onShow() {
        // 返回时刷新收藏状态
        this.refreshCollectionStatus();
    },
	
    methods: {
		// 加载数据源
		        async loadSources() {
		            try {
		                const res = await uniCloud.callFunction({
		                    name: 'getSubscribeSources'
		                });
		                if (res.result.code === 0 && res.result.data) {
		                    this.sources = res.result.data.map(s => ({
		                        id: s.id,
		                        name: s.name
		                    }));
		                }
		            } catch (e) {
		                console.error('加载数据源失败:', e);
		            }
		        },
		        // 筛选变化
		        onFilterChange(filters) {
		            this.filterSourceId = filters.sourceId;
		            this.filterTag = filters.tag;
		            this.filterTimeRange = filters.timeRange;
		            this.page = 1;
		            this.hasMore = true;
		            this.articleList = [];
		            this.loadArticles(true);
		        },
		        // 获取时间范围
		        getTimeRangeFilter() {
		            if (!this.filterTimeRange) return {};
		            const now = Date.now();
		            const ranges = {
		                '1d': 1 * 24 * 60 * 60 * 1000,
		                '7d': 7 * 24 * 60 * 60 * 1000,
		                '30d': 30 * 24 * 60 * 60 * 1000
		            };
		            const days = ranges[this.filterTimeRange] || 0;
		            if (days === 0) return {}; // 'all' 不过滤时间
		            return {
		                startTime: now - days,
		                endTime: now
		            };
		        },
				
        // 加载文章列表
        async loadArticles(isRefresh = false) {
            // 防止重复请求
                        if (isRefresh) {
                            // 下拉刷新时，直接停止刷新动画并重置状态
                            this.refresherTriggered = false
                            // 延迟重置，避免立即触发新的刷新
                            setTimeout(() => {
                                this.refresherTriggered = false
                            }, 10)
                        }
                        if (this.loading && !isRefresh) return;
            
                        this.loading = !isRefresh; // 下拉刷新时不显示底部加载状态
                        if (isRefresh) {
                            this.refresherTriggered = true;
                        }
            const category = this.tabs[this.currentTab].category;
            const userRole = uni.getStorageSync('userRole') || 'student';
			// 构建筛选参数
			            const timeFilter = this.getTimeRangeFilter();

            try {
                const res = await uniCloud.callFunction({
                    name: 'getArticles',
                    data: {
                        page: this.page,
                        pageSize: this.pageSize,
                        category,
                        userRole,
                                                sourceId: this.filterSourceId,
                                                tag: this.filterTag,
                                                startDate: timeFilter.startTime || 0,
                                                endDate: timeFilter.endTime || 0
                    }
                });

                if (res.result.code === 0) {
                    const { articles, hasMore } = res.result.data;

                    if (isRefresh) {
                        this.articleList = articles.map(a => ({
                            ...a,
                            isCollected: this.checkIsCollected(a._id)
                        }));
                    } else {
                        const newArticles = articles.map(a => ({
                            ...a,
                            isCollected: this.checkIsCollected(a._id)
                        }));
                        this.articleList = [...this.articleList, ...newArticles];
                    }
                    this.hasMore = hasMore;
                }
            } catch (error) {
                console.error('加载文章失败:', error);
                uni.showToast({
                    title: '加载失败',
                    icon: 'none'
                });
            } finally {
                // 延迟清除刷新状态，避免闪烁
                                setTimeout(() => {
                                    this.loading = false;
                                    this.refresherTriggered = false;
                                }, 100);
            }
        },

        // 加载推荐文章
        async loadRecommendations() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'getArticles',
                    data: {
                        page: 1,
                        pageSize: 3,
                        category: ''
                    }
                });

                if (res.result.code === 0) {
                    this.recommendations = res.result.data.recommendations || [];
                }
            } catch (error) {
                console.error('加载推荐失败:', error);
            }
        },

        // 下拉刷新
        onRefresh() {
            this.page = 1;
            this.refresherTriggered = true;
            this.loadArticles(true);
            this.loadRecommendations();
        },

        // 上拉加载更多
        onLoadMore() {
            if (!this.loading && this.hasMore) {
                this.page++;
                this.loadArticles(false);
            }
        },

        // Tab切换
        onTabChange(index) {
            if (index === this.currentTab) return;

            // 记录当前Tab的滚动位置
            this.scrollPositions[this.currentTab] = this.articleList.length > 0
                ? this.articleList[this.articleList.length - 1]._id
                : '';

            this.currentTab = index;
            this.page = 1;
            this.hasMore = true;
            this.articleList = [];

            // 滚动到顶部
            this.scrollIntoView = 'article-list';

            // 加载新数据
            this.loadArticles(true);
        },

        // 跳转搜索页
        goToSearch() {
            uni.navigateTo({
                url: '/pages/search/search'
            });
        },

        // 跳转详情页
        goToDetail(article) {
            // 记录阅读历史
            this.addToHistory(article);

            uni.navigateTo({
                url: `/pages/detail/detail?id=${article._id}`
            });
        },

        // 添加到阅读历史
        addToHistory(article) {
            let history = uni.getStorageSync('readHistory') || [];
            history = history.filter(h => h._id !== article._id);
            history.unshift({
                _id: article._id,
                title: article.title,
                publishTime: article.publishTime
            });
            // 保留最近50条
            history = history.slice(0, 50);
            uni.setStorageSync('readHistory', history);
        },

        // 检查是否已收藏
        checkIsCollected(articleId) {
            const collections = uni.getStorageSync('collections') || [];
            return collections.some(c => c._id === articleId);
        },

        // 刷新收藏状态
        refreshCollectionStatus() {
            this.articleList = this.articleList.map(article => ({
                ...article,
                isCollected: this.checkIsCollected(article._id)
            }));
        },

        // 切换收藏
        toggleCollect(article, index) {
            const collections = uni.getStorageSync('collections') || [];
            const existingIndex = collections.findIndex(c => c._id === article._id);

            if (existingIndex >= 0) {
                // 取消收藏
                collections.splice(existingIndex, 1);
                uni.showToast({
                    title: '已取消收藏',
                    icon: 'none'
                });
            } else {
                // 添加收藏
                collections.unshift({
                    _id: article._id,
                    title: article.title,
                    sourceName: article.sourceName,
                    publishTime: article.publishTime,
                    collectTime: Date.now()
                });
                uni.showToast({
                    title: '收藏成功',
                    icon: 'success'
                });
                // 震动反馈
                uni.vibrateShort();
            }

            uni.setStorageSync('collections', collections);

            // 更新本地状态
            this.articleList[index].isCollected = existingIndex < 0;
            this.swipeShowIndex = null;
        },

        // 触摸事件处理
        onTouchStart(e) {
            this.touchStartX = e.changedTouches[0].clientX;
        },

        onTouchMove(e) {
            // 阻止默认滚动，实现左滑效果
        },

        onTouchEnd(e) {
            this.touchEndX = e.changedTouches[0].clientX;
            this.handleSwipe();
        },

        handleSwipe() {
            const diff = this.touchStartX - this.touchEndX;

            if (diff > this.touchThreshold) {
                // 左滑，显示收藏按钮
                this.swipeShowIndex = this.articleList.findIndex((_, i) => {
                    // 找到当前可见区域的卡片
                    return true;
                });
            } else if (diff < -this.touchThreshold) {
                // 右滑，关闭
                this.swipeShowIndex = null;
            }
        }
    },

    // 页面分享
    onShareAppMessage() {
        return {
            title: '校园信息聚合 - 分享你的校园生活',
            path: '/pages/index/index'
        };
    }
};
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.search-bar {
    display: flex;
    align-items: center;
    padding: 16px;
    background-color: #FFFFFF;
    margin: 8px 16px;
    border-radius: 8px;

    .placeholder {
        margin-left: 8px;
        font-size: 14px;
        color: #A0AEC0;
    }
}

.tab-scroll {
    background-color: #FFFFFF;
    white-space: nowrap;

    .tab-list {
        display: inline-flex;
        padding: 0 16px;
    }
}

.tab-item {
    padding: 14px 16px;
    font-size: 14px;
    color: #4A5568;
    position: relative;

    &.active {
        color: #0A2540;
        font-weight: 600;

        &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 2px;
            background-color: #00D4AA;
        }
    }
}

// 智能推荐区
.recommend-section {
    background-color: #FFFFFF;
    padding: 16px;
    margin-bottom: 8px;

    .section-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        .section-title {
            margin-left: 6px;
            font-size: 16px;
            font-weight: 600;
            color: #0A2540;
        }
    }
}

.recommend-scroll {
    white-space: nowrap;

    .recommend-card {
        display: inline-block;
        width: 200px;
        padding: 12px;
        margin-right: 12px;
        background: linear-gradient(135deg, #00D4AA 0%, #00B894 100%);
        border-radius: 8px;
        vertical-align: top;

        .recommend-title {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #FFFFFF;
            line-height: 1.5;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .recommend-source {
            display: block;
            margin-top: 8px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
        }
    }
}

// 瀑布流文章列表
.article-scroll {
    height: calc(100vh - 180px);
}

.article-list {
    padding: 0 16px;
}

.article-item {
    position: relative;
    margin-bottom: 8px;
    overflow: hidden;
}

// 左滑收藏
.swipe-action {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    z-index: 1;

    &.swipe-show {
        transform: translateX(0);
    }
}

.swipe-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 100%;
    background-color: #00D4AA;
    color: #FFFFFF;
    font-size: 12px;

    &.collected {
        background-color: #4A5568;
    }
}

.card-content {
    transition: margin-right 0.3s ease;

    &.swipe-offset {
        margin-right: 80px;
    }
}

// 加载状态
.loading-state {
    padding: 20px;
    text-align: center;
    color: #A0AEC0;
    font-size: 14px;
}
</style>

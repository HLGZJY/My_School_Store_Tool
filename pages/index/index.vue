<template>
    <view class="container">
        <!-- 搜索栏 -->
        <view class="search-bar" @click="goToSearch">
            <uni-icons type="search" size="18" color="#A0AEC0"></uni-icons>
            <text class="placeholder">搜索通知、讲座、活动...</text>
        </view>

        <!-- 分类Tab -->
        <scroll-view class="tab-scroll" scroll-x>
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

        <!-- 测试内容 -->
        <view class="content">
            <view class="info-card">
                <text class="info-title">👋 欢迎使用校园信息聚合</text>
                <text class="info-text">项目正在搭建中，请稍后...</text>
            </view>

            <!-- 简单的测试卡片列表 -->
            <view
                v-for="i in 3"
                :key="i"
                class="test-card"
            >
                <view class="card-header">
                    <view class="urgent-tag">📍 紧急</view>
                    <text class="card-title">测试文章标题 - {{ i }}</text>
                </view>
                <view class="card-meta">
                    <text class="source">教务处</text>
                    <text class="time">刚刚</text>
                </view>
                <view class="tags">
                    <view class="tag role-tag">本科生</view>
                </view>
            </view>
        </view>

        <!-- 底部提示 -->
        <view class="footer-tip">
            <text>🔵 首页功能正常，可以进入下一步</text>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            currentTab: 0,
            tabs: [
                { name: '全部', category: '' },
                { name: '通知公告', category: 'notice' },
                { name: '学术动态', category: 'academic' },
                { name: '社团活动', category: 'activity' },
                { name: '生活服务', category: 'service' }
            ]
        }
    },
    methods: {
        onTabChange(index) {
            this.currentTab = index
            console.log('切换到:', this.tabs[index].name)
        },

        goToSearch() {
            console.log('跳转到搜索页')
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

.content {
    padding: 16px;
}

.info-card {
    background: linear-gradient(135deg, #00D4AA 0%, #0A2540 100%);
    padding: 24px;
    border-radius: 12px;
    margin-bottom: 20px;
    text-align: center;

    .info-title {
        display: block;
        font-size: 18px;
        font-weight: 600;
        color: #FFFFFF;
        margin-bottom: 8px;
    }

    .info-text {
        display: block;
        font-size: 14px;
        color: #FFFFFF;
        opacity: 0.9;
    }
}

.test-card {
    background-color: #FFFFFF;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 2px 8px rgba(10, 37, 64, 0.04);

    &:active {
        transform: scale(0.98);
    }
}

.card-header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 8px;
}

.urgent-tag {
    font-size: 12px;
    color: #EF4444;
    margin-right: 8px;
    flex-shrink: 0;
}

.card-title {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
    line-height: 1.5;
}

.card-meta {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #A0AEC0;
    margin-bottom: 12px;

    .source {
        margin-right: 12px;
    }
}

.tags {
    display: flex;
    flex-wrap: wrap;
}

.tag {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
}

.role-tag {
    background-color: #DBEAFE;
    color: #1E40AF;
}

.footer-tip {
    padding: 40px 20px;
    text-align: center;
    color: #00D4AA;
    font-size: 14px;
}
</style>

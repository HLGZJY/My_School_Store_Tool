<template>
    <view class="skeleton-list">
        <view v-for="(item, index) in count" :key="index" class="skeleton-item">
            <view class="skeleton-title"></view>
            <view class="skeleton-title secondary"></view>
            <view class="skeleton-meta">
                <view class="skeleton-meta-item"></view>
                <view class="skeleton-meta-item"></view>
                <view class="skeleton-meta-item"></view>
            </view>
            <view class="skeleton-tags">
                <view class="skeleton-tag"></view>
                <view class="skeleton-tag"></view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'SkeletonBlock',
    props: {
        count: {
            type: Number,
            default: 3
        }
    }
}
</script>

<style lang="scss" scoped>
@keyframes shimmer {
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
}

.skeleton-list {
    padding: 0 16px;
}

.skeleton-item {
    background-color: #FFFFFF;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 8px;
}

.skeleton-title {
    height: 16px;
    background: linear-gradient(90deg, #E2E8F0 25%, #F0F4F8 50%, #E2E8F0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 8px;
    width: 80%;

    &.secondary {
        width: 60%;
        margin-bottom: 12px;
    }
}

.skeleton-meta {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
}

.skeleton-meta-item {
    height: 12px;
    width: 60px;
    background: linear-gradient(90deg, #E2E8F0 25%, #F0F4F8 50%, #E2E8F0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
}

.skeleton-tags {
    display: flex;
    gap: 8px;
}

.skeleton-tag {
    height: 24px;
    width: 60px;
    background: linear-gradient(90deg, #E2E8F0 25%, #F0F4F8 50%, #E2E8F0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
}
</style>

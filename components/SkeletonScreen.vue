<template>
    <view class="skeleton-screen">
        <view
            v-for="i in rows"
            :key="i"
            class="skeleton-card"
        >
            <view class="skeleton-title"></view>
            <view v-if="type !== 'compact'" class="skeleton-meta"></view>
            <view v-if="type !== 'compact'" class="skeleton-tags">
                <view class="skeleton-tag"></view>
                <view class="skeleton-tag"></view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'SkeletonScreen',
    props: {
        rows: {
            type: Number,
            default: 3
        },
        type: {
            type: String,
            default: 'article'
        }
    }
}
</script>

<style lang="scss" scoped>
.skeleton-screen {
    padding: 8px 16px;
}

.skeleton-card {
    background-color: #FFFFFF;
    padding: 16px;
    margin-bottom: 8px;
    border-radius: 8px;
}

.skeleton-title {
    height: 20px;
    background-color: #EEEEEE;
    border-radius: 8px;
    margin-bottom: 12px;
    width: 80%;
}

.skeleton-meta {
    height: 14px;
    background-color: #EEEEEE;
    border-radius: 4px;
    margin-bottom: 12px;
    width: 50%;
}

.skeleton-tags {
    display: flex;
    gap: 8px;
}

.skeleton-tag {
    height: 24px;
    width: 60px;
    background-color: #EEEEEE;
    border-radius: 4px;
}
</style>

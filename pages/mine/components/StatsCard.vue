<template>
    <view class="stats-card">
        <view class="stat-item" @click="$emit('click', 'collect')">
            <text class="label">收藏</text>
        </view>
        <view class="divider"></view>
        <view class="stat-item" @click="$emit('click', 'read')">
            <text class="label">阅读历史</text>
        </view>
    </view>
</template>

<script>
export default {
    name: 'StatsCard'
};
</script>

<style lang="scss" scoped>
.stats-card {
    display: flex;
    background-color: #FFFFFF;
    padding: 20px 0;

    .stat-item {
        flex: 1;
        text-align: center;

        .label {
            font-size: 14px;
            font-weight: 500;
            color: #4A5568;
        }
    }

    .divider {
        width: 1px;
        background-color: #E8ECF1;
    }
}
</style>

<template>
    <view class="stats-card">
        <view class="stat-item" @click="$emit('click', 'collect')">
            <text class="value">{{ collectCount }}</text>
            <text class="label">收藏</text>
        </view>
        <view class="divider"></view>
        <view class="stat-item" @click="$emit('click', 'read')">
            <text class="value">{{ readCount }}</text>
            <text class="label">阅读</text>
        </view>
    </view>
</template>

<script>
export default {
    name: 'StatsCard',
    props: {
        collectCount: { type: Number, default: 0 },
        readCount: { type: Number, default: 0 }
    }
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

        .value {
            display: block;
            font-size: 24px;
            font-weight: 600;
            color: #0A2540;
            margin-bottom: 4px;
        }

        .label {
            font-size: 13px;
            color: #A0AEC0;
        }
    }

    .divider {
        width: 1px;
        background-color: #E8ECF1;
    }
}
</style>

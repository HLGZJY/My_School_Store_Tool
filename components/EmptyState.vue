<template>
    <view class="empty-state">
        <image class="illustration" :src="image || '/static/images/empty-default.svg'" mode="aspectFit" />
        <text class="text">{{ text || '暂无内容' }}</text>
        <text v-if="tip" class="tip">{{ tip }}</text>
        <view v-if="actionText" class="action-btn" @click="$emit('action')">
            <text>{{ actionText }}</text>
        </view>
    </view>
</template>

<script>
export default {
    name: 'EmptyState',
    props: {
        image: {
            type: String,
            default: ''
        },
        text: {
            type: String,
            default: '暂无内容'
        },
        tip: {
            type: String,
            default: ''
        },
        actionText: {
            type: String,
            default: ''
        }
    },
    emits: ['action']
}
</script>

<style lang="scss" scoped>
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
}

.illustration {
    width: 200px;
    height: 200px;
    margin-bottom: 16px;
}

.text {
    font-size: 16px;
    color: #4A5568;
    margin-bottom: 8px;
}

.tip {
    font-size: 14px;
    color: #A0AEC0;
    margin-bottom: 24px;
}

.action-btn {
    padding: 10px 24px;
    background-color: #00D4AA;
    border-radius: 8px;
    transition: all 0.2s ease;

    text {
        font-size: 14px;
        color: #FFFFFF;
        font-weight: 500;
    }

    &:active {
        transform: scale(0.96);
        opacity: 0.9;
    }
}
</style>

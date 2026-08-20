<template>
    <view class="error-page">
        <image class="illustration" :src="'/static/images/error-default.svg'" mode="aspectFit" />
        <text class="message">{{ message || '加载失败' }}</text>
        <view class="retry-btn" @click="onRetry">
            <text>重新加载</text>
        </view>
    </view>
</template>

<script>
export default {
    name: 'ErrorPage',
    props: {
        message: {
            type: String,
            default: '加载失败'
        },
        onRetry: {
            type: Function,
            default: null
        }
    },
    emits: ['retry'],
    methods: {
        onRetry() {
            this.$emit('retry')
            if (this.onRetry) {
                this.onRetry()
            }
        }
    }
}
</script>

<style lang="scss" scoped>
.error-page {
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

.message {
    font-size: 16px;
    color: #4A5568;
    margin-bottom: 24px;
}

.retry-btn {
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

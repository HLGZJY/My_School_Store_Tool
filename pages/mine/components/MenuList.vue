<template>
    <view class="menu-list">
        <view class="menu-item" @click="$emit('click', 'subscribe')">
            <view class="left">
                <uni-icons type="notification" size="20" color="#00D4AA"></uni-icons>
                <text class="text">订阅管理</text>
            </view>
            <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
        </view>

        <view class="menu-item" @click="$emit('click', 'message')">
            <view class="left">
                <uni-icons type="email" size="20" color="#00D4AA"></uni-icons>
                <text class="text">消息通知</text>
            </view>
            <view class="right">
                <view v-if="unreadCount > 0" class="badge">{{ unreadCount }}</view>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
        </view>

        <view class="menu-item" @click="$emit('click', 'settings')">
            <view class="left">
                <uni-icons type="gear" size="20" color="#00D4AA"></uni-icons>
                <text class="text">设置</text>
            </view>
            <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
        </view>
    </view>
</template>

<script>
export default {
    name: 'MenuList',
    props: {
        unreadCount: { type: Number, default: 0 }
    }
};
</script>

<style lang="scss" scoped>
.menu-list {
    background-color: #FFFFFF;
    margin-top: 8px;
}

.menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #E8ECF1;

    &:last-child { border-bottom: none; }
    &:active { background-color: #F7F9FA; }
}

.left, .right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.text {
    font-size: 14px;
    color: #4A5568;
}

.badge {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background-color: #EF4444;
    border-radius: 10px;
    font-size: 12px;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>

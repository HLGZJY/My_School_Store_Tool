<template>
    <view class="search-bar">
        <uni-icons type="back" size="20" color="#0A2540" @click="$emit('back')"></uni-icons>
        <input
            :value="keyword"
            class="search-input"
            placeholder="搜索通知、讲座、活动..."
            :focus="focus"
            @confirm="$emit('search')"
            @input="$emit('update:keyword', $event.detail.value)"
        />
        <view class="search-btn" @click="$emit('search')">搜索</view>
    </view>
</template>

<script>
export default {
    name: 'SearchHeader',
    props: {
        keyword: {
            type: String,
            default: ''
        },
        focus: {
            type: Boolean,
            default: true
        }
    },
    emits: ['update:keyword', 'search', 'back']
}
</script>

<style lang="scss" scoped>
.search-bar {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: #FFFFFF;
}

.search-input {
    flex: 1;
    height: 40px;
    padding: 0 12px;
    background-color: #F7F9FA;
    border-radius: 8px;
    font-size: 14px;
    color: #4A5568;
}

.search-btn {
    margin-left: 12px;
    padding: 0 16px;
    font-size: 14px;
    color: #00D4AA;
}
</style>

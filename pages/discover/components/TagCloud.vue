<template>
    <view class="section">
        <view class="section-header">
            <text class="section-title">🏷️ 标签云</text>
        </view>
        <view class="tag-cloud">
            <view
                v-for="tag in tags"
                :key="tag.name"
                class="tag-item"
                :style="{ fontSize: getTagSize(tag.count) }"
                @click="searchTag(tag.name)"
            >
                {{ tag.name }}
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'TagCloud',
    props: {
        tags: {
            type: Array,
            default: () => []
        }
    },
    emits: ['search'],
    methods: {
        getTagSize(count) {
            if (this.tags.length === 0) return '14px'

            const counts = this.tags.map(t => t.count)
            const minCount = Math.min(...counts)
            const maxCount = Math.max(...counts)

            if (minCount === maxCount) return '14px'

            const ratio = (count - minCount) / (maxCount - minCount)
            const minSize = 14
            const maxSize = 18
            return minSize + ratio * (maxSize - minSize) + 'px'
        },
        searchTag(tagName) {
            this.$emit('search', tagName)
        }
    }
}
</script>

<style lang="scss" scoped>
.section {
    padding: 20px;
    background-color: #FFFFFF;
    margin-bottom: 8px;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: #0A2540;
}

.tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tag-item {
    padding: 8px 16px;
    background-color: #F7F9FA;
    border-radius: 20px;
    color: #4A5568;
    transition: all 0.2s ease;

    &:active {
        background-color: #E8ECF1;
        transform: scale(0.95);
    }
}
</style>

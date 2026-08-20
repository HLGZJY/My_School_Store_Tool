<template>
    <view class="search-bar">
        <uni-icons type="back" size="20" color="#0A2540" @click="$emit('back')"></uni-icons>
        <view class="input-wrapper">
            <input
                :value="keyword"
                class="search-input"
                placeholder="搜索通知、讲座、活动..."
                :focus="focus"
                @confirm="$emit('search')"
                @input="onInput"
                @blur="onBlur"
            />
            <!-- 搜索建议下拉 -->
            <view v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
                <view
                    v-for="(item, index) in suggestions"
                    :key="index"
                    class="suggestion-item"
                    @click="selectSuggestion(item)"
                >
                    <view class="suggestion-type-badge" :class="item.type">{{ getTypeLabel(item.type) }}</view>
                    <text class="suggestion-text">{{ item.text }}</text>
                </view>
            </view>
        </view>
        <view class="search-btn" @click="$emit('search')">搜索</view>
    </view>
</template>

<script>
import { articleApi } from '@/api/article.js'

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
    emits: ['update:keyword', 'search', 'back'],
    data() {
        return {
            suggestions: [],
            showSuggestions: false,
            debounceTimer: null,
            debounceDelay: 300
        }
    },
    methods: {
        onInput(e) {
            const value = e.detail.value
            this.$emit('update:keyword', value)

            // Clear previous timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer)
            }

            // Hide suggestions if keyword is empty
            if (!value || value.trim().length < 1) {
                this.suggestions = []
                this.showSuggestions = false
                return
            }

            // Debounce the API call
            this.debounceTimer = setTimeout(async () => {
                try {
                    const result = await articleApi.getSearchSuggestions({
                        keyword: value.trim(),
                        limit: 10
                    })
                    if (result && result.code === 0 && result.data) {
                        this.suggestions = result.data
                        this.showSuggestions = true
                    }
                } catch (e) {
                    console.error('获取搜索建议失败:', e)
                    this.suggestions = []
                    this.showSuggestions = false
                }
            }, this.debounceDelay)
        },

        onBlur() {
            // Delay hiding to allow click on suggestion
            setTimeout(() => {
                this.showSuggestions = false
            }, 200)
        },

        selectSuggestion(item) {
            this.$emit('update:keyword', item.keyword)
            this.showSuggestions = false
            this.suggestions = []
            this.$nextTick(() => {
                this.$emit('search')
            })
        },

        getTypeLabel(type) {
            const labels = {
                article: '文章',
                source: '来源',
                tag: '标签'
            }
            return labels[type] || type
        }
    }
}
</script>

<style lang="scss" scoped>
.search-bar {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: #FFFFFF;
    position: relative;
}

.input-wrapper {
    flex: 1;
    position: relative;
}

.search-input {
    width: 100%;
    height: 40px;
    padding: 0 12px;
    background-color: #F7F9FA;
    border-radius: 8px;
    font-size: 14px;
    color: #4A5568;
    box-sizing: border-box;
}

.search-btn {
    margin-left: 12px;
    padding: 0 16px;
    font-size: 14px;
    color: #00D4AA;
}

.suggestions-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background-color: #FFFFFF;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
}

.suggestion-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid #F0F0F0;

    &:last-child {
        border-bottom: none;
    }

    &:active {
        background-color: #F7F9FA;
    }
}

.suggestion-type-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    margin-right: 8px;
    flex-shrink: 0;

    &.article {
        background-color: #E8F5E9;
        color: #2E7D32;
    }

    &.source {
        background-color: #E3F2FD;
        color: #1565C0;
    }

    &.tag {
        background-color: #FFF3E0;
        color: #E65100;
    }
}

.suggestion-text {
    font-size: 14px;
    color: #4A5568;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>

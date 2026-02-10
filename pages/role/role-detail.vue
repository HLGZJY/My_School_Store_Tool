<template>
    <view class="container">
        <view class="header">
            <text class="title">完善信息</text>
            <text class="subtitle">帮助我们更好地为您推荐内容</text>
        </view>

        <view class="form">
            <!-- 学生角色详情 -->
            <view v-if="role === 'student'" class="form-section">
                <view class="form-item">
                    <text class="label">专业</text>
                    <input
                        v-model="form.major"
                        class="input"
                        placeholder="请输入您的专业"
                    />
                </view>
                <view class="form-item">
                    <text class="label">年级</text>
                    <picker mode="selector" :range="grades" @change="onGradeChange">
                        <view class="picker">
                            {{ form.grade || '请选择年级' }}
                            <uni-icons type="arrowdown" size="16" color="#A0AEC0"></uni-icons>
                        </view>
                    </picker>
                </view>
                <view class="form-item">
                    <text class="label">兴趣标签</text>
                    <view class="tag-list">
                        <view
                            v-for="tag in interestTags"
                            :key="tag"
                            class="tag-item"
                            :class="{ selected: form.interests.includes(tag) }"
                            @click="toggleInterest(tag)"
                        >
                            {{ tag }}
                        </view>
                    </view>
                </view>
            </view>

            <!-- 教师角色详情 -->
            <view v-if="role === 'teacher'" class="form-section">
                <view class="form-item">
                    <text class="label">所属院系</text>
                    <input
                        v-model="form.department"
                        class="input"
                        placeholder="请输入您的院系"
                    />
                </view>
                <view class="form-item">
                    <text class="label">职称</text>
                    <picker mode="selector" :range="titles" @change="onTitleChange">
                        <view class="picker">
                            {{ form.title || '请选择职称' }}
                            <uni-icons type="arrowdown" size="16" color="#A0AEC0"></uni-icons>
                        </view>
                    </picker>
                </view>
                <view class="form-item">
                    <text class="label">研究方向</text>
                    <input
                        v-model="form.researchField"
                        class="input"
                        placeholder="请输入您的研究方向"
                    />
                </view>
            </view>

            <!-- 行政人员角色详情 -->
            <view v-if="role === 'admin'" class="form-section">
                <view class="form-item">
                    <text class="label">所属部门</text>
                    <input
                        v-model="form.department"
                        class="input"
                        placeholder="请输入您的部门"
                    />
                </view>
                <view class="form-item">
                    <text class="label">职责范围</text>
                    <textarea
                        v-model="form.duties"
                        class="textarea"
                        placeholder="请输入您的职责范围"
                        maxlength="200"
                    />
                </view>
            </view>
        </view>

        <view class="footer">
            <button class="confirm-btn" :disabled="!isFormValid" @click="confirm">
                完成设置
            </button>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            role: '',
            form: {
                major: '',
                grade: '',
                interests: [],
                department: '',
                title: '',
                researchField: '',
                duties: ''
            },
            grades: ['2021级', '2022级', '2023级', '2024级'],
            titles: ['助教', '讲师', '副教授', '教授'],
            interestTags: ['编程', '人工智能', '考研', '就业', '竞赛', '科研', '实习', '创新创业']
        }
    },
    computed: {
        isFormValid() {
            if (this.role === 'student') {
                return this.form.major && this.form.grade && this.form.interests.length > 0
            }
            if (this.role === 'teacher') {
                return this.form.department && this.form.title
            }
            if (this.role === 'admin') {
                return this.form.department
            }
            return false
        }
    },
    onLoad(options) {
        this.role = options.role || ''
    },
    methods: {
        onGradeChange(e) {
            this.form.grade = this.grades[e.detail.value]
        },

        onTitleChange(e) {
            this.form.title = this.titles[e.detail.value]
        },

        toggleInterest(tag) {
            const index = this.form.interests.indexOf(tag)
            if (index > -1) {
                this.form.interests.splice(index, 1)
            } else {
                this.form.interests.push(tag)
            }
        },

        async confirm() {
            uni.showLoading({ title: '保存中...' })

            try {
                const userId = this.$store.state.user.userId
                const roleDetail = {}

                if (this.role === 'student') {
                    roleDetail.student = {
                        major: this.form.major,
                        grade: this.form.grade,
                        interests: this.form.interests
                    }
                } else if (this.role === 'teacher') {
                    roleDetail.teacher = {
                        department: this.form.department,
                        title: this.form.title,
                        researchField: this.form.researchField
                    }
                } else if (this.role === 'admin') {
                    roleDetail.admin = {
                        department: this.form.department,
                        duties: this.form.duties
                    }
                }

                const res = await uniCloud.callFunction({
                    name: 'setUserRole',
                    data: {
                        userId,
                        role: this.role,
                        roleDetail
                    }
                })

                if (res.result.code === 0) {
                    this.$store.commit('user/setRole', this.role)
                    uni.showToast({
                        title: '设置成功',
                        icon: 'success'
                    })

                    setTimeout(() => {
                        uni.switchTab({
                            url: '/pages/index/index'
                        })
                    }, 1500)
                } else {
                    throw new Error(res.result.message)
                }
            } catch (error) {
                console.error('保存失败:', error)
                uni.showToast({
                    title: '保存失败，请重试',
                    icon: 'none'
                })
            } finally {
                uni.hideLoading()
            }
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
    padding: 40px 20px;
}

.header {
    text-align: center;
    margin-bottom: 40px;

    .title {
        display: block;
        font-size: 24px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 8px;
    }

    .subtitle {
        display: block;
        font-size: 14px;
        color: #A0AEC0;
    }
}

.form-section {
    background-color: #FFFFFF;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 40px;
}

.form-item {
    margin-bottom: 24px;

    &:last-child {
        margin-bottom: 0;
    }

    .label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #0A2540;
        margin-bottom: 8px;
    }
}

.input,
.picker,
.textarea {
    width: 100%;
    height: 48px;
    padding: 12px 16px;
    background-color: #F7F9FA;
    border-radius: 8px;
    font-size: 14px;
    color: #4A5568;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.textarea {
    height: 100px;
    padding-top: 12px;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tag-item {
    padding: 8px 16px;
    background-color: #F7F9FA;
    border-radius: 20px;
    font-size: 14px;
    color: #4A5568;
    transition: all 0.2s ease;

    &.selected {
        background-color: #00D4AA;
        color: #0A2540;
    }
}

.footer {
    .confirm-btn {
        width: 100%;
        height: 48px;
        line-height: 48px;
        background-color: #00D4AA;
        color: #0A2540;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;

        &:disabled {
            opacity: 0.5;
        }

        &::after {
            border: none;
        }
    }
}
</style>

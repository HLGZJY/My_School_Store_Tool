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
                    <text class="label">所在学院</text>
                    <picker mode="selector" :range="colleges" @change="onCollegeChange">
                        <view class="picker">
                            {{ form.college || '请选择所在学院' }}
                            <uni-icons type="arrowdown" size="16" color="#A0AEC0"></uni-icons>
                        </view>
                    </picker>
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
                    <picker mode="selector" :range="departments" @change="onDepartmentChange">
                        <view class="picker">
                            {{ form.department || '请选择院系' }}
                            <uni-icons type="arrowdown" size="16" color="#A0AEC0"></uni-icons>
                        </view>
                    </picker>
                </view>
            </view>

            <!-- 行政人员角色详情 -->
            <view v-if="role === 'admin'" class="form-section">
                <view class="form-item">
                    <text class="label">所属部门</text>
                    <picker mode="selector" :range="adminDepts" @change="onAdminDeptChange">
                        <view class="picker">
                            {{ form.department || '请选择部门' }}
                            <uni-icons type="arrowdown" size="16" color="#A0AEC0"></uni-icons>
                        </view>
                    </picker>
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
                college: '',
                grade: '',
                interests: [],
                department: ''
            },
            grades: ['2021级', '2022级', '2023级', '2024级'],
            colleges: [
                '信息科学技术学院',
                '机械工程学院',
                '经济管理学院',
                '文法学院',
                '外国语学院',
                '艺术学院',
                '理学院',
                '建筑工程学院',
                '材料科学与工程学院',
                '电气工程学院',
                '能源与动力工程学院',
                '化学与环境工程学院',
                '生命科学学院',
                '马克思主义学院',
                '体育学院',
                '继续教育学院'
            ],
            departments: [
                '信息科学技术学院',
                '机械工程学院',
                '经济管理学院',
                '文法学院',
                '外国语学院',
                '艺术学院',
                '理学院',
                '建筑工程学院',
                '材料科学与工程学院',
                '电气工程学院',
                '能源与动力工程学院',
                '化学与环境工程学院',
                '生命科学学院',
                '马克思主义学院',
                '体育学院',
                '继续教育学院'
            ],
            adminDepts: [
                '党委办公室',
                '校长办公室',
                '人事处',
                '教务处',
                '学生工作处',
                '科研处',
                '财务处',
                '后勤管理处',
                '保卫处',
                '组织部',
                '宣传部',
                '统战部',
                '纪委办公室',
                '工会',
                '团委'
            ],
            interestTags: ['编程', '人工智能', '考研', '就业', '竞赛', '科研', '实习', '创新创业']
        }
    },
    computed: {
        isFormValid() {
            if (this.role === 'student') {
                return this.form.college && this.form.grade && this.form.interests.length > 0
            }
            if (this.role === 'teacher') {
                return this.form.department
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
        onCollegeChange(e) {
            this.form.college = this.colleges[e.detail.value]
        },
        onGradeChange(e) {
            this.form.grade = this.grades[e.detail.value]
        },
        onDepartmentChange(e) {
            this.form.department = this.departments[e.detail.value]
        },
        onAdminDeptChange(e) {
            this.form.department = this.adminDepts[e.detail.value]
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
                        college: this.form.college,
                        grade: this.form.grade,
                        interests: this.form.interests
                    }
                } else if (this.role === 'teacher') {
                    roleDetail.teacher = {
                        department: this.form.department
                    }
                } else if (this.role === 'admin') {
                    roleDetail.admin = {
                        department: this.form.department
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
                        uni.navigateBack()
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

<template>
    <view class="container">
        <view class="logo-section">
            <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
            <text class="app-name">校园信息聚合</text>
            <text class="version">版本 {{ version }}</text>
        </view>

        <view class="info-section">
            <view class="info-item">
                <text class="label">开发者</text>
                <text class="value">Your Name</text>
            </view>
            <view class="info-item">
                <text class="label">项目简介</text>
                <text class="value">校园信息聚合小程序，为您提供统一的校园信息获取平台</text>
            </view>
        </view>

        <view class="links-section">
            <view class="link-item" @click="openLink('user-agreement')">
                <text>用户协议</text>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
            <view class="link-item" @click="openLink('privacy-policy')">
                <text>隐私政策</text>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
        </view>

        <view class="footer">
            <text class="copyright">Copyright © 2024 Your Name</text>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            version: '1.0.0'
        }
    },
    onLoad() {
        // #ifdef MP-WEIXIN
        const accountInfo = uni.getAccountInfoSync()
        this.version = accountInfo.miniProgram.version
        // #endif
    },
    methods: {
        openLink(type) {
            let content = ''
            if (type === 'user-agreement') {
                content = '用户协议内容...'
            } else if (type === 'privacy-policy') {
                content = '隐私政策内容...'
            }

            uni.showModal({
                title: type === 'user-agreement' ? '用户协议' : '隐私政策',
                content,
                showCancel: false
            })
        }
    }
}
</script>

<style lang="scss" scoped>
.container {
    min-height: 100vh;
    background-color: #F7F9FA;
}

.logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
    background-color: #FFFFFF;
}

.logo {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    margin-bottom: 16px;
}

.app-name {
    font-size: 20px;
    font-weight: 600;
    color: #0A2540;
    margin-bottom: 8px;
}

.version {
    font-size: 14px;
    color: #A0AEC0;
}

.info-section {
    margin-top: 8px;
    padding: 0 20px;
    background-color: #FFFFFF;
}

.info-item {
    padding: 16px 0;
    border-bottom: 1px solid #E8ECF1;

    &:last-child {
        border-bottom: none;
    }

    .label {
        display: block;
        font-size: 14px;
        color: #A0AEC0;
        margin-bottom: 8px;
    }

    .value {
        display: block;
        font-size: 14px;
        color: #4A5568;
        line-height: 1.6;
    }
}

.links-section {
    margin-top: 8px;
    background-color: #FFFFFF;
}

.link-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #E8ECF1;
    font-size: 14px;
    color: #4A5568;

    &:last-child {
        border-bottom: none;
    }

    &:active {
        background-color: #F7F9FA;
    }
}

.footer {
    padding: 40px 20px;
    text-align: center;

    .copyright {
        font-size: 12px;
        color: #A0AEC0;
    }
}
</style>

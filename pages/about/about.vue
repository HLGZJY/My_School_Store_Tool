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
                <text class="value">创新训练项目-校易通开发团队</text>
            </view>
            <view class="info-item">
                <text class="label">项目简介</text>
                <text class="value">校园信息聚合小程序，为您提供统一的校园信息获取平台</text>
            </view>
            <view class="info-item">
                <text class="label">联系方式</text>
                <text class="value">校易通开发团队</text>
            </view>
        </view>

        <view class="links-section">
            <view class="link-item" @click="openPolicy('user-agreement')">
                <text>用户协议</text>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
            <view class="link-item" @click="openPolicy('privacy-policy')">
                <text>隐私政策</text>
                <uni-icons type="arrowright" size="16" color="#A0AEC0"></uni-icons>
            </view>
        </view>

        <view class="footer">
            <text class="copyright">Copyright © 2026 创新训练项目-校易通开发团队</text>
        </view>
    </view>
</template>

<script>
const USER_AGREEMENT = `用户协议

更新日期：2026年4月13日
生效日期：2026年4月13日

欢迎您使用校易通小程序（以下简称"本程序"）。在您使用本程序之前，请仔细阅读本协议的全部内容。

一、服务说明
1.1 本程序是由创新训练项目-校易通开发团队（以下简称"开发团队"）运营的校园信息聚合平台。
1.2 本程序仅为用户提供校园资讯的聚合、浏览和管理服务，所展示的资讯内容均来源于第三方公开网络渠道。
1.3 开发团队不对资讯内容的真实性、准确性、及时性和完整性做任何承诺和保证。

二、使用规范
2.1 您在使用本程序时，应遵守中华人民共和国相关法律法规，不得利用本程序从事任何违法活动。
2.2 您应妥善保管您的账户信息，因个人保管不善造成的损失由您自行承担。
2.3 您不得对本程序进行任何形式的破解、反编译、逆向工程或擅自修改。
2.4 未经授权，您不得将本程序用于任何商业目的。

三、知识产权
3.1 开发团队对本程序享有完整的知识产权，包括但不限于程序代码、界面设计等。
3.2 本程序中展示的第三方资讯内容，其知识产权归相应权利人所有，开发团队不承担知识产权责任。
3.3 您在本程序中上传、提交的内容（如收藏夹名称等），知识产权归您所有。

四、免责声明
4.1 本程序仅为技术学习项目，提供的资讯内容均来自公开网络渠道，开发团队无法控制也无法保证信息来源的真实性、合法性和时效性。
4.2 因资讯内容导致的任何争议、损失或纠纷，开发团队不承担任何责任。
4.3 因不可抗力、第三方原因或您自身原因导致的损失，开发团队不承担责任。
4.4 开发团队有权随时修改、中断或终止本程序的全部或部分功能，无需事先通知。

五、服务变更
5.1 开发团队保留随时修改本协议的权利。修改后的协议一旦公布即生效，请您在使用前仔细阅读。
5.2 如您不同意修改后的协议，有权停止使用本程序。

六、争议解决
6.1 本协议的订立、执行和解释均适用中华人民共和国法律。
6.2 因本协议引起的或与本协议有关的任何争议，双方应协商解决；协商不成的，任一方可向被告所在地人民法院提起诉讼。

七、联系我们
如您对本协议有任何疑问，请通过以下方式联系我们：
联系主体：创新训练项目-校易通开发团队
联系邮箱：校易通开发团队

点击"同意"或继续使用本程序，视为您已阅读并接受本协议的全部内容。`;

const PRIVACY_POLICY = `隐私政策

更新日期：2026年4月13日
生效日期：2026年4月13日

创新训练项目-校易通开发团队（以下简称"我们"）非常重视您的个人信息安全。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。

请您在使用本程序前，仔细阅读并了解本隐私政策的全部内容。

一、信息收集
1.1 本程序为校园信息聚合工具，在您主动授权的情况下，我们会收集以下信息：

（1）微信授权信息：当您使用微信账号登录时，我们会获取您的微信昵称、头像等基本信息。
（2）收藏记录：您主动收藏的文章和来源信息。
（3）浏览历史：您浏览过的文章记录，用于为您提供历史记录功能。
（4）设备信息：设备型号、操作系统版本等基本信息，用于优化服务稳定性。
（5）使用数据：功能使用情况、访问频率等统计数据，用于改善用户体验。

1.2 本程序不会收集您的位置信息、通讯录、短信等敏感个人信息。

二、信息使用
2.1 我们收集您的信息仅用于以下目的：
（1）提供、维护和改进本程序的服务；
（2）响应您的操作请求，如收藏/取消收藏文章；
（3）向您推送您订阅的校园资讯来源更新；
（4）进行匿名化的统计分析，用于改善产品体验。

2.2 除法律要求外，我们不会将您的个人信息用于营销推广目的。

三、信息存储
3.1 您的个人信息存储在微信云开发的数据库中。
3.2 我们仅为实现服务目的保留您的个人信息：
（1）账号信息：保留至您注销账号之日；
（2）收藏记录：保留至您主动删除或注销账号之日；
（3）浏览历史：保留30天，超期自动清理。
3.3 超出保留期限后，我们将对您的数据进行删除或匿名化处理。

四、信息共享
4.1 除以下情况外，我们不会与任何第三方共享您的个人信息：
（1）获得您的明确同意；
（2）法律法规要求必须提供；
（3）为保护开发团队或用户的合法权益所必需。

4.2 本程序不向任何第三方广告平台提供用户数据。

五、信息安全
5.1 我们采取了合理的安全技术措施来保护您的个人信息，防止数据遭到未经授权的访问、使用、修改或销毁。
5.2 请您注意，互联网环境存在固有安全风险，我们无法完全保证信息传输的绝对安全。

六、您的权利
6.1 您有权随时查看、导出您的个人数据（收藏记录等）。
6.2 您有权随时删除您的收藏记录或注销账号。
6.3 注销账号后，您的个人信息将被删除或匿名化处理（法律法规另有规定的除外）。

七、未成年人保护
7.1 本程序主要面向在校师生。如您为未满18周岁的未成年人，请在监护人的陪同下阅读本政策，并在取得监护人的同意后使用本程序。

八、隐私政策更新
8.1 我们可能会不时更新本隐私政策。更新后，我们会在本程序内显著位置提示您，修订内容自公布之日起生效。
8.2 如您不同意更新后的隐私政策，您有权停止使用本程序。

九、联系我们
如您对本隐私政策有任何疑问、意见或建议，请通过以下方式联系我们：
联系主体：创新训练项目-校易通开发团队
联系邮箱：校易通开发团队

我们将尽快在15个工作日内回复您的请求。

感谢您阅读本隐私政策，我们将一如既往地保护您的个人信息安全。`;

export default {
    data() {
        return {
            version: '1.0.0'
        }
    },
    onLoad() {
        // #ifdef MP-WEIXIN
        const accountInfo = uni.getAccountInfoSync()
        this.version = accountInfo.miniProgram.version || '1.0.0'
        // #endif
    },
    methods: {
        openPolicy(type) {
            const content = type === 'user-agreement' ? USER_AGREEMENT : PRIVACY_POLICY
            const title = type === 'user-agreement' ? '用户协议' : '隐私政策'

            // 使用 scroll-view 实现可滚动的内容展示
            uni.navigateTo({
                url: `/pages/about/policy?type=${type}&title=${encodeURIComponent(title)}`
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

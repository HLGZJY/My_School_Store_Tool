/**
 * 环境配置
 */

// 云开发环境
export const CLOUD_ENV = 'production'

// Moonshot API配置
export const MOONSHOT_CONFIG = {
    // API密钥，需要在云开发控制台配置环境变量
    apiKey: process.env.MOONSHOT_API_KEY || '',
    // 模型名称
    model: 'moonshot-v1-8k',
    // API基础URL
    baseURL: 'https://api.moonshot.cn/v1'
}

// 小程序配置
// 注意：AppSecret 属于敏感信息，应通过云函数环境变量 / uni-config-center 配置，切勿提交到代码仓库
export const MP_CONFIG = {
    // AppID（实际以 manifest.json 配置为准）
    appId: '',
    // AppSecret（占位，正式环境从环境变量读取）
    appSecret: ''
}

// 分享配置
export const SHARE_CONFIG = {
    title: '校园信息聚合',
    path: '/pages/index/index',
    imageUrl: '/static/logo.png'
}

// 其他配置
export const APP_CONFIG = {
    // 每页文章数量
    pageSize: 15,
    // 阅读历史最大保存数
    historyMaxCount: 50,
    // 搜索历史最大保存数
    searchHistoryMaxCount: 10,
    // 标签云最大数量
    tagCloudMaxCount: 20,
    // 热门排行最大数量
    hotRankingMaxCount: 20
}

# 校园信息聚合小程序

> 统一访问校园信息，智能推荐相关内容

## 项目简介

校园信息分散在教务处官网、图书馆官网、各类公众号等多个渠道，学生和教职工需要逐个查看，效率低下。本小程序通过聚合这些信息，提供统一的访问入口，并根据用户角色智能推荐相关内容，提升信息获取效率。

## 技术栈

- **前端框架**：uni-app (Vue3)
- **UI组件库**：uni-ui
- **状态管理**：Vuex
- **后端服务**：DCloud云开发
- **AI服务**：Moonshot API

## 项目结构

```
My_School_Store_Tool/
├── docs/                    # 项目文档
├── pages/                    # 页面
│   ├── index/               # 首页
│   ├── discover/             # 发现页
│   ├── mine/                # 我的页面
│   ├── detail/              # 详情页
│   ├── role/                # 角色选择
│   ├── collection/          # 收藏页
│   ├── history/             # 阅读历史
│   ├── message/             # 消息通知
│   ├── settings/            # 设置
│   ├── subscribe/           # 订阅管理
│   ├── about/               # 关于
│   ├── login/               # 登录页
│   └── search/              # 搜索页
├── components/              # 公共组件
├── store/                   # 状态管理
├── utils/                   # 工具函数
├── api/                     # API接口
├── static/                  # 静态资源
├── styles/                  # 样式文件
├── config/                  # 配置文件
├── App.vue                 # 应用入口
├── main.js                 # 主入口
├── pages.json              # 页面配置
└── manifest.json          # 应用配置
```

## 功能特性

### 用户功能
- 微信一键登录
- 角色选择（学生/教师/行政人员）
- 个性化信息推荐
- 文章搜索
- 收藏管理
- 阅读历史
- 订阅管理

### 内容展示
- 分类浏览（通知公告/学术动态/社团活动/生活服务）
- 智能推荐
- 热门排行
- 标签云
- 时间轴

### 其他
- 消息通知
- 设置管理
- 深色模式（预留）

## 开发指南

### 环境要求
- HBuilderX 3.8.0+
- Node.js 16.0+
- 微信开发者工具

### 快速开始

1. 克隆项目
```bash
git clone <repository-url>
cd My_School_Store_Tool
```

2. 安装依赖
```bash
npm install
```

3. 配置云开发
- 在HBuilderX中右键项目，选择"云服务空间"
- 关联或创建云服务空间

4. 配置环境变量
在云开发控制台配置：
```
MOONSHOT_API_KEY=your-api-key
JWT_SECRET=your-secret
```

5. 运行项目
```bash
# 在HBuilderX中运行到小程序模拟器
运行 -> 运行到小程序模拟器 -> 微信开发者工具
```

### 页面路由

| 页面 | 路径 | 说明 |
|-----|------|------|
| 首页 | /pages/index/index | 信息流展示 |
| 发现 | /pages/discover/discover | 热门排行、标签云、时间轴 |
| 我的 | /pages/mine/mine | 个人中心 |
| 详情 | /pages/detail/detail | 文章详情 |
| 角色选择 | /pages/role/role | 选择用户角色 |
| 完善信息 | /pages/role/role-detail | 填写角色详情 |
| 收藏 | /pages/collection/collection | 我的收藏 |
| 历史记录 | /pages/history/history | 阅读历史 |
| 消息 | /pages/message/message | 消息通知 |
| 设置 | /pages/settings/settings | 应用设置 |
| 订阅管理 | /pages/subscribe/subscribe | 管理订阅源 |
| 关于 | /pages/about/about | 关于页面 |
| 登录 | /pages/login/login | 用户登录 |
| 搜索 | /pages/search/search | 搜索页面 |

## 开发规范

### 命名规范
- 文件名：kebab-case
- 组件名：PascalCase
- 变量名：camelCase
- 常量名：UPPER_SNAKE_CASE

### 代码风格
- 使用ESLint推荐的代码风格
- 组件采用单文件组件（SFC）
- 样式使用SCSS

### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

## 部署说明

### 小程序发布
1. 代码审核
2. 上传代码
3. 提交审核
4. 审核通过后发布

### 云函数部署
在HBuilderX中右键云函数 -> 上传部署

## 相关文档

- [完整需求文档](../完整需求文档.md)
- [数据库设计文档](../数据库设计文档.md)
- [API接口文档](../API接口文档.md)
- [云函数设计文档](../云函数设计文档.md)
- [总体开发文档](../总体开发文档.md)

## 常见问题

### Q: 个人备案小程序能否使用微信登录？
A: 可以。个人备案小程序支持使用 wx.login 和 getUserProfile 进行用户身份验证。

### Q: 个人备案小程序能否使用消息推送？
A: 不能。个人备案小程序不支持模板消息和订阅消息的主动推送。本项目采用"我的-消息"页面，用户主动查看更新。

### Q: 数据采集是否合规？
A: 本项目使用公开RSS源或手动录入作为数据来源，符合个人备案小程序的合规要求。

## 许可证

MIT

## 联系方式

如有问题，请联系项目维护者。

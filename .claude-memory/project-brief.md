# 项目概述

**名称**: 校园信息聚合小程序
**技术栈**: uni-app (Vue3) + DCloud云开发 (uniCloud-aliyun) + MongoDB
**备案**: 个人备案（仅支持微信登录）

## 核心功能进度

| 功能 | 状态 | 开发记录 |
|-----|------|---------|
| 登录功能 | ✅ 完成 | `docs/留痕/登录功能开发记录.md` |
| 角色选择 | ✅ 完成 | 同上 |
| 首页信息流 | ✅ 完成 | `docs/留痕/首页信息流开发记录.md` |
| 发现页 | ✅ 完成 | `docs/留痕/发现页开发记录.md` |
| 搜索功能 | ✅ 完成 | `docs/留痕/搜索功能开发记录.md` |
| 详情页 | ✅ 完成 | `docs/留痕/详情页开发记录.md` |
| 收藏功能 | ✅ 完成 | - |
| 阅读历史 | ✅ 完成 | - |
| 消息通知 | ✅ 完成 | - |
| 个人中心 | ✅ 完成 | `docs/留痕/我的页面开发记录.md` |
| 管理员功能 | 🔄 开发中 | `docs/留痕/2026-02-13-管理员功能开发.md` |
| 微信文章采集 | 📋 待开发 | 本文档下一节 |

## 技术要点

### 微信登录
- `context.OPENID` 获取用户标识（正式环境）
- `jscode2session` API 换取 openid（本地调试）
- AppID: `wx21bdaa579562ec11`
- AppSecret: 详见 `manifest.json`

### 用户角色
- `student` - 在校学生（专业、年级、兴趣标签）
- `teacher` - 教师（院系、职称、研究方向）
- `admin` - 行政人员（部门、职责范围）

### 云函数结构
```
uniCloud-aliyun/cloudfunctions/
├── login/           # 登录
├── setUserRole/    # 设置角色
└── initDatabase/   # 数据库初始化
```

## 开发规范

1. 每次新功能开发后在 `docs/留痕/` 创建 `[功能]开发记录.md`
2. 云函数结构：`index.js` + `package.json`
3. 个人备案限制：仅支持微信登录，禁止手机号、邮箱、支付功能

## 数据库集合

- `users` - 用户表（openid 唯一索引）
- `operation_logs` - 操作日志（action: login/set_role）
- `articles` - 文章表
- `collections` - 收藏表
- `readHistory` - 阅读历史表
- `searchHistory` - 搜索历史表
- `messages` - 消息通知表
- `sources` - 数据源表
- `subscriptions` - 订阅表

## 开发记录文档

| 功能 | 文档 |
|-----|------|
| 登录功能 | `docs/留痕/登录功能开发记录.md` |
| 首页信息流 | `docs/留痕/首页信息流开发记录.md` |
| 发现页 | `docs/留痕/发现页开发记录.md` |
| 搜索功能 | `docs/留痕/搜索功能开发记录.md` |
| 详情页 | `docs/留痕/详情页开发记录.md` |
| 我的页面 | `docs/留痕/我的页面开发记录.md` |
| 收藏功能 | `docs/留痕/收藏功能开发记录.md` |
| 阅读历史 | `docs/留痕/阅读历史开发记录.md` |
| 消息通知 | `docs/留痕/消息通知开发记录.md` |
| 管理员功能 | `docs/留痕/2026-02-13-管理员功能开发记录.md` |
| 微信文章采集 | `.claude-memory/微信文章采集服务.md` |

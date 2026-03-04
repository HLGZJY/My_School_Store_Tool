# simpleFetch 云函数

URL 抓取云函数，用于从学校网站抓取文章列表。

## 功能

| 模式 | 说明 |
|-----|------|
| `simple` | 简单 HTTP 请求，获取网页内容 |
| `kimi` | 使用 Kimi fetch 工具获取内容 |
| `list` | 列表页抓取：提取链接 + 分页遍历 + AI 解析 + 数据库保存 |

### 预期实现功能描述

- 首次抓取该网址，就抓取全部的文章链接，再用 kimifetch 处理单篇文章
- 其次还有文章处理存储，联动数据源板块，新增该数据源并加上对应的描述
- 之后，设置定时触发就只查看首页（原链接的文章）对比查看是否有更新

---

## 使用方法

```js
// 前端调用
uniCloud.callFunction({
  name: 'simpleFetch',
  data: {
    url: 'https://www.scuec.edu.cn/cxcy/scss/jstz.htm',
    mode: 'list',
    action: 'full',     // full: 首次抓取全部 | update: 检查更新
    limit: 50,         // 处理前N条（默认50）
    maxPages: 10,      // 最大分页数（默认10）
    sourceName: '创新创业学院-竞赛动态',
    sourceDesc: '创新创业学院竞赛通知动态'
  },
  timeout: 300000
})
```

## 参数说明

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| url | string | 是 | 目标 URL |
| mode | string | 否 | 模式：simple/kimi/list，默认 list |
| action | string | 否 | full: 首次抓取全部；update: 检查更新，默认 full |
| limit | number | 否 | 处理文章数量上限，默认 50 |
| maxPages | number | 否 | 最大分页数，默认 10 |
| sourceName | string | 否 | 数据源名称（首次抓取时使用） |
| sourceDesc | string | 否 | 数据源描述 |
| openid | string | 是 | 用户 openid |

## 返回结果

```js
{
  code: 0,
  data: {
    listUrl: '原始URL',
    action: 'full',
    sourceId: '数据源ID',  // 首次抓取时返回
    totalFound: 103,      // 总共找到的链接数
    processed: 50,        // 实际处理的条数
    newArticles: 45,      // 新增文章数
    existingArticles: 5,  // 已存在文章数
    results: [
      { url: '...', status: 'saved', title: '文章标题' },
      { url: '...', status: 'exists', title: '...' },
      { url: '...', status: 'fetch_failed', error: '错误信息' }
    ]
  }
}
```

---

## 实现逻辑

### list 模式流程

1. **提取当前页链接** - HTTP 获取页面，正则提取 `text为空 + .htm` 的链接
2. **检测分页** - 尝试访问 `当前URL/1.htm`，存在则继续遍历
3. **遍历分页** - 从第2页开始递增，遇到 404 停止
4. **过滤非文章链接** - 排除 index.htm、jczc.htm、list.htm 等
5. **处理文章** - 取前 N 条，获取详情页内容
6. **AI 解析** - 调用 Kimi Chat API 提取标题、时间、内容等
7. **保存入库** - 存入 articles 集合（查重）
8. **创建数据源** - 首次抓取时存入 sources 集合

### 链接过滤规则

**目标链接**：`text 为空 + href 包含 .htm`

**排除链接**：
- 导航类：首页、关于、概况、党建、联系、返回、更多、详细
- 页面类：`index.htm`、`jstz.htm`、`jczc.htm`、`list.htm`
- 分页类：包含 `/p/`、`/list`、`/page` 的链接

---

## 开发计划

### 阶段一：修复问题（高优先级）

- [ ] 1. 优化链接过滤 - 排除 index.htm、jczc.htm、list.htm 等非文章链接
- [ ] 2. 排除包含 /p/、/list、/page 的分页链接
- [ ] 3. 修复 AI 解析/保存未执行问题（日志显示未调用）
- [ ] 4. 优化超时处理，每个文章处理增加重试机制

### 阶段二：核心功能（高优先级）

- [ ] 1. **数据源联动**
  - 首次抓取时，在 `sources` 集合创建数据源记录
  - 记录字段：名称、URL、描述、创建时间、操作人

- [ ] 2. **两种状态区分**
  - `action: 'full'` - 首次抓取全部文章
  - `action: 'update'` - 检查更新，只抓首页新增文章

### 阶段三：定时触发（中优先级）

- [ ] 1. **定时任务**
  - 只抓取首页链接
  - 与数据库比对，找出新增链接
  - 只处理新增文章，自动入库

---

## 现有状态

| 功能 | 代码实现 | 状态 |
|-----|---------|------|
| 提取链接 | ✅ `extractLinks` | 正常，需优化过滤 |
| 分页遍历 | ✅ 循环获取 | 正常 |
| AI 解析 | ✅ `aiParse` | 未执行（日志无显示） |
| 保存入库 | ✅ `saveArticle` | 未执行（日志无显示） |
| 数据源联动 | ❌ 未实现 | 待开发 |
| 两种状态 | ❌ 未实现 | 待开发 |

---

## 配置

在 `config.json` 中配置 Kimi API Key：

```json
{
  "moonshot": {
    "apiKey": "your-api-key"
  }
}
```

## 超时设置

- HTTP 请求：5 分钟
- Kimi API：1 分钟
- 云函数总超时：5 分钟（需在 package.json 配置 `timeoutSeconds: 300`）

---

## 已知问题

1. [X] 提取了一些非文章链接（index.htm、jczc.htm、list.htm），需过滤
2. [ ] AI 解析和保存未执行，需排查原因
3. [ ] 文章处理耗时长，需优化或增加进度提示
4. [ ] 首次抓取和更新抓取的状态区分未实现

---

## 开发记录

- 2026-02-20: 初始版本
- 2026-03-03: 支持分页自动遍历
- 2026-03-03: 优化链接过滤逻辑

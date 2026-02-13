# 校园信息聚合小程序 - API接口文档

> **文档版本**：v1.1
> **更新日期**：2026-02-13
> **变更说明**：用户标识体系重构，openid 作为统一用户标识

---

## 接口概览

本文档描述小程序前端调用的云函数接口，以及云函数之间的内部接口。

---

## 一、用户相关接口

### 1.1 用户登录

**云函数**：`login`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    code: "微信登录code",
    userInfo: {
        nickName: "用户昵称",
        avatarUrl: "头像URL"
    }
}
```

**返回结果**：
```javascript
{
    code: 0,                    // 0表示成功
    message: "登录成功",
    data: {
        userId: "用户ID（v1.1+ 等于 openid）",
        openid: "微信OpenID",
        token: "访问令牌",
        isNewUser: false,       // 是否新用户
        hasRole: false,          // 是否已选择角色
        userInfo: {              // 用户信息
            _id: "用户ID（等于 openid）",
            nickname: "昵称",
            avatar: "头像URL",
            role: "student/teacher/admin/null"
        }
    }
}
```

**版本差异（v1.1）**：
| 字段 | v1.0 | v1.1 |
|-----|------|------|
| userId | 自动生成的 ObjectId | openid（与 _id 相同） |
| 返回结构 | 直接返回 role | 返回完整的 userInfo 对象 |

**错误码**：
| 错误码 | 说明 |
|-------|------|
| 1001 | 微信登录失败 |
| 1002 | 获取用户信息失败 |
| 1003 | 服务器错误 |

---

### 1.2 获取用户信息

**云函数**：`getUserInfo`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid 作为用户标识
    openid: "微信OpenID"
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        _id: "用户ID（等于 openid）",
        openid: "微信OpenID",
        nickname: "昵称",
        avatar: "头像URL",
        role: "student",
        roleDetail: {
            // 角色详情
        },
        settings: {
            fontSize: "medium",
            darkMode: false
        },
        stats: {
            readCount: 128,
            collectCount: 45,
            searchCount: 0
        },
        subscribeSources: ["source_id_1", "source_id_2"],
        createTime: 1707456000000,
        lastLoginTime: 1707542400000
    }
}
```

**版本差异（v1.1）**：
| 字段 | v1.0 | v1.1 |
|-----|------|------|
| 请求参数 | userId | openid |
| 返回 _id | ObjectId | openid |

---

### 1.3 设置用户角色

**云函数**：`setUserRole`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid 作为用户标识
    openid: "微信OpenID",
    role: "student",
    roleDetail: {
        // v1.1 简化版：
        // 学生：{ academy: "学院", grade: "年级", interests: ["标签"] }
        // 教师：{ academy: "院系", title: "职称" }
        // 行政：{ department: "部门" }
    }
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "角色设置成功"
}
```

**版本差异（v1.1）**：
| 字段 | v1.0 | v1.1 |
|-----|------|------|
| 请求参数 | userId | openid |
| roleDetail | 包含专业、职称、研究方向等 | 简化为学院/部门选择 |

---

### 1.4 更新用户设置

**云函数**：`updateUserSettings`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    userId: "用户ID",
    settings: {
        fontSize: "large",
        darkMode: false
    }
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "设置更新成功"
}
```

---

### 1.5 切换订阅源

**云函数**：`toggleSubscribe`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    userId: "用户ID",
    sourceId: "数据源ID",
    action: "subscribe/unsubscribe"  // 订阅/取消订阅
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "订阅操作成功",
    data: {
        subscribed: true,
        sourceName: "教务处"
    }
}
```

---

## 二、文章相关接口

### 2.1 获取文章列表

**云函数**：`getArticles`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    openid: "用户OpenID（可选，未登录为null）",
    category: "notice",           // 分类，可选
    sourceId: "来源ID",           // 来源筛选（v1.1新增）
    tag: "标签",                  // 标签筛选（v1.1新增）
    startDate: 0,                // 开始时间戳（v1.1新增）
    endDate: 0,                  // 结束时间戳（v1.1新增）
    page: 1,
    pageSize: 10,                 // 默认10条（v1.1调整）
    refresh: false
}
```

**版本差异（v1.1）**：
| 参数 | v1.0 | v1.1 |
|-----|------|------|
| userId | userId | openid |
| pageSize | 15 | 10 |
| 筛选条件 | 仅分类 | 来源/标签/时间范围 |

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        articles: [
            {
                _id: "文章ID",
                title: "文章标题",
                summary: "摘要",
                category: "notice",
                tags: {
                    source: ["教务处"],
                    role: ["本科生"],
                    custom: ["考试"]
                },
                urgency: "high",
                urgentTag: "置顶24小时",
                sourceName: "教务处",
                publishTime: 1707456000000,
                stats: {
                    viewCount: 1234,
                    collectCount: 56
                },
                isCollected: false       // 当前用户是否已收藏
            }
        ],
        hasMore: true,
        total: 256
    },
    recommended: [    // 猜你需要推荐（仅首页第一页返回）
        {
            _id: "文章ID",
            title: "推荐文章",
            // ...
        }
    ]
}
```

---

### 2.2 获取文章详情

**云函数**：`getArticleDetail`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    articleId: "文章ID",
    userId: "用户ID（可选）"
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        _id: "文章ID",
        title: "文章标题",
        content: "<p>正文HTML</p>",
        summary: "AI摘要",
        category: "notice",
        tags: {
            source: ["教务处"],
            role: ["本科生"],
            custom: ["考试"]
        },
        urgency: "high",
        urgentTag: "置顶24小时",
        sourceId: "source_id",
        sourceName: "教务处",
        author: "教务处",
        originalUrl: "https://example.edu.cn/notice/123",
        publishTime: 1707456000000,
        stats: {
            viewCount: 1234,
            collectCount: 56,
            shareCount: 12
        },
        isCollected: false,       // 当前用户是否已收藏
        relatedArticles: [        // 相关推荐
            {
                _id: "文章ID",
                title: "相关文章",
                // ...
            }
        ]
    }
}
```

---

### 2.3 搜索文章

**云函数**：`searchArticles`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    userId: "用户ID（可选）",
    keyword: "考试",
    page: 1,
    pageSize: 20,
    filters: {
        category: "notice",       // 可选分类筛选
        source: "教务处",         // 可选来源筛选
        timeRange: "week"         // 可选时间范围：week/month/all
    }
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        articles: [
            {
                _id: "文章ID",
                title: "关于期末<span class='highlight'>考试</span>的通知",
                summary: "摘要...",
                // ...
            }
        ],
        hasMore: false,
        total: 5,
        searchTime: 123  // 搜索耗时（毫秒）
    },
    hotKeywords: [      // 热门搜索词
        "期末考试",
        "讲座",
        "图书馆"
    ]
}
```

---

### 2.4 记录阅读

**云函数**：`recordRead`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    userId: "用户ID",
    articleId: "文章ID",
    duration: 30    // 阅读时长（秒）
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "阅读记录成功"
}
```

---

## 三、收藏相关接口

### 3.1 收藏文章

**云函数**：`collectArticle`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID",
    articleId: "文章ID",
    action: "collect/uncollect"  // 收藏/取消收藏
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "收藏成功",
    data: {
        collected: true,
        collectCount: 57     // 文章当前收藏数
    }
}
```

**版本差异（v1.1）**：请求参数 userId → openid

---

### 3.2 获取收藏列表

**云函数**：`getCollections`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID",
    page: 1,
    pageSize: 20,
    category: "notice",      // 可选分类筛选
    keyword: "考试"          // 可选关键词搜索
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        collections: [
            {
                _id: "收藏ID",
                articleId: "文章ID",
                article: {
                    title: "文章标题",
                    summary: "摘要",
                    category: "notice",
                    sourceName: "教务处"
                },
                collectTime: 1707542400000
            }
        ],
        hasMore: true,
        total: 28
    }
}
```

---

### 3.3 批量取消收藏

**云函数**：`batchUncollect`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID",
    articleIds: [
        "article_id_1",
        "article_id_2"
    ]
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "取消收藏成功",
    data: {
        count: 2    // 取消数量
    }
}
```

**版本差异（v1.1）**：请求参数 userId → openid

---

## 四、阅读历史接口

### 4.1 获取阅读历史

**云函数**：`getReadingHistory`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID",
    page: 1,
    pageSize: 20
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        history: [
            {
                _id: "历史ID",
                articleId: "文章ID",
                article: {
                    title: "文章标题",
                    category: "notice",
                    sourceName: "教务处"
                },
                readTime: 1707542400000,
                duration: 45
            }
        ],
        hasMore: true,
        total: 50
    }
}
```

**版本差异（v1.1）**：请求参数 userId → openid；readDuration → duration

---

### 4.2 清空阅读历史

**云函数**：`clearReadingHistory`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID"
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "阅读历史已清空",
    data: {
        count: 50    // 清空数量
    }
}
```

---

### 4.3 记录阅读

**云函数**：`recordRead`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID",
    articleId: "文章ID",
    duration: 30    // 阅读时长（秒）
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "阅读记录成功"
}
```

**功能说明**：进入详情页时自动调用，记录阅读历史并更新用户阅读统计。

---

## 五、消息相关接口

### 5.1 获取消息列表

**云函数**：`getMessages`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID",
    type: "all",    // all/unread/system
    page: 1,
    pageSize: 20
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        messages: [
            {
                _id: "消息ID",
                type: "system/activity/update",
                title: "订阅源更新",
                content: "订阅源「教务处」更新了5篇内容",
                link: "pages/discover/discover",
                isRead: false,
                createTime: 1707542400000
            }
        ],
        hasMore: true,
        total: 15,
        unreadCount: 3
    }
}
```

**版本差异（v1.1）**：请求参数 userId → openid

---

### 5.2 标记消息已读

**云函数**：`markMessageRead`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID",
    messageId: "消息ID",   // 单条标记
    // 或
    all: true               // 全部标记
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "消息已标记为已读"
}
```

---

## 六、发现页接口

### 6.1 获取热门排行

**云函数**：`getHotArticles`（v1.1新增）

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    limit: 20    // 返回数量
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        ranking: [
            {
                _id: "文章ID",
                title: "文章标题",
                summary: "摘要",
                category: "notice",
                stats: {
                    viewCount: 1234,
                    collectCount: 56,
                    shareCount: 12
                },
                publishTime: 1707456000000
            }
        ]
    }
}
```

**说明**：按7天浏览量降序排列。

---

### 6.2 获取标签云

**云函数**：`getTagCloud`（v1.1新增）

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    limit: 50
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        tags: [
            {
                name: "考试",
                count: 156,
                weight: 1.0    // 权重（用于字号）
            },
            {
                name: "讲座",
                count: 98,
                weight: 0.6
            }
        ]
    }
}
```

---

### 6.3 获取时间轴

**云函数**：`getTimeline`（v1.1新增）

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    startDate: 1707000000000,    // 可选起始日期
    endDate: 1707696000000       // 可选结束日期
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        timeline: [
            {
                date: "2024-02-09",
                timestamp: 1707456000000,
                count: 12,
                expanded: false,
                articles: []
            }
        ]
    }
}
```

---

### 6.4 获取订阅源列表

**云函数**：`getSubscribeSources`（v1.1新增）

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    openid: "微信OpenID"
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        subscribed: [
            {
                _id: "source_id",
                name: "教务处",
                description: "教务处官网通知",
                type: "rss",
                stats: {
                    totalArticles: 156
                }
            }
        ],
        recommended: [
            {
                _id: "source_id_2",
                name: "图书馆",
                description: "图书馆官方信息",
                type: "rss"
            }
        ]
    }
}
```

---

## 七、搜索相关接口

### 7.1 搜索文章

**云函数**：`searchArticles`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    // v1.1+ 使用 openid
    openid: "微信OpenID（可选）",
    keyword: "考试",
    page: 1,
    pageSize: 20,
    filters: {
        category: "notice",       // 可选分类筛选
        source: "教务处",         // 可选来源筛选
        tag: "考试",              // 可选标签筛选（v1.1新增）
        timeRange: "week"         // 可选时间范围
    }
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        articles: [
            {
                _id: "文章ID",
                title: "关于期末<span class='highlight'>考试</span>的通知",
                summary: "摘要...",
                category: "notice",
                sourceName: "教务处",
                publishTime: 1707456000000
            }
        ],
        hasMore: false,
        total: 5,
        searchTime: 123
    },
    hotKeywords: [
        "期末考试",
        "讲座",
        "图书馆"
    ]
}
```

**说明**：
- v1.1 移除7天时间限制，显示所有匹配文章
- 关键词高亮使用 `<span class='highlight'>` 标签

---

### 7.2 获取热门搜索

**云函数**：`getHotKeywords`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    limit: 10    // 返回数量
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        keywords: [
            { keyword: "期末考试", count: 156 },
            { keyword: "讲座", count: 98 }
        ]
    }
}
```

---

### 7.3 上报搜索记录

**云函数**：`reportSearch`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    openid: "微信OpenID（可选）",
    keyword: "考试",
    resultCount: 25
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "上报成功"
}
```

---

## 八、附录：用户标识版本说明

### 6.1 获取热门排行

**云函数**：`getHotRanking`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    type: "view",   // view/collect/share
    days: 7,        // 天数
    limit: 20
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        ranking: [
            {
                _id: "文章ID",
                title: "文章标题",
                summary: "摘要",
                category: "notice",
                rank: 1,
                count: 1234    // 阅读量/收藏量/分享量
            }
        ]
    }
}
```

---

### 6.2 获取标签云

**云函数**：`getTagCloud`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    limit: 50
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        tags: [
            {
                name: "考试",
                count: 156,
                weight: 1.0    // 权重（用于字号）
            },
            {
                name: "讲座",
                count: 98,
                weight: 0.6
            }
        ]
    }
}
```

---

### 6.3 获取时间轴

**云函数**：`getTimeline`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    userId: "用户ID（可选，用于个性化）",
    startDate: 1707000000000,    // 可选起始日期
    endDate: 1707696000000       // 可选结束日期
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        timeline: [
            {
                date: "2024-02-09",
                timestamp: 1707456000000,
                count: 12,
                expanded: false,   // 是否展开
                articles: []       // 展开时返回文章列表
            },
            {
                date: "2024-02-08",
                timestamp: 1707369600000,
                count: 8,
                expanded: false,
                articles: []
            }
        ]
    }
}
```

---

### 6.4 获取订阅源列表

**云函数**：`getSubscribeSources`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    userId: "用户ID"
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        subscribed: [    // 已订阅
            {
                _id: "source_id",
                name: "教务处",
                description: "教务处官网通知",
                type: "rss",
                stats: {
                    totalArticles: 156
                }
            }
        ],
        recommended: [    // 系统推荐
            {
                _id: "source_id_2",
                name: "图书馆",
                description: "图书馆官方信息",
                type: "rss"
            }
        ]
    }
}
```

---

## 七、系统相关接口

### 7.1 获取系统配置

**云函数**：`getSystemConfig`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    keys: ["hot_search_limit", "article_page_size"]  // 可选，不传返回全部
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        hot_search_limit: 20,
        article_page_size: 15,
        history_max_count: 50
    }
}
```

---

### 7.2 上报搜索记录

**云函数**：`reportSearch`

**请求方式**：云函数调用

**请求参数**：
```javascript
{
    userId: "用户ID（可选）",
    keyword: "考试",
    resultCount: 25
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "上报成功"
}
```

---

## 八、管理端接口（云函数内部调用）

### 8.1 数据同步

**云函数**：`syncData`

**调用方式**：定时任务触发

**请求参数**：
```javascript
{
    sourceId: "数据源ID（可选，不传则同步全部）"
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "同步完成",
    data: {
        totalSources: 5,
        successSources: 4,
        failedSources: 1,
        totalArticles: 25,
        newArticles: 20,
        updatedArticles: 5
    }
}
```

---

### 8.2 AI处理文章

**云函数**：`processArticle`

**调用方式**：数据同步后触发

**请求参数**：
```javascript
{
    articleId: "文章ID",
    rawData: {
        title: "原标题",
        content: "原始内容",
        url: "原文链接"
    }
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "AI处理完成",
    data: {
        articleId: "文章ID",
        confidence: 95,
        processedData: {
            title: "处理后的标题",
            content: "处理后的内容",
            summary: "摘要",
            tags: ["标签1", "标签2"],
            category: "notice",
            urgency: "medium"
        },
        needsReview: false
    }
}
```

---

### 8.3 获取待审核队列

**云函数**：`getReviewQueue`

**调用方式**：管理后台调用

**请求参数**：
```javascript
{
    status: "pending",    // pending/approved/rejected
    page: 1,
    pageSize: 20
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "成功",
    data: {
        reviews: [
            {
                _id: "待审核ID",
                articleId: "文章ID",
                rawData: {
                    title: "原标题",
                    content: "原始内容"
                },
                aiResult: {
                    confidence: 65,
                    extractedData: {}
                },
                status: "pending",
                createTime: 1707542400000
            }
        ],
        hasMore: true,
        total: 10
    }
}
```

---

### 8.4 审核文章

**云函数**：`reviewArticle`

**调用方式**：管理后台调用

**请求参数**：
```javascript
{
    reviewId: "待审核ID",
    reviewerId: "审核人ID",
    action: "approve/reject",  // 通过/拒绝
    reviewNote: "审核备注",
    editedData: {              // 审核时修改的数据（可选）
        title: "修改后的标题",
        tags: ["修改后的标签"]
    }
}
```

**返回结果**：
```javascript
{
    code: 0,
    message: "审核完成",
    data: {
        articleId: "文章ID",
        status: "published"
    }
}
```

---

## 九、错误码汇总

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| 1000 | 系统错误 |
| 1001 | 参数错误 |
| 1002 | 未登录 |
| 1003 | 权限不足 |
| 1004 | 资源不存在 |
| 1005 | 数据库错误 |
| 1006 | 网络错误 |
| 1007 | 第三方服务错误 |
| 2001 | 微信登录失败 |
| 2002 | 获取用户信息失败 |
| 2003 | 用户已存在 |
| 3001 | 文章不存在 |
| 3002 | 文章已删除 |
| 3003 | 已收藏 |
| 3004 | 未收藏 |
| 4001 | 数据源不存在 |
| 4002 | 数据同步失败 |
| 4003 | AI处理失败 |
| 4004 | AI置信度过低 |

---

## 十、接口调用示例

### 前端调用云函数

```javascript
// 调用登录云函数
uniCloud.callFunction({
    name: 'login',
    data: {
        code: loginCode,
        userInfo: {
            nickName: '用户昵称',
            avatarUrl: '头像URL'
        }
    }
}).then(res => {
    if (res.result.code === 0) {
        const { userId, token, hasRole } = res.result.data;
        // 保存用户信息
        uni.setStorageSync('userId', userId);
        uni.setStorageSync('token', token);

        if (!hasRole) {
            // 跳转到角色选择页
            uni.navigateTo({ url: '/pages/role/role' });
        } else {
            // 跳转到首页
            uni.switchTab({ url: '/pages/index/index' });
        }
    }
});
```

### 云函数内部调用云函数

```javascript
// 云函数：syncData
'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
    // 获取启用的数据源
    const sources = await db.collection('sources')
        .where({
            'schedule.enabled': true
        })
        .get();

    const results = {
        totalSources: sources.data.length,
        successSources: 0,
        failedSources: 0,
        totalArticles: 0,
        newArticles: 0,
        updatedArticles: 0
    };

    for (const source of sources.data) {
        try {
            // 获取数据
            const articles = await fetchSourceData(source);

            // 调用processArticle云函数处理
            for (const article of articles) {
                const processResult = await uniCloud.callFunction({
                    name: 'processArticle',
                    data: {
                        rawData: article,
                        sourceId: source._id,
                        sourceName: source.name
                    }
                });

                if (processResult.result.code === 0) {
                    results.totalArticles++;
                    if (processResult.result.data.isNew) {
                        results.newArticles++;
                    } else {
                        results.updatedArticles++;
                    }
                }
            }

            results.successSources++;
        } catch (error) {
            console.error(`同步数据源 ${source.name} 失败:`, error);
            results.failedSources++;
        }
    }

    return {
        code: 0,
        message: '同步完成',
        data: results
    };
};
```

## 八、附录：用户标识版本说明

### 版本对比

| 对比项 | v1.0 | v1.1 |
|-------|------|------|
| users 表 _id | 自动生成的 ObjectId | openid |
| 用户标识字段 | userId（ObjectId） | openid |
| 前端存储 | userId + token | openid + token |
| 自动登录 | 不支持 | 支持 |
| 跨环境数据 | 失效 | 保持 |

### 版本迁移

| 时间 | 版本 | 主要变更 |
|-----|------|---------|
| 2024-02-09 | v1.0 | 初始版本，使用 ObjectId 作为用户ID |
| 2026-02-12 | v1.1 | 用户标识体系重构，openid 统一标识 |

### 登录流程变化

```
v1.0:
  登录 → 获取 openid → 创建用户(_id=ObjectId) → 返回 userId
  ↓
  前端存储 userId

v1.1:
  登录 → 获取 openid → 创建/查询用户(_id=openid) → 返回 userId=openid
  ↓
  前端存储 openid
  ↓
  退出登录后自动检测 → 有记录直接恢复会话
```

---

## 附录B：接口变更记录

| 版本 | 日期 | 变更内容 |
|-----|------|---------|
| v1.0 | 2024-02-09 | 初始版本 |
| v1.1 | 2026-02-12 | 用户标识改为 openid；新增筛选功能 |
| v1.1 | 2026-02-13 | 简化身份信息收集；新增发现页接口 |

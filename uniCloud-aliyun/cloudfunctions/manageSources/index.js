'use strict';

const db = uniCloud.database();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const TIMEOUT = 15000;

// 读取配置文件
function loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config;
        } catch (e) {
            console.error('[manageSources] 配置加载失败:', e.message);
        }
    }
    return {};
}

/**
 * 验证管理员权限
 */
async function verifyAdmin(openid) {
    const admin = await db.collection('admins')
        .where({ openid, status: 'active' })
        .get();

    if (!admin.data.length) {
        throw new Error('无管理员权限');
    }

    const permissions = admin.data[0].permissions || [];
    if (!permissions.includes('sources') && !permissions.includes('all')) {
        throw new Error('无数据源管理权限');
    }

    return admin.data[0];
}

// ============ 分类辅助函数 ============

// ===== 精确的文件名到owner映射表 (41个部门) =====
const FILENAME_TO_OWNER = {
  // ===== 学院 (22个) =====
  '法学院': '学院/法学院',
  '电子信息工程学院': '学院/电子信息工程学院',
  '管理学院': '学院/管理学院',
  '经济学院': '学院/经济学院',
  '马克思主义学院': '学院/马克思主义学院',
  '美术学院': '学院/美术学院',
  '民族学与社会学学院': '学院/民族学与社会学学院',
  '计算机学院': '学院/计算机学院',
  '教育学院': '学院/教育学院',
  '化学与材料科学学院': '学院/化学与材料科学学院',
  '数学与统计学院': '学院/数学与统计学院',
  '体育学院': '学院/体育学院',
  '外语学院': '学院/外语学院',
  '文学与新闻传播学院': '学院/文学与新闻传播学院',
  '药学院': '学院/药学院',
  '资源与环境学院': '学院/资源与环境学院',
  '生命科学学院': '学院/生命科学学院',
  '生物医学工程': '学院/生物医学工程',
  '预科教育学院': '学院/预科教育学院',
  '中华民族共同体学院': '学院/中华民族共同体学院',
  '音乐舞蹈学院': '学院/音乐舞蹈学院',
  '国家安全学院': '学院/国家安全学院',
  '创新创业学院': '学院/创新创业学院',
  // ===== 机关部处 (11个) =====
  '党委保卫部（保卫处）': '机关部处/党委保卫部',
  '党委教师工作部、人事处（人才工作办公室）': '机关部处/党委教师工作部',
  '党委学生工作部': '机关部处/学生处',
  '党委组织部（党校、机关党委）': '机关部处/组织部',
  '党政办公室（政策研究室、国内合作办公室）': '机关部处/党政办公室',
  '财务处': '机关部处/财务处',
  '采购与投标中心': '机关部处/采购与投标中心',
  '国际合作与交流处': '机关部处/国际合作与交流处',
  '基建处': '机关部处/基建处',
  '就业工作处': '机关部处/就业工作处',
  '信息化建设管理处': '机关部处/信息化建设管理处',
  // ===== 直属单位 (3个) =====
  '图书馆': '直属单位/图书馆',
  '创新创业教育实践基地': '直属单位/创新创业教育实践基地',
  '实验教学与工程训练中心': '直属单位/实验教学与工程训练中心',
  // ===== 新闻/通知 (2个) =====
  '学校通知公告': '新闻/通知/通知公告',
  '学校新闻网': '新闻/通知/新闻网',
  // ===== 学生组织 (1个) =====
  '团委': '学生组织/团委'
};

/**
 * 根据文件名获取精确的owner
 */
function getOwnerByFilename(filename) {
  if (!filename) return '其他/未分类';
  if (FILENAME_TO_OWNER[filename]) {
    return FILENAME_TO_OWNER[filename];
  }
  for (const [key, value] of Object.entries(FILENAME_TO_OWNER)) {
    if (filename.includes(key) || key.includes(filename)) {
      return value;
    }
  }
  return '其他/未分类';
}

/**
 * 根据owner前缀获取tier等级
 * tier1: 关键机关部处 (教务处/学生处/研究生处/就业工作处/财务处/图书馆)
 * tier2: 其他机关部处 + 学院
 * tier3: 其他
 */
function getTierByOwner(owner) {
  if (!owner) return 'tier3';
  if (owner.includes('教务处') || owner.includes('学生处') || owner.includes('研究生处') || owner.includes('就业工作处') || owner.includes('财务处') || owner.includes('图书馆')) {
    return 'tier1';
  }
  if (owner.startsWith('机关部处') || owner.startsWith('学院')) {
    return 'tier2';
  }
  return 'tier3';
}

/**
 * 根据URL模式建议优先级
 * tier1: 机关部处 (jwc, xsc, yjs, bwc等)
 * tier2: 学院 (含"college"或"xy"路径)
 * tier3: 学生组织 (含"stu"或"stuent"路径)
 */
function suggestTier(url) {
    if (!url) return 'tier3';
    const lower = url.toLowerCase();
    // tier1: 关键机关部处
    if (lower.includes('jwc') || lower.includes('jiaowu')) return 'tier1';
    if (lower.includes('xsc') || lower.includes('xuesheng')) return 'tier1';
    if (lower.includes('yjs') || lower.includes('yanjiusheng')) return 'tier1';
    if (lower.includes('bwc') || lower.includes('biye')) return 'tier1';
    if (lower.includes('rsc') || lower.includes('renshi')) return 'tier1';
    if (lower.includes('cwc') || lower.includes('caiwu')) return 'tier1';
    if (lower.includes('gzc') || lower.includes('gongzuo')) return 'tier1';
    if (lower.includes('zbb') || lower.includes('zhongbao')) return 'tier1';
    if (lower.includes('xxb') || lower.includes('xinxi')) return 'tier1';
    if (lower.includes('library') || lower.includes('lib.')) return 'tier1';
    if (lower.includes('news') || lower.includes('xwzx')) return 'tier1';
    if (lower.includes('scce') || lower.includes('shenpi')) return 'tier1';
    // tier2: 学院
    if (lower.includes('/xy/') || lower.includes('/college/')) return 'tier2';
    if (lower.includes('xy.scuec') || lower.includes('college.scuec')) return 'tier2';
    // Extract category path segments that might indicate college
    const collegeIndicators = ['xueyuan', 'xy', 'college', 'yuanxi'];
    for (const indicator of collegeIndicators) {
        if (lower.includes(indicator)) return 'tier2';
    }
    // tier3: 学生组织社团等
    if (lower.includes('/stu/') || lower.includes('/stuent/')) return 'tier3';
    if (lower.includes('stu.scuec')) return 'tier3';
    if (lower.includes('she') && lower.includes('tuan')) return 'tier3';
    if (lower.includes('tuanwei')) return 'tier3';
    // Default tier3
    return 'tier3';
}

/**
 * 根据URL模式建议所属组织单位
 * 格式: 机关部处/教务处
 * 当提供filename时，使用精确的文件名到owner映射
 */
function suggestOwner(url, filename) {
    if (filename) {
        return getOwnerByFilename(filename);
    }
    if (!url) return '其他/未分类';
    const lower = url.toLowerCase();
    // 机关部处
    if (lower.includes('jwc') || lower.includes('jiaowu')) return '机关部处/教务处';
    if (lower.includes('xsc') || lower.includes('xuesheng')) return '机关部处/学生处';
    if (lower.includes('yjs') || lower.includes('yanjiusheng')) return '机关部处/研究生处';
    if (lower.includes('bwc') || lower.includes('biye')) return '机关部处/毕业生就业指导中心';
    if (lower.includes('rsc') || lower.includes('renshi')) return '机关部处/人事处';
    if (lower.includes('cwc') || lower.includes('caiwu')) return '机关部处/财务处';
    if (lower.includes('gzc') || lower.includes('gongzuo')) return '机关部处/工作处';
    if (lower.includes('zbb') || lower.includes('zhongbao')) return '机关部处/党委办公室';
    if (lower.includes('xxb') || lower.includes('xinxi')) return '机关部处/信息化中心';
    if (lower.includes('lib.') || lower.includes('library')) return '直属单位/图书馆';
    if (lower.includes('news') || lower.includes('xwzx')) return '机关部处/宣传部';
    if (lower.includes('scce') || lower.includes('shenpi')) return '机关部处/信息化中心';
    if (lower.includes('scuec.edu.cn')) {
        // Try to extract college name from path
        const match = lower.match(/\/([a-z]+)\//);
        if (match) {
            const seg = match[1];
            // Common college codes
            if (['wyxy', 'rwxy', 'waiyu', 'zhifa', 'jingji', 'guanli', 'faxue', 'jiaoyu', 'tiyu', 'meishu', 'yinle', 'xinwen', 'falv', 'jisuanji', 'hudaxinxi'].includes(seg)) {
                return '学院/' + seg;
            }
        }
    }
    return '其他/未分类';
}

// ============ 智能分析函数 ============

/**
 * 从URL中提取分类标识 (category/sourceId)
 * 例如: https://www.scuec.edu.cn/wyxy/index/cxcy.htm → "wyxy"
 *       https://www.scuec.edu.cn/jwc/tztg.htm → "jwc"
 */
function extractCategoryFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const parts = pathname.split('/').filter(p => p && !p.match(/^index\./));

        if (parts.length === 0) return '';

        // 获取最后一级目录（排除 .htm/.html 文件）
        let category = parts[parts.length - 1];
        if (category.match(/\.(htm|html?)$/i)) {
            category = parts.length > 1 ? parts[parts.length - 2] : '';
        }

        return category || '';
    } catch (e) {
        console.error('[extractCategory] 提取失败:', e.message);
        return '';
    }
}

/**
 * 智能获取网页标题（用于 sourceName）
 */
async function fetchPageTitle(url) {
    try {
        const res = await axios.get(url, {
            timeout: TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            maxRedirects: 5
        });

        // 尝试从 <title> 提取
        const titleMatch = res.data.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1].trim();
        }

        // 尝试从 <h1> 提取
        const h1Match = res.data.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match && h1Match[1]) {
            return h1Match[1].trim();
        }

        return null;
    } catch (e) {
        console.error('[fetchPageTitle] 获取失败:', e.message);
        return null;
    }
}

/**
 * 从域名推断来源名称
 */
function inferSourceNameFromDomain(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');

        // 维护一个域名到名称的映射表
        const domainMap = {
            'scuec.edu.cn': '本校',
            'jwc.scuec.edu.cn': '教务处',
            'lib.scuec.edu.cn': '图书馆'
        };

        return domainMap[hostname] || hostname;
    } catch (e) {
        return '未知来源';
    }
}

/**
 * 智能分析URL，返回建议数据
 */
async function analyzeUrl(url) {
    if (!url) {
        return { success: false, error: 'URL不能为空' };
    }

    const category = extractCategoryFromUrl(url);
    console.error('[manageSources] 提取的category: ' + category);

    // 尝试获取网页标题
    let sourceName = await fetchPageTitle(url);
    console.error('[manageSources] 获取的页面标题: ' + (sourceName || 'null'));

    // 如果获取失败，从域名推断
    if (!sourceName) {
        sourceName = inferSourceNameFromDomain(url);
    }

    // sourceId 使用 category
    const sourceId = category;

    // 根据URL特征推断类型
    let sourceType = 'website';
    if (url.includes('/rss') || url.includes('.xml')) {
        sourceType = 'rss';
    } else if (url.includes('/api')) {
        sourceType = 'api';
    }

    return {
        success: true,
        data: {
            sourceId,
            sourceName,
            category,
            sourceType,
            suggestedUrl: url
        }
    };
}

// ============ 主入口 ============

exports.main = async (event, context) => {
    const openid = context.OPENID;
    const { action, ...data } = event;

    console.error('[manageSources] ===== 云函数入口 =====');
    console.error('[manageSources] action:', action);
    console.error('[manageSources] data:', JSON.stringify(data));
    console.error('[manageSources] openid:', openid);

    try {
        // analyze 和 list 不需要验证权限，直接处理
        if (action === 'analyze' || action === 'list' || action === 'listWithSubscription') {
            if (action === 'list') {
                const sources = await db.collection('sources').where({ enabled: true }).get();
                return {
                    code: 0,
                    data: sources.data || []
                };
            }

            // listWithSubscription: 返回数据源列表，带用户订阅状态
            if (action === 'listWithSubscription') {
                const sources = await db.collection('sources').where({ enabled: true }).get();
                const sourceList = sources.data || [];

                // 获取用户订阅
                let userSubs = [];
                const openid = context.OPENID;
                if (openid) {
                    const subsRes = await db.collection('subscriptions').where({ openid }).get();
                    userSubs = subsRes.data || [];
                }

                const subscribedIds = userSubs.map(s => s.sourceId);

                // 为每个数据源标记订阅状态
                const result = sourceList.map(s => ({
                    _id: s._id,
                    sourceId: s.sourceId,
                    sourceName: s.sourceName,
                    sourceType: s.sourceType,
                    description: s.description,
                    isSubscribed: subscribedIds.includes(s.sourceId)
                }));

                return {
                    code: 0,
                    data: result
                };
            }
            // analyze action
            const { url } = data;
            const result = await analyzeUrl(url);

            if (!result.success) {
                return { code: 400, message: result.error };
            }

            return {
                code: 0,
                data: result.data
            };
        }

        // 其他 action 需要验证登录和权限
        // if (!openid) {
        //     return { code: 401, message: '未登录' };
        // }

        await verifyAdmin(openid);

        switch (action) {
            case 'create': {
                const {
                    sourceId,
                    sourceName,
                    sourceType,
                    description,
                    category,
                    config,
                    schedule,
                    defaultTags,
                    enabled = true,
                    autoAnalyze,
                    parseStrategy = 'regex-parse'
                } = data;

                let finalSourceId = sourceId;
                let finalSourceName = sourceName;
                let finalCategory = category;

                // 如果需要自动分析URL
                if (autoAnalyze && config?.url) {
                    const analysis = await analyzeUrl(config.url);
                    if (analysis.success) {
                        finalSourceId = sourceId || analysis.data.sourceId;
                        finalSourceName = sourceName || analysis.data.sourceName;
                        finalCategory = category || analysis.data.category;
                    }
                }

                // 验证必填字段
                if (!finalSourceId) {
                    return { code: 400, message: 'sourceId不能为空' };
                }
                if (!finalSourceName) {
                    return { code: 400, message: 'sourceName不能为空' };
                }

                const now = Date.now();
                const sourceUrl = config?.url || '';
                const suggestedTier = suggestTier(sourceUrl);
                const suggestedOwner = suggestOwner(sourceUrl);
                const result = await db.collection('sources').add({
                    sourceId: finalSourceId,
                    sourceName: finalSourceName,
                    sourceType: sourceType || 'website',
                    description: description || '',
                    category: finalCategory || finalSourceId,
                    enabled,
                    config: config || { url: '' },
                    schedule: {
                        interval: schedule?.interval || 3600000,
                        lastRunTime: null,
                        nextRunTime: null,
                        autoSync: schedule?.autoSync || false
                    },
                    defaultTags: defaultTags || {
                        source: [],
                        role: ['通用'],
                        custom: []
                    },
                    stats: {
                        totalArticles: 0,
                        lastFetchCount: 0,
                        lastCheckTime: null,
                        hasUpdates: false
                    },
                    classification: {
                        crawlStatus: 'crawl',
                        parseStrategy: parseStrategy,
                        priorityTier: suggestedTier,
                        owner: suggestedOwner,
                        lastQualityCheck: null
                    },
                    parseStrategy: parseStrategy,
                    createTime: now,
                    updateTime: now
                });

                return {
                    code: 0,
                    message: '创建成功',
                    data: { id: result.id }
                };
            }

            case 'update': {
                const { id, ...updateData } = data;

                if (!id) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                // 如果 config.url 变化，自动重新计算 classification
                if (updateData.config?.url) {
                    const sourceUrl = updateData.config.url;
                    const suggestedTier = suggestTier(sourceUrl);
                    const suggestedOwner = suggestOwner(sourceUrl);
                    // 获取现有 classification 保留其他字段
                    const existingSource = await db.collection('sources').doc(id).get();
                    const existingClassification = existingSource.data?.classification || {};
                    updateData.classification = {
                        ...existingClassification,
                        priorityTier: suggestedTier,
                        owner: suggestedOwner,
                        lastQualityCheck: Date.now()
                    };
                }

                // 同步 parseStrategy 到 classification（legacy 兼容）
                if (updateData.parseStrategy) {
                    if (!updateData.classification) {
                        const existingSource = await db.collection('sources').doc(id).get();
                        updateData.classification = existingSource.data?.classification || {};
                    }
                    updateData.classification.parseStrategy = updateData.parseStrategy;
                }

                // 过滤允许更新的字段
                const allowedFields = [
                    'sourceId', 'sourceName', 'sourceType', 'description',
                    'category', 'enabled', 'config', 'schedule', 'defaultTags',
                    'classification', 'parseStrategy'
                ];
                const filteredData = {};
                for (const key of allowedFields) {
                    if (updateData[key] !== undefined) {
                        filteredData[key] = updateData[key];
                    }
                }
                filteredData.updateTime = Date.now();

                await db.collection('sources').doc(id).update(filteredData);

                return {
                    code: 0,
                    message: '更新成功'
                };
            }

            case 'delete': {
                const { id } = data;

                if (!id) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                await db.collection('sources').doc(id).remove();

                return {
                    code: 0,
                    message: '删除成功'
                };
            }

            case 'toggle': {
                const { id, enabled } = data;

                if (!id) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                await db.collection('sources').doc(id).update({
                    enabled,
                    updateTime: Date.now()
                });

                return {
                    code: 0,
                    message: enabled ? '已启用' : '已禁用'
                };
            }

            case 'setAutoSync': {
                // 便捷 action：设置自动同步开关和间隔
                const { id, autoSync, interval } = data;

                if (!id) {
                    return { code: 400, message: '缺少数据源ID' };
                }

                const updateData = {
                    updateTime: Date.now()
                };

                if (typeof autoSync === 'boolean') {
                    updateData['schedule.autoSync'] = autoSync;
                    updateData['schedule.nextRunTime'] = autoSync ? Date.now() : null;
                }

                if (typeof interval === 'number' && interval > 0) {
                    updateData['schedule.interval'] = interval;
                }

                await db.collection('sources').doc(id).update(updateData);

                return {
                    code: 0,
                    message: autoSync ? `已开启自动同步，间隔 ${(interval || 3600000) / 1000 / 60} 分钟` : '已关闭自动同步'
                };
            }

            case 'syncNow': {
                // 手动立即同步指定数据源（触发 syncSources 异步处理）
                const { ids } = data;

                if (!ids || !Array.isArray(ids) || ids.length === 0) {
                    return { code: 400, message: '缺少数据源ID列表' };
                }

                // 异步触发 syncSources，不等待结果
                // 注意：这里只是重置 lastRunTime，让下次定时触发时必定执行
                const now = Date.now();
                await Promise.all(ids.map(id =>
                    db.collection('sources').doc(id).update({
                        'schedule.lastRunTime': now - 86400000, // 强制设置为1天前，确保下次必定执行
                        'schedule.nextRunTime': now,
                        updateTime: now
                    })
                ));

                return {
                    code: 0,
                    message: `已标记 ${ids.length} 个数据源为待同步状态，下次定时触发时将执行`
                };
            }

            case 'test': {
                // 测试数据源连接
                const { url } = data;

                if (!url) {
                    return { code: 400, message: 'URL不能为空' };
                }

                try {
                    const res = await axios.get(url, {
                        timeout: TIMEOUT,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    return {
                        code: 0,
                        message: '连接成功',
                        data: {
                            status: res.status,
                            contentLength: res.data?.length || 0
                        }
                    };
                } catch (e) {
                    return {
                        code: 500,
                        message: '连接失败: ' + e.message
                    };
                }
            }

            case 'batchSuggest': {
                // Return tier/owner suggestions for sources (no DB write)
                const { ids } = data;
                console.error('[manageSources][batchSuggest] ===== 开始获取AI建议 =====');
                console.error('[manageSources][batchSuggest] 接收到的ids: ' + JSON.stringify(ids));
                let allSources;
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    console.error('[manageSources][batchSuggest] 按选中ID过滤，数量: ' + ids.length);
                    allSources = await db.collection('sources').where({ _id: db.command.in(ids) }).get();
                } else {
                    console.error('[manageSources][batchSuggest] 未提供ids，获取全部数据源');
                    allSources = await db.collection('sources').get();
                }
                console.error('[manageSources][batchSuggest] 从数据库获取到数据源数量: ' + (allSources.data?.length || 0));
                const suggestions = (allSources.data || []).map(s => {
                    const sourceUrl = s.config?.url || '';
                    const suggestedTier = suggestTier(sourceUrl);
                    const suggestedOwner = suggestOwner(sourceUrl);
                    console.error('[manageSources][batchSuggest] 数据源: ' + s.sourceName + ' | URL: ' + sourceUrl + ' | 当前tier: ' + (s.classification?.priorityTier || 'null') + ' => 建议tier: ' + suggestedTier + ' | 当前owner: ' + (s.classification?.owner || 'null') + ' => 建议owner: ' + suggestedOwner);
                    return {
                        id: s._id,
                        sourceId: s.sourceId,
                        sourceName: s.sourceName,
                        currentTier: s.classification?.priorityTier || null,
                        currentOwner: s.classification?.owner || null,
                        suggestedTier,
                        suggestedOwner
                    };
                });
                console.error('[manageSources][batchSuggest] ===== AI建议获取完成，共 ' + suggestions.length + ' 条建议 =====');
                return {
                    code: 0,
                    data: suggestions
                };
            }

            case 'batchMigrate': {
                // Bulk-update classification fields for sources
                const { ids } = data;
                console.error('[manageSources][batchMigrate] ===== 开始应用AI建议 =====');
                console.error('[manageSources][batchMigrate] 接收到的ids: ' + JSON.stringify(ids));
                let allSources;
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    console.error('[manageSources][batchMigrate] 按选中ID更新，数量: ' + ids.length);
                    allSources = await db.collection('sources').where({ _id: db.command.in(ids) }).get();
                } else {
                    console.error('[manageSources][batchMigrate] 未提供ids，更新全部数据源');
                    allSources = await db.collection('sources').get();
                }
                const sourcesList = allSources.data || [];
                console.error('[manageSources][batchMigrate] 待更新数据源数量: ' + sourcesList.length);
                let updated = 0;
                for (const s of sourcesList) {
                    const sourceUrl = s.config?.url || '';
                    const newTier = suggestTier(sourceUrl);
                    const newOwner = suggestOwner(sourceUrl);
                    console.error('[manageSources][batchMigrate] 更新数据源: ' + s.sourceName + ' | URL: ' + sourceUrl + ' | tier: ' + (s.classification?.priorityTier || 'null') + ' => ' + newTier + ' | owner: ' + (s.classification?.owner || 'null') + ' => ' + newOwner);
                    await db.collection('sources').doc(s._id).update({
                        classification: {
                            crawlStatus: s.classification?.crawlStatus || 'crawl',
                            parseStrategy: s.classification?.parseStrategy || 'regex-parse',
                            priorityTier: newTier,
                            owner: newOwner,
                            lastQualityCheck: Date.now()
                        },
                        parseStrategy: s.parseStrategy || s.classification?.parseStrategy || 'regex-parse',  // 顶层字段
                        updateTime: Date.now()
                    });
                    updated++;
                }
                console.error('[manageSources][batchMigrate] ===== 应用完成，共更新 ' + updated + ' 个数据源 =====');
                return {
                    code: 0,
                    message: `批量更新完成，共处理 ${updated} 个数据源`,
                    data: { updated }
                };
            }

            case 'importSources': {
                // 批量导入数据源 (JSON文件格式)
                // 数据格式: { category: "法学院", entries: [{ name, url, timestamp }, ...] }
                console.error('[manageSources][importSources] 接收到数据:', JSON.stringify({ category: data.category, entriesLength: Array.isArray(data.entries) ? data.entries.length : 'NOT_ARRAY(' + typeof data.entries + ')', entriesType: typeof data.entries }));
                const { category, entries } = data;
                if (!entries || !Array.isArray(entries) || entries.length === 0) {
                    return { code: 400, message: 'entries必须是非空数组' };
                }
                const categoryName = category || '未分类';
                const owner = getOwnerByFilename(categoryName);
                const suggestedTier = getTierByOwner(owner);

                // 从 name 字段提取最后一个 "-" 后面的部分作为 subgroup 名称
                // 例如: "教务处通知-2024-01" -> subgroup = "2024-01"
                function extractSubgroup(name) {
                    if (name) {
                        const parts = name.split('-');
                        if (parts.length >= 2) {
                            return parts[parts.length - 1].trim();
                        }
                    }
                    return categoryName;
                }

                let imported = 0, updated = 0, failed = 0;
                const errors = [];
                for (const entry of entries) {
                    try {
                        const { name, url } = entry;
                        if (!name || !url) { failed++; errors.push('跳过无效条目: ' + (entry.name || JSON.stringify(entry))); continue; }
                        let sourceId = '';
                        const subgroup = extractSubgroup(name);
                        try {
                            const urlObj = new URL(url);
                            const parts = urlObj.pathname.split('/').filter(p => p && !p.match(/^index\./));
                            sourceId = parts.length >= 2 ? parts[parts.length - 1].replace(/.(htm|html?)$/i, '') : (parts[0] || categoryName).replace(/.(htm|html?)$/i, '');
                        } catch (e) { sourceId = categoryName; }
                        const existing = await db.collection('sources').where({ sourceId }).get();
                        const now = Date.now();
                        const sourceData = {
                            sourceId,
                            sourceName: name,
                            sourceType: 'website',
                            category: categoryName,
                            subgroup,
                            config: { url },
                            enabled: true,
                            schedule: { interval: 3600000, lastRunTime: null, nextRunTime: null, autoSync: false },
                            defaultTags: { source: [categoryName], role: ['通用'], custom: [] },
                            stats: { totalArticles: 0, lastFetchCount: 0, lastCheckTime: null, hasUpdates: false },
                            classification: { crawlStatus: 'crawl', parseStrategy: 'regex-parse', priorityTier: suggestedTier, owner, lastQualityCheck: now },
                            parseStrategy: 'regex-parse',  // 顶层字段，parseArticles 优先读取
                            updateTime: now
                        };
                        if (existing.data && existing.data.length > 0) {
                            await db.collection('sources').doc(existing.data[0]._id).update(sourceData);
                            updated++;
                        } else {
                            sourceData.createTime = now;
                            await db.collection('sources').add(sourceData);
                            imported++;
                        }
                    } catch (e) { failed++; errors.push('处理失败: ' + (e.message || 'unknown')); }
                }
                return { code: 0, message: '导入完成: 新增'+imported+'条, 更新'+updated+'条, 失败'+failed+'条', data: { imported, updated, failed, errors } };
            }

            case 'batchSetParseStrategy': {
                // 批量设置 parseStrategy 顶层字段（修复历史数据）
                const { ids, strategy = 'regex-parse' } = data;
                console.error('[manageSources][batchSetParseStrategy] ===== 批量设置parseStrategy =====');
                console.error('[manageSources][batchSetParseStrategy] ids:', ids, 'strategy:', strategy);

                let allSources;
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    allSources = await db.collection('sources').where({ _id: db.command.in(ids) }).get();
                } else {
                    allSources = await db.collection('sources').get();
                }
                const sourcesList = allSources.data || [];
                console.error('[manageSources][batchSetParseStrategy] 待更新数量:', sourcesList.length);

                let updated = 0;
                for (const s of sourcesList) {
                    // 同步到顶层和 classification.parseStrategy
                    await db.collection('sources').doc(s._id).update({
                        parseStrategy: strategy,
                        classification: {
                            ...s.classification,
                            parseStrategy: strategy
                        },
                        updateTime: Date.now()
                    });
                    updated++;
                }
                console.error('[manageSources][batchSetParseStrategy] ===== 完成，共更新 ' + updated + ' 个 =====');
                return { code: 0, message: `批量设置parseStrategy完成，共 ${updated} 个数据源设置为 ${strategy}`, data: { updated } };
            }

            default:
                return { code: 400, message: '无效的操作' };
        }

    } catch (error) {
        console.error('数据源管理失败:', error);
        return {
            code: 500,
            message: error.message || '系统错误'
        };
    }
};

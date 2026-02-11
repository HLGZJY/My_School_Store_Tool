'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { limit = 10 } = event;

        try {
            // 从 sources 表获取数据源列表
            const res = await db.collection('sources')
                .where({ enabled: true })
                .limit(limit)
                .get();

            // 将数据源名称作为热门搜索词
            const keywords = res.data.map(item => ({
                keyword: item.sourceName,
                count: Math.floor(Math.random() * 500) + 100 // 模拟热度
            }));

            // 添加一些固定关键词
            const fixedKeywords = [
                { keyword: '考试', count: 567 },
                { keyword: '放假', count: 456 },
                { keyword: '招新', count: 345 },
                { keyword: '讲座', count: 234 },
                { keyword: '选课', count: 189 }
            ];

            // 合并并去重
            const existing = new Set(keywords.map(k => k.keyword));
            const merged = [...keywords, ...fixedKeywords.filter(k => !existing.has(k.keyword))];

            return {
                code: 0,
                message: 'success',
                data: merged.slice(0, limit)
            };
        } catch (error) {
            console.error('获取热门关键词失败:', error);
            return {
                code: -1,
                message: '获取热门关键词失败',
                data: []
            };
        }
    }
};

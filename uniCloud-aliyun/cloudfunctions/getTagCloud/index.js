'use strict';

const db = uniCloud.database();

module.exports = {
    async main(event) {
        const { limit = 20 } = event;

        console.log('=== getTagCloud 云函数开始 ===');

        try {
            // 从 articles 表聚合统计标签
            // 由于 MongoDB 聚合较复杂，这里简化为查询所有文章后统计
            const res = await db.collection('articles')
                .where({ status: 'published' })
                .limit(100)
                .get();

            console.log('getTagCloud: 查询到文章数量:', res.data.length);

            // 统计标签出现次数
            const tagCountMap = {};

            res.data.forEach(article => {
                // 从 tags 字段提取标签
                if (article.tags && article.tags.role) {
                    article.tags.role.forEach(tag => {
                        tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
                    });
                }

                // 从标题提取常见关键词（简化处理）
                const keywords = ['考试', '讲座', '招新', '图书馆', '放假', '选课', '成绩', '就业', '奖学金', '会议'];
                keywords.forEach(keyword => {
                    if (article.title && article.title.includes(keyword)) {
                        tagCountMap[keyword] = (tagCountMap[keyword] || 0) + 1;
                    }
                });
            });

            // 转换为数组并排序
            const tags = Object.entries(tagCountMap)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return {
                code: 0,
                message: 'success',
                data: tags
            };
        } catch (error) {
            console.error('获取标签云失败:', error);
            return {
                code: -1,
                message: '获取标签云失败',
                data: []
            };
        }
    }
};

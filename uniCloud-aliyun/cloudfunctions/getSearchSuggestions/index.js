'use strict';

const db = uniCloud.database();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
    async main(event) {
        const { keyword = '', limit = 10 } = event;

        try {
            // If keyword is too short, return empty suggestions
            if (!keyword || keyword.trim().length < 1) {
                return {
                    code: 0,
                    message: 'success',
                    data: []
                };
            }

            const trimmedKeyword = keyword.trim();
            const safeKeyword = escapeRegex(trimmedKeyword);
            const regex = new RegExp(safeKeyword, 'i');
            const suggestions = [];

            // Query articles by title (max 5)
            try {
                const articlesRes = await db.collection('articles')
                    .where({ title: regex })
                    .limit(5)
                    .get();
                articlesRes.data.forEach(item => {
                    suggestions.push({
                        type: 'article',
                        text: item.title,
                        keyword: item.title
                    });
                });
            } catch (e) {
                console.error('Query articles failed:', e);
            }

            // Query sources by name (max 3)
            try {
                const sourcesRes = await db.collection('sources')
                    .where({
                        sourceName: regex,
                        enabled: true
                    })
                    .limit(3)
                    .get();
                sourcesRes.data.forEach(item => {
                    suggestions.push({
                        type: 'source',
                        text: item.sourceName,
                        keyword: item.sourceName
                    });
                });
            } catch (e) {
                console.error('Query sources failed:', e);
            }

            // Query articles by custom tags (max 3) - 搜索 tags.custom 而非 tags.source
            try {
                const tagsRes = await db.collection('articles')
                    .where({
                        'tags.custom': regex
                    })
                    .limit(3)
                    .get();
                const existingTags = new Set();
                tagsRes.data.forEach(item => {
                    // tags.custom 是数组，需要遍历每个标签
                    const customTags = item.tags && item.tags.custom ? item.tags.custom : [];
                    customTags.forEach(tagText => {
                        if (tagText && !existingTags.has(tagText)) {
                            existingTags.add(tagText);
                            suggestions.push({
                                type: 'tag',
                                text: tagText,
                                keyword: tagText
                            });
                        }
                    });
                });
            } catch (e) {
                console.error('Query tags failed:', e);
            }

            // Slice to limit and return
            return {
                code: 0,
                message: 'success',
                data: suggestions.slice(0, limit)
            };
        } catch (error) {
            console.error('getSearchSuggestions failed:', error);
            return {
                code: -1,
                message: error.message,
                data: []
            };
        }
    }
};

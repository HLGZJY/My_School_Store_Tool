'use strict';

/**
 * Keyword extraction utility for RegexParseStrategy
 * Uses word frequency analysis with Chinese-specific stopword filtering
 * to auto-generate article tags from plain text content.
 */

/**
 * Chinese stopwords - high frequency function words that don't carry semantic meaning
 */
const CHINESE_STOPWORDS = new Set([
    // Common function words
    '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
    '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '么', '她', '他', '它', '们', '这个', '那个', '什么', '怎么',
    '为什么', '因为', '所以', '但是', '如果', '虽然', '还是', '或者', '而且', '只是', '已经', '可以', '可能', '应该',
    // Common verbs
    '来', '进', '出', '回', '过', '起', '把', '被', '让', '给', '向', '从', '对', '与', '及', '或', '但', '而', '且',
    // Time/location words
    '现在', '今天', '昨天', '明天', '今年', '去年', '明年', '这里', '那里', '哪里', '这么', '那么',
    // Pronouns & determiners
    '每', '各', '某', '本', '该', '此', '其', '之',
    // Numbers & measure words
    '第一', '第二', '一些', '一点', '一起', '一定', '一样', '一直', '一边', '一面',
    // Other common words
    '又', '再', '还', '最', '更', '太', '真', '只', '都', '刚', '便', '即', '越', '再', '竟', '终于',
    '关于', '对于', '根据', '按照', '通过', '经过', '由于', '为了', '以便', '除非', '除了',
    // Academic notice words to filter (too generic)
    '通知', '公告', '转发', '关于', '要求', '进行', '工作', '开展', '实施', '推进', '加强', '提高',
    '做好', '落实', '组织', '领导', '部门', '单位', '同志', '各位', '现将', '如下',
    // Website structural words
    '点击', '进入', '访问', '链接', '附件', '详情', '更多', '首页', '登录', '注册', '忘记', '密码',
    '用户名', '搜索', '查询', '打印', '关闭', '确认', '取消', '提交', '保存', '编辑', '删除',
    '来源', '作者', '发表', '发布', '时间', '日期', '浏览', '阅读', '次数', '字号', '上一篇', '下一篇'
]);

/**
 * English stopwords
 */
const ENGLISH_STOPWORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
    'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
    'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
    'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
    'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want',
    'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
    'were', 'said', 'each', 'she', 'which', 'their', 'time', 'very', 'when', 'come', 'made', 'find'
]);

/**
 * Score a word based on various quality heuristics
 */
function scoreWord(word, freq, position, totalWords) {
    let score = freq;

    // Boost words appearing in early part of document (position weight)
    if (position < totalWords * 0.3) {
        score *= 1.5;
    } else if (position < totalWords * 0.5) {
        score *= 1.2;
    }

    // Penalize very short words slightly
    if (word.length === 2) {
        score *= 1.1; // 2-char Chinese words are often meaningful
    } else if (word.length === 1) {
        score *= 0.3; // Single characters rarely meaningful as tags
    }

    // Boost 3-4 char Chinese words (optimal length for keywords)
    if (word.length === 3 || word.length === 4) {
        score *= 1.2;
    }

    // English words 4+ chars are more likely to be meaningful
    if (word.length >= 4 && /[a-zA-Z]/.test(word)) {
        score *= 1.3;
    }

    return score;
}

/**
 * Tokenize Chinese text into word candidates (character n-grams)
 */
function tokenizeChinese(text) {
    const words = [];

    // Match Chinese character sequences and English word sequences separately
    // Chinese: 2-4 character sequences
    const chinesePattern = /[\u4e00-\u9fa5]{2,4}/g;
    let match;
    while ((match = chinesePattern.exec(text)) !== null) {
        const seq = match[0];
        // Generate sub-sequences of different lengths
        for (let len = 2; len <= Math.min(4, seq.length); len++) {
            for (let i = 0; i <= seq.length - len; i++) {
                words.push(seq.substring(i, i + len));
            }
        }
    }

    return words;
}

/**
 * Tokenize English words from mixed text
 */
function tokenizeEnglish(text) {
    const words = [];
    const englishPattern = /[a-zA-Z]{3,}/g;
    let match;
    while ((match = englishPattern.exec(text)) !== null) {
        const word = match[0].toLowerCase();
        if (!ENGLISH_STOPWORDS.has(word)) {
            words.push(word);
        }
    }
    return words;
}

/**
 * Main keyword extraction function
 * @param {string} text - Plain text content
 * @param {Object} options - Extraction options
 * @param {number} options.maxKeywords - Maximum number of keywords to return (default: 5)
 * @param {number} options.minWordLength - Minimum word length (default: 2)
 * @returns {string[]} Array of keyword strings
 */
function extractKeywords(text, options = {}) {
    const {
        maxKeywords = 5,
        minWordLength = 2
    } = options;

    if (!text || typeof text !== 'string' || text.length < 50) {
        return [];
    }

    // Normalize text - remove extra whitespace
    const normalized = text.replace(/\s+/g, ' ').trim();

    // Collect word candidates and their first occurrence positions
    const chineseWords = tokenizeChinese(normalized);
    const englishWords = tokenizeEnglish(normalized);
    const allWords = [...chineseWords, ...englishWords];

    if (allWords.length < 10) {
        return [];
    }

    // Count word frequencies and track first occurrence position
    const wordStats = new Map();
    let wordIndex = 0;

    for (const word of allWords) {
        // Filter stopwords
        if (CHINESE_STOPWORDS.has(word) || word.length < minWordLength) {
            wordIndex++;
            continue;
        }

        if (!wordStats.has(word)) {
            wordStats.set(word, { freq: 0, firstPos: wordIndex });
        }
        wordStats.get(word).freq++;
        wordIndex++;
    }

    // Calculate scores
    const totalWords = allWords.length;
    const scoredWords = [];

    for (const [word, stats] of wordStats.entries()) {
        // Skip low frequency words (likely noise)
        if (stats.freq < 2) continue;

        const score = scoreWord(word, stats.freq, stats.firstPos, totalWords);
        scoredWords.push({ word, score, freq: stats.freq });
    }

    // Sort by score descending
    scoredWords.sort((a, b) => b.score - a.score);

    // Remove overlapping words (prefer higher-scoring ones)
    const selectedWords = [];
    const usedChars = new Set();

    for (const item of scoredWords) {
        const word = item.word;

        // For Chinese words, check character overlap with already selected
        if (/[\u4e00-\u9fa5]/.test(word)) {
            let hasOverlap = false;
            for (const char of word) {
                if (usedChars.has(char)) {
                    hasOverlap = true;
                    break;
                }
            }
            if (hasOverlap && selectedWords.length > 0) continue;
        }

        selectedWords.push(word);
        for (const char of word) {
            usedChars.add(char);
        }

        if (selectedWords.length >= maxKeywords) break;
    }

    return selectedWords;
}

/**
 * Infer category from content patterns
 * @param {string} content - Article plain text
 * @param {string} title - Article title
 * @returns {string} Category
 */
function inferCategory(content, title) {
    const text = `${title || ''} ${content || ''}`.toLowerCase();

    if (/通知|公告|告示|转发|决定|规定/.test(text)) return 'notice';
    if (/讲座|学术|论坛|研讨会|论文|科研|课题|项目|成果/.test(text)) return 'academic';
    if (/比赛|活动|赛事|运动会|文艺|晚会|比赛|竞赛|报名/.test(text)) return 'activity';
    if (/招聘|兼职|实习|就业|求职|人才|招聘|岗位/.test(text)) return 'service';
    if (/投票|评选|推荐|公示|名单|名单公示/.test(text)) return 'publicity';

    return 'other';
}

module.exports = {
    extractKeywords,
    inferCategory,
    CHINESE_STOPWORDS,
    ENGLISH_STOPWORDS
};

'use strict';

const { ERROR_CODES } = require('../common/constants');
const { extractArticleText } = require('../common/extractContent');
const { extractKeywords, inferCategory: inferCategoryKeyword } = require('../common/keywordExtractor');

/**
 * Regex-based parsing strategy
 * Extracts title, content, and publishTime using regex patterns
 * No AI dependency - suitable for well-structured HTML pages
 */
class RegexParseStrategy {
    constructor() {
        // Pre-compiled regex patterns for title extraction
        this._titlePatterns = [
            /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i,
            /<title[^>]*>([^<]+)<\/title>/i,
            /<h1[^>]*>([^<]+)<\/h1>/i,
            /<h2[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)<\/h2>/i
        ];

        // Date patterns - various formats used in Chinese websites
        this._datePatterns = [
            // ISO format: 2024-01-15 or 2024-01-15T10:30:00
            /(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?)/,
            // Chinese format: 2024年01月15日 or 2024年1月15日
            /(\d{4})年(\d{1,2})月(\d{1,2})日/,
            // Slash format: 2024/01/15
            /(\d{4}\/\d{2}\/\d{2})/,
            // Dot format: 2024.01.15
            /(\d{4}\.\d{2}\.\d{2})/,
            // English format: Jan 15, 2024 or January 15, 2024
            /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/i,
            // Relative patterns in meta tags
            /<meta\s+(?:property|name)=["'](?:pubdate|publishTime|article:published_time)["']\s+content=["']([^"']+)["']/i,
            // time tag: <time datetime="2024-01-15">2024-01-15</time>
            /<time[^>]+datetime=["']([^"']+)["']/i
        ];

        // Keywords that typically appear near the date in Chinese websites
        // Priority: more specific patterns first (发布于 > 发布时间 > 发表时间 > 日期 > time-like patterns)
        this._dateKeywords = [
            // 精确匹配 发布于、发布时间、发表时间、日期 等前缀
            /发布于[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/,
            /发布时间[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/,
            /发表时间[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/,
            /更新日期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/,
            /日期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/,
            // 日期格式在前的模式（如：2024年11月21日 发布）
            /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)\s*发布/
        ];
    }

    /**
     * Parse HTML content using regex patterns
     * @param {string} htmlContent - Raw HTML content
     * @param {Object} metadata - Article metadata (url, sourceId, sourceName, etc.)
     * @returns {Promise<{title: string, content: string, publishTime: string|null, summary: string, category: string, tags: string[], urgency: string, isValid: boolean}>}
     */
    async parse(htmlContent, metadata = {}) {
        try {
            const title = this._extractTitle(htmlContent);
            const publishTime = this._extractPublishTime(htmlContent);
            // Priority 3: HTTP Header Last-Modified fallback
            let finalPublishTime = publishTime;
            if (!finalPublishTime && metadata.httpHeaders) {
                finalPublishTime = this._extractLastModifiedFromHeader(metadata.httpHeaders);
                if (finalPublishTime) {
                    console.log('[RegexParseStrategy] 时间提取成功（HTTP Header Last-Modified）:', finalPublishTime);
                }
            }
            // Use the new extractArticleText to get clean article content
            const content = extractArticleText(htmlContent);
            const summary = this._extractSummary(content);
            const category = inferCategoryKeyword(content, title);
            const tags = extractKeywords(content, { maxKeywords: 5 });

            console.log('[RegexParseStrategy] ===== 解析结果 =====');
            console.log('[RegexParseStrategy] title:', title);
            console.log('[RegexParseStrategy] publishTime:', finalPublishTime);
            console.log('[RegexParseStrategy] content长度:', content?.length || 0);
            console.log('[RegexParseStrategy] category:', category);
            console.log('[RegexParseStrategy] tags:', tags);
            console.log('[RegexParseStrategy] isValid:', !!content && content.length > 50);

            return {
                title: title || this._extractTitleFromMetadata(metadata),
                content: content,
                publishTime: finalPublishTime,
                summary: summary,
                category: category,
                tags: tags,
                urgency: 'low',
                isValid: !!content && content.length > 50
            };
        } catch (e) {
            console.error('[RegexParseStrategy] Parse error:', e.message);
            throw {
                code: ERROR_CODES.PARSE_STRATEGY_ERROR,
                message: `Regex parsing failed: ${e.message}`
            };
        }
    }

    /**
     * Extract title using og:title, title tag, or h1
     */
    _extractTitle(htmlContent) {
        for (const pattern of this._titlePatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) {
                return this._cleanHtml(match[1].trim());
            }
        }
        return null;
    }

    /**
     * Extract publish time using various date patterns
     * Strategy:
     * 1. Try keyword-prefixed patterns in WHOLE HTML (not just title region)
     * 2. Verify the match is in meta info area (surrounded by source/author/editor tags)
     * 3. Try meta/time tags
     * 4. Fall back to general date patterns
     */
    _extractPublishTime(htmlContent) {
        // Step 1: Try keyword-prefixed patterns in WHOLE HTML with meta-area verification
        for (const pattern of this._dateKeywords) {
            // Use matchAll with global flag to find all occurrences
            const globalPattern = new RegExp(pattern.source, pattern.flags + 'g');
            const matches = [...htmlContent.matchAll(globalPattern)];
            for (const match of matches) {
                if (match[1]) {
                    const parsed = this._parseDate(match[1]);
                    if (parsed) {
                        // Verify this is in meta info area (check surrounding context)
                        const matchPos = match.index;
                        const contextStart = Math.max(0, matchPos - 200);
                        const contextEnd = Math.min(htmlContent.length, matchPos + match[0].length + 200);
                        const context = htmlContent.substring(contextStart, contextEnd).toLowerCase();

                        // Check if near meta info keywords (source, author, editor, etc.)
                        const isMetaArea = /来源|作者|编辑|审核|上传/.test(context);
                        if (isMetaArea) {
                            console.log('[RegexParseStrategy] 时间提取成功（关键字+元信息验证）:', parsed);
                            return parsed;
                        }
                    }
                }
            }
        }

        // Step 2: Try meta/time tags (structured, reliable)
        for (const pattern of this._datePatterns.slice(5)) { // meta and time tag patterns
            const match = htmlContent.match(pattern);
            if (match && match[1]) {
                const parsed = this._parseDate(match[1]);
                if (parsed) {
                    console.log('[RegexParseStrategy] 时间提取成功（Meta/Time标签）:', parsed);
                    return parsed;
                }
            }
        }

        // Step 3: Try title-adjacent region with general date patterns
        const titleRegion = this._extractTitleRegion(htmlContent);
        if (titleRegion) {
            for (const pattern of this._datePatterns.slice(0, 5)) { // non-meta patterns
                const match = titleRegion.match(pattern);
                if (match && match[1]) {
                    const dateStr = match[1].length === 4 ? match[0] : match[1];
                    const parsed = this._parseDate(dateStr);
                    if (parsed) {
                        console.log('[RegexParseStrategy] 时间提取成功（标题区域）:', parsed);
                        return parsed;
                    }
                }
            }
        }

        // Step 4: Fall back to general patterns in whole HTML
        for (const pattern of this._datePatterns.slice(0, 5)) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1].length === 4 ? match[0] : match[1];
                const parsed = this._parseDate(dateStr);
                if (parsed) {
                    console.log('[RegexParseStrategy] 时间提取成功（全HTML）:', parsed);
                    return parsed;
                }
            }
        }

        return null;
    }

    /**
     * Extract the region immediately following the title in HTML
     * This is typically where publish date info appears
     * @param {string} htmlContent - Raw HTML content
     * @returns {string|null} - The title-adjacent region, or null if title not found
     */
    _extractTitleRegion(htmlContent) {
        // Find the title position in HTML
        for (const pattern of this._titlePatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[0]) {
                const titlePos = htmlContent.indexOf(match[0]);
                if (titlePos !== -1) {
                    // Extract a region of ~2000 characters after the title
                    // (publish date usually appears within this range)
                    const startPos = titlePos + match[0].length;
                    const endPos = Math.min(startPos + 2000, htmlContent.length);
                    const region = htmlContent.substring(startPos, endPos);
                    console.log('[RegexParseStrategy] 截取标题区域，长度:', region.length);
                    return region;
                }
            }
        }
        return null;
    }

    /**
     * Parse various date formats to YYYY-MM-DD
     */
    _parseDate(dateStr) {
        if (!dateStr) return null;

        // ISO format
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
        }

        // Chinese format: 2024年01月15日
        const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (cnMatch) {
            const [, year, month, day] = cnMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Slash format: 2024/01/15
        if (/\d{4}\/\d{2}\/\d{2}/.test(dateStr)) {
            const normalized = dateStr.replace(/\//g, '-');
            const d = new Date(normalized);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
        }

        // Dot format: 2024.01.15
        if (/\d{4}\.\d{2}\.\d{2}/.test(dateStr)) {
            const normalized = dateStr.replace(/\./g, '-');
            const d = new Date(normalized);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
        }

        // Try direct parse
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }

        return null;
    }

    /**
     * Extract publish time from HTTP Response Header Last-Modified (Priority 3 fallback)
     * @param {Object} headers - HTTP response headers (lowercase keys from axios)
     * @returns {string|null} - ISO date string YYYY-MM-DD or null
     */
    _extractLastModifiedFromHeader(headers) {
        const lastModified = headers['last-modified'];
        if (!lastModified) {
            console.log('[RegexParseStrategy] [Priority 3] 无 Last-Modified header');
            return null;
        }

        const timestamp = Date.parse(lastModified);
        if (!timestamp || isNaN(timestamp)) {
            console.log('[RegexParseStrategy] [Priority 3] Last-Modified 解析失败:', lastModified);
            return null;
        }

        // Time validation: 2000-01-01 to now+1day
        const minTime = new Date('2000-01-01').getTime();
        const maxTime = Date.now() + 86400000; // +1 day in ms
        if (timestamp < minTime || timestamp > maxTime) {
            console.log('[RegexParseStrategy] [Priority 3] Last-Modified 时间超出合理范围:', lastModified, '->', timestamp, 'valid range:', minTime, '-', maxTime);
            return null;
        }

        const isoDate = new Date(timestamp).toISOString().split('T')[0];
        console.log('[RegexParseStrategy] [Priority 3] Last-Modified 提取成功:', lastModified, '->', isoDate);
        return isoDate;
    }

    /**
     * Extract summary from content (first 200 chars)
     */
    _extractSummary(content) {
        if (!content) return '';
        const clean = content.replace(/\s+/g, ' ').trim();
        if (clean.length <= 200) return clean;
        return clean.substring(0, 200);
    }

    /**
     * Remove HTML tags and decode entities
     */
    _cleanHtml(text) {
        if (!text) return '';

        // Decode HTML entities BEFORE stripping tags, so &amp;nbsp; -> &nbsp; -> ' '
        text = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&rsquo;/g, "'")
            .replace(/&lsquo;/g, "'")
            .replace(/&rdquo;/g, '"')
            .replace(/&ldquo;/g, '"')
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
            .replace(/&[a-z]+;/gi, ''); // Remove unknown named entities

        // Then strip remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        return text.trim();
    }

    /**
     * Extract title from metadata as fallback
     */
    _extractTitleFromMetadata(metadata) {
        return metadata.title || metadata.sourceName || '无标题';
    }
}

module.exports = RegexParseStrategy;

'use strict';

const { ERROR_CODES } = require('../common/constants');
const { extractArticleText } = require('../common/extractContent');

/**
 * Raw HTML passthrough strategy
 * Per D-09: If parseStrategy is 'no-parse' -> extract plain text without AI parsing
 * Falls back to HTML-stripped text and basic title extraction.
 */
class RawParseStrategy {
    constructor() {
        // Title extraction patterns (same as RegexParseStrategy)
        this._titlePatterns = [
            /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i,
            /<title[^>]*>([^<]+)<\/title>/i,
            /<h1[^>]*>([^<]+)<\/h1>/i,
            /<h2[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)<\/h2>/i
        ];
    }

    /**
     * Parse HTML content - extracts plain text and title from raw HTML
     * @param {string} htmlContent - Raw HTML content
     * @param {Object} metadata - Article metadata (url, sourceId, sourceName, etc.)
     * @returns {Promise<{title: string, content: string, publishTime: string|null, summary: string, category: string, tags: string[], urgency: string, isValid: boolean}>}
     */
    async parse(htmlContent, metadata = {}) {
        // Extract title from HTML first, then fall back to metadata
        const titleFromHtml = this._extractTitle(htmlContent);
        const title = titleFromHtml
            || metadata.title
            || metadata.sourceName
            || this._extractTitleFromUrl(metadata.url)
            || '无标题';

        // publishTime from metadata or null
        const publishTime = metadata.publishTime || null;

        // Use the new extractArticleText to get clean article content
        const plainText = extractArticleText(htmlContent);

        // Generate summary from first 200 chars of plain text
        const summary = this._generateSummary(plainText);

        // Infer category from content
        const category = this._inferCategory(plainText, title);

        console.log('[RawParseStrategy] ===== 解析结果 =====');
        console.log('[RawParseStrategy] title:', title);
        console.log('[RawParseStrategy] publishTime:', publishTime);
        console.log('[RawParseStrategy] content长度:', plainText?.length || 0);
        console.log('[RawParseStrategy] category:', category);
        console.log('[RawParseStrategy] isValid:', !!plainText && plainText.length > 50);

        return {
            title: title,
            content: plainText,   // Plain text, not raw HTML
            publishTime: publishTime,
            summary: summary,
            category: category,
            tags: [],
            urgency: 'low',
            isValid: !!plainText && plainText.length > 50
        };
    }

    /**
     * Extract title from HTML using og:title, title tag, or h1/h2
     */
    _extractTitle(htmlContent) {
        for (const pattern of this._titlePatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) {
                return this._cleanText(match[1].trim());
            }
        }
        return null;
    }

    /**
     * Decode HTML entities
     */
    _cleanText(text) {
        if (!text) return '';
        return text
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
            .replace(/&#\d+;/g, '')
            .replace(/&[a-z]+;/gi, '')
            .trim();
    }

    /**
     * Generate summary from plain text (first 200 chars)
     */
    _generateSummary(plainText) {
        if (!plainText) return '';
        const clean = plainText.replace(/\s+/g, ' ').trim();
        if (clean.length <= 200) return clean;
        return clean.substring(0, 200);
    }

    /**
     * Infer category from content patterns
     */
    _inferCategory(text, title) {
        const combined = `${title || ''} ${text || ''}`;

        if (/通知|公告|告示|转发/.test(combined)) return 'notice';
        if (/讲座|学术|论坛|研讨会|论文/.test(combined)) return 'academic';
        if (/比赛|活动|赛事|运动会|晚会/.test(combined)) return 'activity';
        if (/招聘|兼职|实习|就业/.test(combined)) return 'service';

        return 'other';
    }

    /**
     * Extract title from URL path as fallback
     */
    _extractTitleFromUrl(url) {
        if (!url) return null;

        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || '';
            const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

            if (nameWithoutExt && nameWithoutExt !== 'index' && nameWithoutExt !== 'html') {
                return decodeURIComponent(nameWithoutExt)
                    .replace(/[-_]/g, ' ')
                    .replace(/([a-z])([A-Z])/g, '$1 $2');
            }
        } catch (e) {
            // Invalid URL, ignore
        }

        return null;
    }
}

module.exports = RawParseStrategy;

'use strict';

/**
 * Extract main article content from HTML
 * Removes navigation, sidebar, footer, header, ads, and other non-content elements
 * Leaves only the core article body text.
 */

/**
 * Structural elements to completely remove (including their content)
 * Note: form is NOT removed here because VSB-generated pages use <form> as content container
 */
const REMOVE_TAGS = [
    /<script[\s\S]*?<\/script>/gi,
    /<style[\s\S]*?<\/style>/gi,
    /<nav[\s\S]*?<\/nav>/gi,
    /<header[\s\S]*?<\/header>/gi,
    /<footer[\s\S]*?<\/footer>/gi,
    /<aside[\s\S]*?<\/aside>/gi,
    /<noscript[\s\S]*?<\/noscript>/gi,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /<!--[\s\S]*?-->/g,
    /<button[\s\S]*?<\/button>/gi,
    /<input[\s\S]*?>/gi,
    /<select[\s\S]*?<\/select>/gi,
    /<textarea[\s\S]*?<\/textarea>/gi,
];

/**
 * Sidebar/menu/navigation class or id patterns
 */
const NOISE_SELECTORS = [
    /class=["'][^"']*(?:sidebar|side-bar|menu|nav|header|footer|breadcrumb|pagination|advertisement|ad-|ads-|related|recommend|popular|share|social|comment|toolbar|widget)[^"']*["']/gi,
    /id=["'][^"']*(?:sidebar|side-bar|menu|nav|header|footer|breadcrumb|pagination|advertisement|ad-|ads-|related|recommend|popular|share|social|comment|toolbar|widget)[^"']*["']/gi,
];

/**
 * Content area tag patterns (priority order)
 * Visual SiteBuilder (高校网站建站系统) 标准模式优先
 */
const CONTENT_SELECTORS = [
    // Visual SiteBuilder 标准内容容器（高校网站通用）
    /<div[^>]+class=["'][^"']*v_news_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["'][^"']*v_news_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*vsb_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["'][^"']*vsb_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    // 英文内容区域
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    // 中文内容区域
    /<div[^>]+class=["'][^"']*(?:neirong|nr|article-detail|content_2|con-box)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["'][^"']*(?:neirong|nr|article-detail|content_2|con-box)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    // 通用英文模式
    /<div[^>]+class=["'][^"']*(?:article|content|main|post|entry|body|text|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["'][^"']*(?:article|content|main|post|entry|body|text|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
];

/**
 * Remove tag patterns that match noise selectors
 */
const REMOVE_BY_SELECTOR = [
    /<div[^>]+class=["'][^"']*(?:sidebar|side-bar|menu|nav|header|footer|breadcrumb|pagination|advertisement|ad-|ads-|related|recommend|popular|share|social|comment|toolbar|widget)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<ul[^>]+class=["'][^"']*(?:sidebar|side-bar|menu|nav|header|footer|breadcrumb|pagination|advertisement|ad-|ads-|related|recommend|popular|share|social|comment|toolbar|widget)[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi,
    /<aside[^>]*>[\s\S]*?<\/aside>/gi,
];

function findTextDenseDiv(html) {
    if (!html || typeof html !== 'string') return '';
    const divs = html.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi);
    let best = { ratio: 0, content: '' };
    for (const m of divs) {
        const inner = m[1];
        const textOnly = inner.replace(/<[^>]+>/g, '').trim();
        if (textOnly.length < 50) continue;
        const pCount = (inner.match(/<p[^>]*>/gi) || []).length;
        const ratio = pCount > 0 ? textOnly.length / pCount : textOnly.length / 10;
        if (textOnly.length > 100 && ratio > best.ratio) {
            best = { ratio, content: inner };
        }
    }
    return best.content;
}

/**
 * Extract main content from HTML
 * Returns the cleaned HTML of the article body (still contains some inline tags)
 * @param {string} html - Raw HTML content
 * @returns {string} Cleaned HTML content (not plain text yet)
 */
function extractMainContent(html) {
    if (!html || typeof html !== 'string') return '';
    let content = html;
    console.log("[extractContent] 原始HTML长度:", html.length);

    // Step 1: Remove structural noise tags
    for (const pattern of REMOVE_TAGS) {
        content = content.replace(pattern, '');
    }

    // Step 2: Find content area FIRST
    let mainContent = '';
    for (const pattern of CONTENT_SELECTORS) {
        const match = content.match(pattern);
        if (match && match[1] && match[1].length > 50) {
            mainContent = match[1];
            console.log("[extractContent] 找到内容区域, 长度:", match[1].length);
            break;
        }
    }

    // Step 3: Text-density fallback
    if (!mainContent) {
        const textDense = findTextDenseDiv(content);
        if (textDense && textDense.length > 50) {
            mainContent = textDense;
            console.log("[extractContent] text-density fallback找到内容, 长度:", textDense.length);
        }
    }

    // Step 4: Body or full content fallback
    if (!mainContent) {
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        mainContent = bodyMatch ? bodyMatch[1] : content;
        console.log("[extractContent] 使用body或全文作为内容, 长度:", mainContent.length);
    }

    // Step 5: Remove noise within content only
    for (const pattern of REMOVE_BY_SELECTOR) {
        mainContent = mainContent.replace(pattern, '');
    }

    console.log("[extractContent] 最终内容长度:", mainContent.length);
    return mainContent;
}

/**
 * Strip all HTML tags and decode entities to get plain text
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function htmlToPlainText(html) {
    if (!html || typeof html !== 'string') return '';

    let text = html;

    // Remove remaining structural elements
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    text = text.replace(/<aside[\s\S]*?<\/aside>/gi, '');
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
    text = text.replace(/<form[\s\S]*?<\/form>/gi, '');
    text = text.replace(/<button[\s\S]*?<\/button>/gi, '');

    // Strip all remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
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
        .replace(/&[a-z]+;/gi, '');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

/**
 * Extract article content: find main content area and convert to plain text
 * This is the main entry point for strategies to use
 * @param {string} html - Raw HTML content
 * @returns {string} Clean plain text of the article
 */
function extractArticleText(html) {
    const mainContent = extractMainContent(html);
    return htmlToPlainText(mainContent);
}

module.exports = {
    extractMainContent,
    htmlToPlainText,
    extractArticleText
};

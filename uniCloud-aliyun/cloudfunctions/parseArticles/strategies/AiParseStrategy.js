'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { ERROR_CODES } = require('../common/constants');
const { extractArticleText } = require('../common/extractContent');

/**
 * AI-powered parsing strategy
 * Uses OpenAI-compatible API to extract structured content from HTML
 * AI model is configurable via config.json (per D-11)
 */
class AiParseStrategy {
    constructor() {
        this._config = null;
        this._apiKey = '';
    }

    /**
     * Resolve ${ENV_VAR} placeholder in config values.
     * Supports nested ${VAR} patterns.
     * Uses simple string operations to avoid regex escaping pitfalls.
     */
    _resolveEnv(value) {
        if (typeof value !== 'string') return value;
        const MAX_DEPTH = 3;
        let depth = 0;
        let resolved = value;
        while (depth < MAX_DEPTH) {
            // Check for ${...} pattern without regex
            if (!resolved.startsWith('${') || !resolved.endsWith('}')) break;
            const start = 2;
            const end = resolved.length - 1;
            if (end <= start) break;
            const envName = resolved.slice(start, end);
            const envVal = process.env[envName];
            if (envVal === undefined) break;
            resolved = envVal;
            depth++;
        }
        return resolved;
    }

    /**
     * Recursively resolve all ${ENV_VAR} placeholders in a config object.
     */
    _resolveConfigEnv(config) {
        if (!config) return config;
        const resolved = {};
        for (const [key, val] of Object.entries(config)) {
            if (typeof val === 'string' && val.startsWith('${')) {
                resolved[key] = this._resolveEnv(val);
            } else if (typeof val === 'object' && val !== null) {
                resolved[key] = this._resolveConfigEnv(val);
            } else {
                resolved[key] = val;
            }
        }
        return resolved;
    }

    /**
     * Load configuration from config.json
     * Supports ${ENV_VAR} placeholder syntax in config values
     */
    _loadConfig() {
        if (this._config) return this._config;

        // Load from strategies/config.json first
        const configPath = path.join(__dirname, 'config.json');
        try {
            if (fs.existsSync(configPath)) {
                const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this._config = this._resolveConfigEnv(rawConfig);
            }
        } catch (e) {
            console.error('[AiParseStrategy] Config load error:', e.message);
        }

        // Fallback defaults per D-11
        if (!this._config) {
            this._config = {
                aiModel: 'kimi-k2-turbo-preview',
                apiBase: 'https://api.moonshot.cn/v1/'
            };
        }

        // API key priority: env var > .env file > config.json
        this._apiKey = process.env.MOONSHOT_API_KEY || '';

        // Fallback: read .env file directly (for uniCloud environment where env vars may not be set)
        if (!this._apiKey) {
            const envPath = path.join(__dirname, '..', '..', '.env');
            try {
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const match = envContent.match(/^MOONSHOT_API_KEY\s*=\s*(.+)$/m);
                    if (match && match[1]) {
                        this._apiKey = match[1].trim();
                        console.log('[AiParseStrategy] 从 .env 文件加载了 API Key');
                    }
                } else {
                    console.log('[AiParseStrategy] .env 文件不存在:', envPath);
                }
            } catch (e) {
                console.error('[AiParseStrategy] .env 文件读取失败:', e.message);
            }
        }

        // Last fallback: parent config.json moonshot.apiKey
        if (!this._apiKey) {
            const parentConfigPath = path.join(__dirname, '..', 'config.json');
            try {
                if (fs.existsSync(parentConfigPath)) {
                    const rawParent = JSON.parse(fs.readFileSync(parentConfigPath, 'utf8'));
                    const parentConfig = this._resolveConfigEnv(rawParent);
                    this._apiKey = parentConfig.moonshot?.apiKey || '';
                    if (this._apiKey && !this._config.apiBase) {
                        this._config.apiBase = parentConfig.moonshot?.baseUrl || this._config.apiBase;
                    }
                }
            } catch (e) {
                console.error('[AiParseStrategy] Parent config load error:', e.message);
            }
        }

        // Final fallback: strategies/config.json apiKey (handle unresolved ${...} placeholder)
        if (!this._apiKey || this._apiKey.startsWith('${')) {
            const val = this._config.apiKey || '';
            if (val && !val.startsWith('${')) {
                this._apiKey = val;
            }
        }

        console.log('[AiParseStrategy] 最终 API Key 状态:', this._apiKey ? '已设置（' + this._apiKey.substring(0, 8) + '...' + '）' : '为空');

        return this._config;
    }

    /**
     * Parse HTML content using AI model
     * @param {string} htmlContent - Raw HTML content
     * @param {Object} metadata - Article metadata (url, sourceId, sourceName, etc.)
     * @returns {Promise<{title: string, content: string, publishTime: string|null, summary: string, category: string, tags: string[], urgency: string, isValid: boolean}>}
     */
    async parse(htmlContent, metadata = {}) {
        const config = this._loadConfig();
        const aiModel = config.aiModel;
        const apiBase = config.apiBase;

        if (!this._apiKey) {
            throw {
                code: ERROR_CODES.PARSE_STRATEGY_ERROR,
                message: 'AI API key not configured'
            };
        }

        // Step 1: Extract main article content first (remove nav, sidebar, footer, ads, etc.)
        const articleText = extractArticleText(htmlContent);

        // Step 2: Build prompt with cleaned article text (not raw HTML)
        const prompt = this._buildPrompt(articleText, htmlContent);

        try {
            const res = await axios.post(
                `${apiBase}chat/completions`,
                {
                    model: aiModel,
                    messages: [
                        { role: 'system', content: '返回JSON' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    response_format: { type: 'json_object' }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this._apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            const result = res.data.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(result);

            // Priority 3: HTTP Header Last-Modified fallback when AI returns null
            let finalPublishTime = parsed.publishTime || null;
            if (!finalPublishTime && metadata.httpHeaders) {
                finalPublishTime = this._extractLastModifiedFromHeader(metadata.httpHeaders);
                if (finalPublishTime) {
                    console.log('[AiParseStrategy] 时间提取成功（HTTP Header Last-Modified）:', finalPublishTime);
                }
            }

            // Use extracted article text as content, not AI's potentially incomplete output
            return {
                title: parsed.title || this._extractTitleFromMetadata(metadata),
                content: articleText,  // Use the cleaned article text
                publishTime: finalPublishTime,
                summary: parsed.summary || this._generateSummary(articleText),
                category: parsed.category || 'notice',
                tags: parsed.tags || [],
                urgency: parsed.urgency || 'low',
                isValid: parsed.isValid !== false && articleText.length > 50
            };
        } catch (e) {
            console.error('[AiParseStrategy] AI parse error:', e.message);
            throw {
                code: ERROR_CODES.PARSE_STRATEGY_ERROR,
                message: `AI parsing failed: ${e.message}`
            };
        }
    }

    /**
     * Build extraction prompt - receives cleaned article text instead of raw HTML
     * @param {string} articleText - Cleaned article plain text
     * @param {string} rawHtml - Raw HTML for time extraction only
     */
    _buildPrompt(articleText, rawHtml) {
        // Limit article text to prevent token overflow (first 8000 chars)
        const textPreview = articleText.substring(0, 8000);

        return `分析以下文章正文内容，提取结构化信息。

重要：
1. 只分析正文内容，不要包含导航菜单、侧边栏、页脚、广告等无关内容
2. 如果正文内容太短或为空，返回空内容
3. 摘要应该简洁，突出文章核心内容

正文内容：
${textPreview}

返回JSON格式（必须严格返回有效JSON）：
{
  "title": "文章标题（从正文中识别，如果无法确定则使用原文标题）",
  "publishTime": "YYYY-MM-DD格式的发布时间（如果正文中没有明确日期，则尝试从HTML中查找<meta>或<time>标签中的日期，如果都找不到则返回null）",
  "content": "正文内容（原样返回，保持完整性）",
  "summary": "50-100字的摘要，突出文章核心内容和目的",
  "category": "notice|academic|activity|service|other（根据内容判断）",
  "tags": ["标签1", "标签2"],
  "urgency": "high|medium|low（根据内容紧急程度判断）",
  "isValid": true或false（正文内容是否有意义）
}`;
    }

    /**
     * Generate summary from article text
     */
    _generateSummary(articleText) {
        if (!articleText) return '';
        const clean = articleText.replace(/\s+/g, ' ').trim();
        // Return first 150 chars as summary
        if (clean.length <= 150) return clean;
        return clean.substring(0, 150) + '...';
    }

    /**
     * Extract title from metadata as fallback
     */
    _extractTitleFromMetadata(metadata) {
        return metadata.title || metadata.sourceName || '无标题';
    }

    /**
     * Extract publish time from HTTP Response Header Last-Modified (Priority 3 fallback)
     * @param {Object} headers - HTTP response headers (lowercase keys from axios)
     * @returns {string|null} - ISO date string YYYY-MM-DD or null
     */
    _extractLastModifiedFromHeader(headers) {
        const lastModified = headers['last-modified'];
        if (!lastModified) {
            console.log('[AiParseStrategy] [Priority 3] 无 Last-Modified header');
            return null;
        }

        const timestamp = Date.parse(lastModified);
        if (!timestamp || isNaN(timestamp)) {
            console.log('[AiParseStrategy] [Priority 3] Last-Modified 解析失败:', lastModified);
            return null;
        }

        // Time validation: 2000-01-01 to now+1day
        const minTime = new Date('2000-01-01').getTime();
        const maxTime = Date.now() + 86400000; // +1 day in ms
        if (timestamp < minTime || timestamp > maxTime) {
            console.log('[AiParseStrategy] [Priority 3] Last-Modified 时间超出合理范围:', lastModified);
            return null;
        }

        const isoDate = new Date(timestamp).toISOString().split('T')[0];
        console.log('[AiParseStrategy] [Priority 3] Last-Modified 提取成功:', lastModified, '->', isoDate);
        return isoDate;
    }
}

module.exports = AiParseStrategy;

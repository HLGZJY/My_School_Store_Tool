'use strict';

const { ERROR_CODES } = require('./common/constants');
const httpGet = require('./common/httpGet');
const extractSourceIdFromUrl = require('./common/extractSourceIdFromUrl');

/**
 * Extract page links from HTML content
 */
function extractPageLinks(content, baseOrigin, basePath) {
    const links = [];
    const seen = new Set();

    // Article link pattern: 4+ digits + .htm[l]
    const articlePattern = /\d+\/(\d{4,})\.(htm|html?)$/i;

    const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)</gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
        let href = match[1].trim();
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

        // Resolve relative paths
        let fullUrl = href;
        if (href.startsWith('/')) {
            fullUrl = baseOrigin + href;
        } else if (href.startsWith('../')) {
            let base = basePath;
            const parts = href.split('/');
            for (const p of parts) {
                if (p === '..') base = base.substring(0, base.lastIndexOf('/'));
            }
            fullUrl = base + '/' + parts.filter(x => x && x !== '..').join('/');
        } else if (!href.startsWith('http')) {
            fullUrl = basePath + href;
        }
        fullUrl = fullUrl.split('#')[0].split('?')[0];

        // Fix /cxcy/scss/info/xxx format
        if (fullUrl.includes('/cxcy/')) {
            const infoMatch = fullUrl.match(/\/cxcy\/([^/]+)\/info\/\d+\/\d+\.htm/i);
            if (infoMatch) {
                const wrongPath = '/' + infoMatch[1] + '/info/';
                const correctPath = '/cxcy/info/';
                if (fullUrl.includes(wrongPath)) {
                    fullUrl = fullUrl.replace(wrongPath, correctPath);
                }
            }
        }

        // Filter: only keep 4+ digit article links
        if (!articlePattern.test(fullUrl)) {
            continue;
        }

        if (!seen.has(fullUrl)) {
            seen.add(fullUrl);
            links.push(fullUrl);
        }
    }
    return links;
}

/**
 * Extract all article links from a source URL (including pagination)
 * @param {string} listUrl - Source URL to extract from
 * @param {number} maxPages - Maximum pages to crawl
 * @param {Function} httpGet - HTTP GET function (injected dependency)
 */
async function extractLinksFromPage(listUrl, maxPages, httpGet) {
    const allLinks = [];
    const seen = new Set();

    // Base path
    let baseOrigin = '', basePath = '';
    try {
        const u = new URL(listUrl);
        baseOrigin = u.origin;
        basePath = listUrl.substring(0, listUrl.lastIndexOf('/') + 1);
    } catch {
        basePath = listUrl.substring(0, listUrl.lastIndexOf('/') + 1);
    }

    // 1. Get current page
    const currentPageResult = await httpGet(listUrl);
    if (!currentPageResult || currentPageResult.code !== ERROR_CODES.SUCCESS) {
        return {
            success: false,
            error: currentPageResult?.message || 'Failed to fetch page',
            statusCode: currentPageResult?.data?.statusCode || null
        };
    }

    const currentLinks = extractPageLinks(currentPageResult.data.content, baseOrigin, basePath);
    for (const link of currentLinks) {
        if (!seen.has(link)) {
            seen.add(link);
            allLinks.push(link);
        }
    }

    // 2. Detect pagination
    const page1Url = listUrl.replace(/(\.htm[l]?)$/, '/1$1');
    if (page1Url !== listUrl) {
        const page1Result = await httpGet(page1Url);
        if (page1Result && page1Result.code === ERROR_CODES.SUCCESS) {
            for (let page = 2; page <= maxPages; page++) {
                const pageUrl = listUrl.replace(/(\.htm[l]?)$/, `/${page}$1`);
                const pageResult = await httpGet(pageUrl);
                if (!pageResult || pageResult.code !== ERROR_CODES.SUCCESS) {
                    break;
                }

                const links = extractPageLinks(pageResult.data.content, baseOrigin, basePath);
                for (const link of links) {
                    if (!seen.has(link)) {
                        seen.add(link);
                        allLinks.push(link);
                    }
                }
            }
        }
    }

    return { success: true, links: allLinks };
}

/**
 * Extract URLs from a single source
 * @param {string} sourceUrl - Source URL
 * @param {number} maxPages - Max pages to crawl
 * @param {Function} httpGet - HTTP GET function (injected dependency)
 */
async function extractFromSingleSource(sourceUrl, maxPages, httpGet) {
    const errors = [];
    const sourceId = extractSourceIdFromUrl(sourceUrl);

    try {
        const result = await extractLinksFromPage(sourceUrl, maxPages, httpGet);
        if (!result.success) {
            errors.push({ message: result.error, statusCode: result.statusCode });
            return { sourceId, sourceUrl, urls: [], errors };
        }
        return { sourceId, sourceUrl, urls: result.links, errors: [] };
    } catch (e) {
        errors.push({ message: e.message });
        return { sourceId, sourceUrl, urls: [], errors };
    }
}

// ============ Handler Factory (Dependency Injection) ============

/**
 * Creates a urlExtractor handler with injectable dependencies
 * @param {Object} deps - Dependencies object
 * @param {Function} deps.httpGet - HTTP GET function (default: real httpGet)
 * @returns {Function} Async handler function (event, context)
 */
function createUrlExtractorHandler({ httpGet }) {
    return async function handler(event, context) {
        const { action, sourceUrls, maxPages = 10 } = event;

        // === extractUrls action: batch extraction from multiple sourceUrls ===
        if (action === 'extractUrls') {
            if (!sourceUrls || !Array.isArray(sourceUrls) || sourceUrls.length === 0) {
                return {
                    code: ERROR_CODES.PARAM_ERROR,
                    message: 'sourceUrls must be a non-empty array',
                    data: null
                };
            }

            // Use Promise.allSettled so one source failing does not affect others
            const results = await Promise.allSettled(
                sourceUrls.map(sourceUrl => extractFromSingleSource(sourceUrl, maxPages, httpGet))
            );

            // Normalize results: fulfilled values + rejected reasons
            const normalizedResults = results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return {
                        sourceId: extractSourceIdFromUrl(sourceUrls[index]),
                        sourceUrl: sourceUrls[index],
                        urls: [],
                        errors: [{ message: result.reason?.message || String(result.reason) }]
                    };
                }
            });

            // Summary
            const totalUrls = normalizedResults.reduce((sum, r) => sum + r.urls.length, 0);
            const totalErrors = normalizedResults.reduce((sum, r) => sum + r.errors.length, 0);

            return {
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: {
                    results: normalizedResults,
                    summary: {
                        totalSources: sourceUrls.length,
                        totalUrls,
                        totalErrors,
                        successfulSources: normalizedResults.filter(r => r.errors.length === 0).length,
                        failedSources: normalizedResults.filter(r => r.errors.length > 0).length
                    }
                }
            };
        }

        // === validateUrls action: optional 404 validation ===
        if (action === 'validateUrls') {
            const { urls, skipCheck = false } = event;

            if (!urls || !Array.isArray(urls)) {
                return {
                    code: ERROR_CODES.PARAM_ERROR,
                    message: 'urls must be an array',
                    data: null
                };
            }

            // If skipCheck is true, return all urls as valid immediately
            if (skipCheck) {
                return {
                    code: ERROR_CODES.SUCCESS,
                    message: 'success',
                    data: {
                        results: urls.map(url => ({ url, valid: true, statusCode: null })),
                        skipped: true
                    }
                };
            }

            // Validate each URL with HTTP HEAD/GET
            const validatePromises = urls.map(async (url) => {
                const result = await httpGet(url);
                if (result.code !== ERROR_CODES.SUCCESS) {
                    // Network/validation error for this URL
                    return {
                        url,
                        valid: false,
                        statusCode: result.data?.statusCode || null,
                        error: result.message,
                        validationError: true
                    };
                }
                const statusCode = result.data?.statusCode;
                return {
                    url,
                    valid: statusCode === 200,
                    statusCode,
                    validationError: false
                };
            });

            const validationResults = await Promise.allSettled(validatePromises);

            // Normalize results
            const normalizedValidation = validationResults.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return {
                        url: urls[index],
                        valid: false,
                        statusCode: null,
                        error: result.reason?.message || String(result.reason),
                        validationError: true
                    };
                }
            });

            const validCount = normalizedValidation.filter(r => r.valid).length;
            const invalidCount = normalizedValidation.filter(r => !r.valid).length;
            const errorCount = normalizedValidation.filter(r => r.validationError).length;

            // If any URL had a validation error (network failure), return URL_VALIDATE_ERROR
            const returnCode = errorCount > 0 ? ERROR_CODES.URL_VALIDATE_ERROR : ERROR_CODES.SUCCESS;

            return {
                code: returnCode,
                message: errorCount > 0 ? `${errorCount} URL(s) failed validation` : 'success',
                data: {
                    results: normalizedValidation,
                    summary: {
                        total: urls.length,
                        valid: validCount,
                        invalid: invalidCount,
                        validationErrors: errorCount,
                        skipped: false
                    }
                }
            };
        }

        // Unknown action
        return {
            code: ERROR_CODES.PARAM_ERROR,
            message: `Unknown action: ${action}. Supported actions: extractUrls, validateUrls`,
            data: null
        };
    };
}

// Export factory for testing with DI
exports.createHandler = createUrlExtractorHandler;
exports.extractPageLinks = extractPageLinks;

// Default handler for production use
exports.main = createUrlExtractorHandler({
    httpGet: require('./common/httpGet')
});

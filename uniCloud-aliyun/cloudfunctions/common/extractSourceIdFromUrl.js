'use strict';

/**
 * Extracts directory name from URL path as sourceId
 * e.g. https://www.scuec.edu.cn/bwc/tztg.htm → "bwc"
 *      https://www.scuec.edu.cn/cxcy/scss/info.htm → "scss"
 * @param {string} url - Source URL
 * @returns {string} sourceId (directory name) or empty string on error
 */
function extractSourceIdFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const dirPath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        const parts = dirPath.split('/').filter(p => p);
        return parts[parts.length - 1] || '';
    } catch (e) {
        console.error('[extractSourceIdFromUrl] Failed to extract sourceId:', e.message);
        return '';
    }
}

module.exports = extractSourceIdFromUrl;

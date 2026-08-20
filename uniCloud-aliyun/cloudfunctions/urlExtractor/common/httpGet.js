'use strict';

const axios = require('axios');
const { ERROR_CODES } = require('./constants');

/**
 * Shared HTTP GET utility with timeout and error envelope
 * @param {string} url - Target URL
 * @param {Object} options - Optional configuration
 * @param {number} options.timeout - Timeout in ms (default: 15000)
 * @param {Object} options.headers - Additional headers
 * @returns {Promise<{code: number, message: string, data: any}>} Error envelope format
 */
async function httpGet(url, options = {}) {
    const timeout = options.timeout || 15000;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...(options.headers || {})
    };

    try {
        const res = await axios.get(url, {
            timeout,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers
        });
        return {
            code: ERROR_CODES.SUCCESS,
            message: 'success',
            data: {
                statusCode: res.status,
                content: res.data
            }
        };
    } catch (e) {
        const statusCode = e.response?.status || null;
        const errorMsg = e.response
            ? `HTTP ${statusCode}: ${e.message}`
            : `Network error: ${e.message}`;
        console.error('[httpGet] Request failed:', errorMsg);
        return {
            code: ERROR_CODES.URL_EXTRACT_ERROR,
            message: errorMsg,
            data: { statusCode }
        };
    }
}

module.exports = httpGet;

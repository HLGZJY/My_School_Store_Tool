'use strict';

const crypto = require('crypto');

/**
 * Sanitization utilities for security hardening
 */

/**
 * Validate regex pattern to prevent ReDoS attacks
 * @param {string} pattern - Regex pattern to validate
 * @returns {Object} { valid: boolean, safePattern: string }
 */
function validateRegexPattern(pattern) {
    if (!pattern || typeof pattern !== 'string') {
        return { valid: false, safePattern: '' };
    }

    // Check for patterns that could cause ReDoS (exponential backtracking)
    // Dangerous patterns: nested quantifiers (a+)+, (a*)*, (a?)*, etc.
    const dangerousPatterns = [
        /\([^)]*[\+\*\?][\+\*\?]*/,  // nested quantifiers in parentheses
        /\([\s\S]*[\+\*\?][\+\*\?][\s\S]*\)/,  // complex nested
    ];

    for (const danger of dangerousPatterns) {
        if (danger.test(pattern)) {
            console.warn('[sanitize] Potentially dangerous regex pattern blocked:', pattern);
            return { valid: false, safePattern: '' };
        }
    }

    // Limit pattern length to prevent excessive backtracking
    if (pattern.length > 200) {
        console.warn('[sanitize] Regex pattern too long, truncated');
        return { valid: false, safePattern: '' };
    }

    return { valid: true, safePattern: pattern };
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';

    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
}

/**
 * Sanitize nickname for safe storage
 * - Removes control characters
 * - Limits length
 * - Escapes HTML
 * @param {string} nickname - Nickname to sanitize
 * @returns {string} Sanitized nickname
 */
function sanitizeNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') {
        return '微信用户';
    }

    // Remove control characters (except newline/tab which are allowed in some contexts)
    let sanitized = nickname.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length to 50 characters
    if (sanitized.length > 50) {
        sanitized = sanitized.substring(0, 50);
    }

    // If empty after sanitization, use default
    if (!sanitized) {
        return '微信用户';
    }

    // Escape HTML to prevent XSS
    return escapeHtml(sanitized);
}

/**
 * Create HMAC signature for token
 * @param {string} payload - Token payload string
 * @param {string} secret - Secret key
 * @returns {string} Base64 signature
 */
function createSignature(payload, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');
}

/**
 * Verify HMAC signature
 * @param {string} payload - Token payload string
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} True if signature valid
 */
function verifySignature(payload, signature, secret) {
    const expected = createSignature(payload, secret);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        );
    } catch {
        return false;
    }
}

module.exports = {
    validateRegexPattern,
    escapeHtml,
    sanitizeNickname,
    createSignature,
    verifySignature
};

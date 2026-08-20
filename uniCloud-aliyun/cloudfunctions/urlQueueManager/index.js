'use strict';

const db = uniCloud.database();
const { ERROR_CODES } = require('../common/constants');
const extractSourceIdFromUrl = require('../common/extractSourceIdFromUrl');

/**
 * URL Queue Manager Cloud Function
 * Handles CRUD operations for the url_queue collection.
 * Per D-05: Link CRUD operations moved from extractUrls to urlQueueManager.
 */

// ============ Helper ============

/**
 * Build error response envelope
 * @param {number} code - ERROR_CODES value
 * @param {string} message - Human-readable message
 * @param {*} [data] - Optional data payload
 */
function errorResp(code, message, data = null) {
    return { code, message, data };
}

/**
 * Build success response envelope
 * @param {*} data - Data payload
 */
function successResp(data) {
    return {
        code: ERROR_CODES.SUCCESS,
        message: 'success',
        data
    };
}

// ============ getHistory ============

/**
 * Get extraction history grouped by source
 * @param {Object} params - { sourceId?, limit?, offset? }
 * @returns {Promise<Object>} { history: [], total }
 */
async function getHistory({ sourceId, limit = 50, offset = 0 } = {}) {
    try {
        let query = db.collection('url_queue');

        // Filter by sourceId if provided
        if (sourceId) {
            query = query.where({ sourceId: sourceId });
        }

        // Get all matching records with fields needed for grouping
        const result = await query
            .field({
                sourceUrl: true,
                sourceId: true,
                sourceName: true,
                category: true,
                status: true,
                fetchTime: true
            })
            .get();

        // Group by sourceUrl
        const groupMap = new Map();
        for (const item of result.data) {
            const key = item.sourceUrl;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    sourceUrl: item.sourceUrl,
                    sourceId: item.sourceId,
                    sourceName: item.sourceName,
                    category: item.category,
                    totalCount: 0,
                    processedCount: 0,
                    pendingCount: 0,
                    failedCount: 0,
                    lastFetchTime: item.fetchTime
                });
            }
            const group = groupMap.get(key);
            group.totalCount++;
            if (item.status === 'processed') group.processedCount++;
            else if (item.status === 'pending') group.pendingCount++;
            else if (item.status === 'failed') group.failedCount++;
            if (item.fetchTime > group.lastFetchTime) {
                group.lastFetchTime = item.fetchTime;
            }
        }

        const history = Array.from(groupMap.values());

        // Apply pagination
        const total = history.length;
        const paginatedHistory = history.slice(offset, offset + limit);

        return successResp({
            history: paginatedHistory,
            total: total
        });
    } catch (e) {
        console.error('[urlQueueManager] getHistory error:', e);
        return errorResp(ERROR_CODES.DATABASE_ERROR, '获取历史记录失败: ' + e.message);
    }
}

// ============ getAllLinks ============

/**
 * Get all links with optional filters and pagination
 * @param {Object} params - { sourceId?, status?, limit?, offset? }
 * @returns {Promise<Object>} { links: [], total }
 */
async function getAllLinks({ sourceId, status, limit = 50, offset = 0 } = {}) {
    try {
        let query = db.collection('url_queue');

        // Filter by sourceId if provided (extracted from sourceUrl)
        if (sourceId) {
            query = query.where({ sourceId: sourceId });
        }

        // Filter by status if provided
        if (status) {
            query = query.where({ status: status });
        }

        const skip = offset;
        const linksResult = await query
            .orderBy('fetchTime', 'desc')
            .skip(skip)
            .limit(limit)
            .get();

        const countResult = await query.count();

        // Detect abnormal links (normal article URLs should be < 200 chars)
        const links = linksResult.data.map(link => ({
            ...link,
            isAbnormal: link.url && (link.url.length < 10 || link.url.length > 200)
        }));

        return successResp({
            links: links,
            total: countResult.total,
            limit: limit,
            offset: offset
        });
    } catch (e) {
        console.error('[urlQueueManager] getAllLinks error:', e);
        return errorResp(ERROR_CODES.DATABASE_ERROR, '获取链接列表失败: ' + e.message);
    }
}

// ============ deleteLink ============

/**
 * Delete a single link by urlId (_id)
 * @param {Object} params - { urlId }
 * @returns {Promise<Object>} { deleted: 1 }
 */
async function deleteLink({ urlId } = {}) {
    if (!urlId) {
        return errorResp(ERROR_CODES.PARAM_ERROR, 'urlId 不能为空');
    }

    try {
        const result = await db.collection('url_queue').doc(urlId).remove();
        return successResp({ deleted: 1 });
    } catch (e) {
        console.error('[urlQueueManager] deleteLink error:', e);
        return errorResp(ERROR_CODES.DATABASE_ERROR, '删除链接失败: ' + e.message);
    }
}

// ============ deleteLinks ============

/**
 * Delete multiple links by urlIds
 * @param {Object} params - { urlIds: string[] }
 * @returns {Promise<Object>} { deleted: count }
 */
async function deleteLinks({ urlIds } = {}) {
    if (!urlIds || !Array.isArray(urlIds) || urlIds.length === 0) {
        return errorResp(ERROR_CODES.PARAM_ERROR, 'urlIds 不能为空');
    }

    try {
        let deletedCount = 0;
        for (const urlId of urlIds) {
            await db.collection('url_queue').doc(urlId).remove();
            deletedCount++;
        }
        return successResp({ deleted: deletedCount });
    } catch (e) {
        console.error('[urlQueueManager] deleteLinks error:', e);
        return errorResp(ERROR_CODES.DATABASE_ERROR, '批量删除链接失败: ' + e.message);
    }
}

// ============ updateLink ============

/**
 * Update link fields by urlId
 * @param {Object} params - { urlId, updates }
 * @returns {Promise<Object>} { updated: 1 }
 */
async function updateLink({ urlId, updates } = {}) {
    if (!urlId) {
        return errorResp(ERROR_CODES.PARAM_ERROR, 'urlId 不能为空');
    }

    if (!updates || typeof updates !== 'object') {
        return errorResp(ERROR_CODES.PARAM_ERROR, 'updates 不能为空');
    }

    try {
        // Always update updateTime
        const updateData = {
            ...updates,
            updateTime: Date.now()
        };

        // If newUrl is provided in updates, also reset status to pending
        if (updates.newUrl) {
            updateData.url = updates.newUrl;
            updateData.status = 'pending';
            updateData.error = null;
        }

        await db.collection('url_queue').doc(urlId).update(updateData);
        return successResp({ updated: 1 });
    } catch (e) {
        console.error('[urlQueueManager] updateLink error:', e);
        return errorResp(ERROR_CODES.DATABASE_ERROR, '更新链接失败: ' + e.message);
    }
}

// ============ Main Handler ============

exports.main = async (event, context) => {
    const { action } = event;

    if (!action) {
        return errorResp(ERROR_CODES.PARAM_ERROR, 'action 不能为空');
    }

    switch (action) {
        case 'getHistory':
            return getHistory(event);

        case 'getAllLinks':
            return getAllLinks(event);

        case 'deleteLink':
            return deleteLink(event);

        case 'deleteLinks':
            return deleteLinks(event);

        case 'updateLink':
            return updateLink(event);

        default:
            return errorResp(ERROR_CODES.PARAM_ERROR, `Unknown action: ${action}`);
    }
};

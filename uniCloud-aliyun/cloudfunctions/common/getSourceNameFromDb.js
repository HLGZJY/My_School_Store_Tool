'use strict';

const db = uniCloud.database();

/**
 * Looks up source name from sources collection by sourceId
 * @param {string} sourceId - Source identifier
 * @returns {Promise<string|null>} sourceName or null if not found
 */
async function getSourceNameFromDb(sourceId) {
    if (!sourceId) return null;

    try {
        const result = await db.collection('sources').where({ sourceId }).get();
        if (result.data && result.data.length > 0) {
            return result.data[0].sourceName;
        }
    } catch (e) {
        console.error('[getSourceNameFromDb] Query failed:', e.message);
    }
    return null;
}

module.exports = getSourceNameFromDb;

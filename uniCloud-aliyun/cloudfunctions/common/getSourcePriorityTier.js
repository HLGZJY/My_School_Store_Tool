'use strict';
const db = uniCloud.database();
async function getSourcePriorityTier(sourceId) {
    if (!sourceId) return null;
    try {
        const result = await db.collection('sources').where({ sourceId }).get();
        if (result.data && result.data.length > 0) {
            return result.data[0].classification?.priorityTier || null;
        }
    } catch (e) {
        console.error('[getSourcePriorityTier] Query failed:', e.message);
    }
    return null;
}
module.exports = getSourcePriorityTier;
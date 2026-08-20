'use strict';

const db = uniCloud.database();
const { requireAdmin } = require('../common/verifyAdmin');

// Tier retention periods (per D-02): tier1=permanent(null), tier2=2years, tier3=6months
const TIER_RETENTION_MS = {
    tier1: null,
    tier2: 2 * 365 * 24 * 60 * 60 * 1000,
    tier3: 6 * 30 * 24 * 60 * 60 * 1000
};

function computeExpireAt(publishTime, priorityTier) {
    if (!priorityTier || priorityTier === 'tier1') return null;
    const retentionMs = TIER_RETENTION_MS[priorityTier];
    if (!retentionMs) return null;
    return publishTime + retentionMs;
}

exports.main = async (event, context) => {
    const { openid, batchSize = 100 } = event;

    // Admin authentication
    if (!openid) {
        return { code: 403, message: '缺少openid', data: null };
    }
    try {
        await requireAdmin(openid);
    } catch (e) {
        return { code: e.code || 403, message: e.message, data: null };
    }

    let processed = 0;
    let errors = 0;
    const batch = parseInt(batchSize, 10) || 100;

    try {
        // Batch fetch all sources into tierBySourceId map
        const allSources = await db.collection('sources').get();
        const tierBySourceId = new Map();
        if (allSources.data) {
            for (const src of allSources.data) {
                if (src.sourceId && src.classification?.priorityTier) {
                    tierBySourceId.set(src.sourceId, src.classification.priorityTier);
                }
            }
        }
        console.log('[migrateArticlesExpireAt] Loaded', tierBySourceId.size, 'sources with priorityTier');

        let hasMore = true;
        while (hasMore) {
            // Query articles where expireAt is null (unmigrated)
            const articlesToMigrate = await db.collection('articles')
                .where({ expireAt: null })
                .limit(batch)
                .get();

            if (!articlesToMigrate.data || articlesToMigrate.data.length === 0) {
                hasMore = false;
                break;
            }

            console.log('[migrateArticlesExpireAt] Batch of', articlesToMigrate.data.length, 'articles to migrate');

            for (const article of articlesToMigrate.data) {
                try {
                    const priorityTier = tierBySourceId.get(article.sourceId) || null;
                    const expireAt = computeExpireAt(article.publishTime || Date.now(), priorityTier);

                    await db.collection('articles').doc(article._id).update({
                        expireAt: expireAt,
                        updatedAt: Date.now()
                    });
                    processed++;
                } catch (e) {
                    console.error('[migrateArticlesExpireAt] Failed to update article', article._id, e.message);
                    errors++;
                }
            }

            if (articlesToMigrate.data.length < batch) {
                hasMore = false;
            }
        }

        console.log('[migrateArticlesExpireAt] Done. processed:', processed, 'errors:', errors);
        return {
            code: 0,
            message: 'success',
            data: { processed, errors }
        };
    } catch (e) {
        console.error('[migrateArticlesExpireAt] Migration failed:', e);
        return {
            code: 500,
            message: 'Migration failed: ' + e.message,
            data: { processed, errors }
        };
    }
};

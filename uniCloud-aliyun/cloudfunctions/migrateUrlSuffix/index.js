'use strict';

const db = uniCloud.database();
const { requireAdmin } = require('../common/verifyAdmin');

/**
 * Extract base URL (origin + first path segment) from sourceUrl
 * Example: https://www.scuec.edu.cn/cxcy/scss/jstz.htm → https://www.scuec.edu.cn/cxcy
 */
function extractBaseUrl(sourceUrl) {
    try {
        const u = new URL(sourceUrl);
        const parts = u.pathname.split('/').filter(Boolean);
        u.pathname = parts.length >= 1 ? '/' + parts[0] : '/';
        return u.origin + u.pathname;
    } catch {
        return sourceUrl;
    }
}

exports.main = async (event, context) => {
    const { openid, batchSize = 100, dryRun = true } = event;

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
    let skipped = 0;
    let errors = 0;
    const batch = parseInt(batchSize, 10) || 100;

    try {
        console.log('[migrateUrlSuffix] Starting migration', { batchSize, dryRun });

        let hasMore = true;

        while (hasMore) {
            // Query url_queue records that have url but no urlSuffix
            const recordsToMigrate = await db.collection('url_queue')
                .where({
                    url: db.command.exists(true)
                })
                .limit(batch)
                .get();

            if (!recordsToMigrate.data || recordsToMigrate.data.length === 0) {
                hasMore = false;
                break;
            }

            // Filter to only those without urlSuffix
            const unmigrated = recordsToMigrate.data.filter(r => !r.urlSuffix);
            if (unmigrated.length === 0) {
                hasMore = false;
                break;
            }

            console.log('[migrateUrlSuffix] Batch of', unmigrated.length, 'records to migrate');

            for (const record of unmigrated) {
                try {
                    if (!record.sourceUrl) {
                        console.warn(`[migrateUrlSuffix] Skipping ${record._id}: no sourceUrl`);
                        skipped++;
                        continue;
                    }

                    const baseUrl = extractBaseUrl(record.sourceUrl);
                    let urlSuffix;

                    if (record.url && record.url.startsWith(baseUrl)) {
                        urlSuffix = record.url.substring(baseUrl.length) || '/';
                    } else {
                        // Fallback: extract pathname from url
                        try {
                            const u = new URL(record.url);
                            urlSuffix = u.pathname;
                        } catch {
                            console.warn(`[migrateUrlSuffix] Cannot extract suffix for ${record._id}: ${record.url}`);
                            skipped++;
                            continue;
                        }
                    }

                    if (dryRun) {
                        console.log(`[migrateUrlSuffix] Dry run: would set urlSuffix=${urlSuffix} for ${record._id} (url=${record.url})`);
                    } else {
                        await db.collection('url_queue').doc(record._id).update({
                            urlSuffix: urlSuffix,
                            updateTime: Date.now()
                        });
                        console.log(`[migrateUrlSuffix] Set urlSuffix=${urlSuffix} for ${record._id}`);
                    }

                    processed++;
                } catch (e) {
                    console.error(`[migrateUrlSuffix] Error processing ${record._id}:`, e.message);
                    errors++;
                }
            }

            if (recordsToMigrate.data.length < batch) {
                hasMore = false;
            }
        }

        const result = { processed, skipped, errors, dryRun };
        console.log('[migrateUrlSuffix] Migration complete:', result);

        return {
            code: 0,
            message: dryRun ? 'Dry run complete' : 'Migration complete',
            data: result
        };
    } catch (e) {
        console.error('[migrateUrlSuffix] Migration failed:', e);
        return {
            code: 500,
            message: 'Migration failed: ' + e.message,
            data: { processed, skipped, errors }
        };
    }
};

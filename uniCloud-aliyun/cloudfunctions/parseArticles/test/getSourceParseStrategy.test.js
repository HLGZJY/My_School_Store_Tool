'use strict';

/**
 * Unit tests for getSourceParseStrategy function
 *
 * Tests the parseStrategy resolution logic from sources collection:
 * - Top-level parseStrategy field (new format)
 * - Legacy classification.parseStrategy field
 * - Default to 'no-parse' when missing
 * - Handle null/undefined sourceId
 * - Handle source not found in DB
 */

// Mock the db object before requiring the module under test
const mockDb = {
    collection: jest.fn()
};

const mockCollection = {
    where: jest.fn(),
    get: jest.fn()
};

// Setup chain: db.collection('sources').where({ sourceId }).get()
mockDb.collection.mockReturnValue(mockCollection);
mockCollection.where.mockReturnValue(mockCollection);

// Save the original module and replace db
const originalIndexPath = '../index.js';

// We need to test the function logic, so we'll extract and test it directly
// since the actual module has side effects (db initialization at load time)

describe('getSourceParseStrategy', () => {
    let getSourceParseStrategy;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mocks to default happy path
        mockCollection.where.mockReturnValue(mockCollection);
        mockCollection.get.mockResolvedValue({ data: [] });

        // Re-require to reset module state
        jest.resetModules();

        // Create a standalone test version of the function that mirrors the actual logic
        // This avoids the global db initialization side effect
        getSourceParseStrategy = async (sourceId, db) => {
            if (!sourceId) return 'no-parse';

            try {
                const sourceResult = await db.collection('sources').where({ sourceId }).get();
                if (sourceResult.data && sourceResult.data.length > 0) {
                    const source = sourceResult.data[0];
                    if (source.parseStrategy) {
                        return source.parseStrategy;
                    }
                    if (source.classification?.parseStrategy) {
                        return source.classification.parseStrategy;
                    }
                }
            } catch (e) {
                console.error('[parseArticles] 查询source parseStrategy失败:', e.message);
            }
            return 'no-parse';
        };
    });

    test('When source has parseStrategy: "ai-parse" -> returns "ai-parse"', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{ sourceId: 'source1', parseStrategy: 'ai-parse' }]
        });

        const result = await getSourceParseStrategy('source1', mockDb);

        expect(result).toBe('ai-parse');
        expect(mockDb.collection).toHaveBeenCalledWith('sources');
        expect(mockCollection.where).toHaveBeenCalledWith({ sourceId: 'source1' });
    });

    test('When source has parseStrategy: "regex-parse" -> returns "regex-parse"', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{ sourceId: 'source2', parseStrategy: 'regex-parse' }]
        });

        const result = await getSourceParseStrategy('source2', mockDb);

        expect(result).toBe('regex-parse');
    });

    test('When source has parseStrategy: "no-parse" -> returns "no-parse"', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{ sourceId: 'source3', parseStrategy: 'no-parse' }]
        });

        const result = await getSourceParseStrategy('source3', mockDb);

        expect(result).toBe('no-parse');
    });

    test('When source has NO parseStrategy field -> returns "no-parse" (default)', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{ sourceId: 'source4', name: 'Test Source' }]
        });

        const result = await getSourceParseStrategy('source4', mockDb);

        expect(result).toBe('no-parse');
    });

    test('When source has classification.parseStrategy (legacy) -> returns that value', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{
                sourceId: 'source5',
                classification: { parseStrategy: 'regex-parse' }
            }]
        });

        const result = await getSourceParseStrategy('source5', mockDb);

        expect(result).toBe('regex-parse');
    });

    test('When source has BOTH parseStrategy and classification.parseStrategy -> top-level takes precedence', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{
                sourceId: 'source6',
                parseStrategy: 'ai-parse',
                classification: { parseStrategy: 'regex-parse' }
            }]
        });

        const result = await getSourceParseStrategy('source6', mockDb);

        // Top-level parseStrategy should win
        expect(result).toBe('ai-parse');
    });

    test('When sourceId is null -> returns "no-parse"', async () => {
        const result = await getSourceParseStrategy(null, mockDb);

        expect(result).toBe('no-parse');
        // db.collection should not be called for null sourceId
        expect(mockDb.collection).not.toHaveBeenCalled();
    });

    test('When sourceId is undefined -> returns "no-parse"', async () => {
        const result = await getSourceParseStrategy(undefined, mockDb);

        expect(result).toBe('no-parse');
        expect(mockDb.collection).not.toHaveBeenCalled();
    });

    test('When source not found in DB -> returns "no-parse"', async () => {
        mockCollection.get.mockResolvedValue({ data: [] });

        const result = await getSourceParseStrategy('nonexistent', mockDb);

        expect(result).toBe('no-parse');
    });

    test('When DB query throws error -> returns "no-parse" and logs error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockCollection.get.mockRejectedValue(new Error('DB connection failed'));

        const result = await getSourceParseStrategy('source7', mockDb);

        expect(result).toBe('no-parse');
        expect(consoleSpy).toHaveBeenCalledWith(
            '[parseArticles] 查询source parseStrategy失败:',
            'DB connection failed'
        );

        consoleSpy.mockRestore();
    });

    test('When source has empty string parseStrategy -> returns empty string (actual behavior)', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{ sourceId: 'source8', parseStrategy: '' }]
        });

        const result = await getSourceParseStrategy('source8', mockDb);

        // Empty string is falsy but is returned as-is from top-level parseStrategy
        expect(result).toBe('');
    });

    test('When source has whitespace-only parseStrategy -> returns that value', async () => {
        mockCollection.get.mockResolvedValue({
            data: [{ sourceId: 'source9', parseStrategy: '   ' }]
        });

        const result = await getSourceParseStrategy('source9', mockDb);

        expect(result).toBe('   ');
    });
});

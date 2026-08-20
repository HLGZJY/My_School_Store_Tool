/**
 * Integration tests for urlExtractor handler actions
 * Tests extractUrls and validateUrls actions with mocked HTTP
 */

const nock = require('nock');
const { createHandler } = require('../../uniCloud-aliyun/cloudfunctions/urlExtractor/index');
const { ERROR_CODES } = require('../../uniCloud-aliyun/cloudfunctions/urlExtractor/common/constants');

describe('urlExtractor handler actions', () => {
    let handler;
    let mockHttpGet;

    beforeEach(() => {
        // Create a mock httpGet for each test
        mockHttpGet = jest.fn();
        handler = createHandler({ httpGet: mockHttpGet });
        // Clean up any pending nock scopes
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('extractUrls action', () => {
        it('extracts URLs from single source with mocked HTTP', async () => {
            const sourceUrl = 'https://example.com/list.htm';
            const articleUrl = 'https://example.com/news/2024/1234.htm';
            const htmlContent = `<html><body><a href="/news/2024/1234.htm">Article</a></body></html>`;

            // Mock httpGet for the list page and pagination
            mockHttpGet
                .mockResolvedValueOnce({
                    code: ERROR_CODES.SUCCESS,
                    message: 'success',
                    data: { statusCode: 200, content: htmlContent }
                })
                // No pagination detected (page1 differs from original)

            const result = await handler({
                action: 'extractUrls',
                sourceUrls: [sourceUrl],
                maxPages: 10
            }, {});

            expect(result.code).toBe(ERROR_CODES.SUCCESS);
            expect(result.data.results).toHaveLength(1);
            expect(result.data.results[0].sourceUrl).toBe(sourceUrl);
            expect(result.data.results[0].urls).toContain(articleUrl);
            expect(result.data.summary.totalUrls).toBe(1);
        });

        it('extracts URLs from multiple sources', async () => {
            const source1 = 'https://site1.com/list.htm';
            const source2 = 'https://site2.com/page.htm';
            const html1 = `<html><body><a href="/info/2024/1111.htm">A1</a></body></html>`;
            const html2 = `<html><body><a href="/news/2025/2222.htm">A2</a></body></html>`;

            mockHttpGet
                .mockResolvedValueOnce({
                    code: ERROR_CODES.SUCCESS,
                    message: 'success',
                    data: { statusCode: 200, content: html1 }
                })
                .mockResolvedValueOnce({
                    code: ERROR_CODES.SUCCESS,
                    message: 'success',
                    data: { statusCode: 200, content: html2 }
                });

            const result = await handler({
                action: 'extractUrls',
                sourceUrls: [source1, source2],
                maxPages: 10
            }, {});

            expect(result.code).toBe(ERROR_CODES.SUCCESS);
            expect(result.data.results).toHaveLength(2);
            expect(result.data.summary.totalSources).toBe(2);
            expect(result.data.summary.totalUrls).toBe(2);
        });

        it('captures HTTP errors in results', async () => {
            const sourceUrl = 'https://example.com/list.htm';

            mockHttpGet.mockResolvedValueOnce({
                code: ERROR_CODES.URL_EXTRACT_ERROR,
                message: 'Network error: getaddrinfo ENOTFOUND',
                data: { statusCode: null }
            });

            const result = await handler({
                action: 'extractUrls',
                sourceUrls: [sourceUrl],
                maxPages: 10
            }, {});

            expect(result.code).toBe(ERROR_CODES.SUCCESS);
            expect(result.data.results[0].errors).toHaveLength(1);
            expect(result.data.results[0].errors[0].message).toContain('Network error');
            expect(result.data.summary.failedSources).toBe(1);
        });

        it('returns PARAM_ERROR for empty sourceUrls', async () => {
            const result = await handler({
                action: 'extractUrls',
                sourceUrls: []
            }, {});

            expect(result.code).toBe(ERROR_CODES.PARAM_ERROR);
            expect(result.message).toContain('sourceUrls must be a non-empty array');
        });

        it('returns PARAM_ERROR when sourceUrls is not an array', async () => {
            const result = await handler({
                action: 'extractUrls',
                sourceUrls: 'not-an-array'
            }, {});

            expect(result.code).toBe(ERROR_CODES.PARAM_ERROR);
        });
    });

    describe('validateUrls action', () => {
        it('validates URLs with mocked HTTP - all valid', async () => {
            const testUrl = 'https://example.com/article.htm';

            mockHttpGet.mockResolvedValueOnce({
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: { statusCode: 200 }
            });

            const result = await handler({
                action: 'validateUrls',
                urls: [testUrl]
            }, {});

            expect(result.code).toBe(ERROR_CODES.SUCCESS);
            expect(result.data.results).toHaveLength(1);
            expect(result.data.results[0].url).toBe(testUrl);
            expect(result.data.results[0].valid).toBe(true);
            expect(result.data.results[0].statusCode).toBe(200);
        });

        it('validates URLs - marks 404 as invalid', async () => {
            const testUrl = 'https://example.com/notfound.htm';

            // Mock httpGet to return SUCCESS with statusCode 404 (simulating server responded with 404)
            mockHttpGet.mockResolvedValueOnce({
                code: ERROR_CODES.SUCCESS,
                message: 'success',
                data: { statusCode: 404 }
            });

            const result = await handler({
                action: 'validateUrls',
                urls: [testUrl]
            }, {});

            expect(result.code).toBe(ERROR_CODES.SUCCESS);
            expect(result.data.results[0].valid).toBe(false);
            expect(result.data.results[0].statusCode).toBe(404);
        });

        it('returns skipped: true when skipCheck is true', async () => {
            const result = await handler({
                action: 'validateUrls',
                urls: ['https://example.com/article.htm', 'https://example.com/page.htm'],
                skipCheck: true
            }, {});

            expect(result.code).toBe(ERROR_CODES.SUCCESS);
            expect(result.data.skipped).toBe(true);
            expect(result.data.results).toHaveLength(2);
            expect(result.data.results[0].valid).toBe(true);
            expect(result.data.results[0].statusCode).toBe(null);
        });

        it('returns PARAM_ERROR when urls is not an array', async () => {
            const result = await handler({
                action: 'validateUrls',
                urls: 'not-an-array'
            }, {});

            expect(result.code).toBe(ERROR_CODES.PARAM_ERROR);
            expect(result.message).toContain('urls must be an array');
        });

        it('returns URL_VALIDATE_ERROR when network failures occur', async () => {
            const testUrl = 'https://example.com/failing.htm';

            mockHttpGet.mockResolvedValueOnce({
                code: ERROR_CODES.URL_EXTRACT_ERROR,
                message: 'Network error: timeout',
                data: { statusCode: null }
            });

            const result = await handler({
                action: 'validateUrls',
                urls: [testUrl]
            }, {});

            expect(result.code).toBe(ERROR_CODES.URL_VALIDATE_ERROR);
            expect(result.data.results[0].validationError).toBe(true);
        });
    });

    describe('unknown action', () => {
        it('returns PARAM_ERROR for unknown action', async () => {
            const result = await handler({
                action: 'unknownAction'
            }, {});

            expect(result.code).toBe(ERROR_CODES.PARAM_ERROR);
            expect(result.message).toContain('Unknown action');
        });
    });
});

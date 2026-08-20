'use strict';

/**
 * Integration tests for getStrategy() function from strategies/index.js
 *
 * Tests strategy factory behavior:
 * - Valid strategy names return correct instances
 * - Unknown strategy names throw STRATEGY_NOT_FOUND error
 * - Each strategy instance implements parse() method
 */

// Mock dependencies before requiring the module
jest.mock('../common/constants', () => ({
    ERROR_CODES: {
        SUCCESS: 0,
        PARAM_ERROR: 400,
        SYSTEM_ERROR: 500,
        NOT_LOGIN: 401,
        NO_PERMISSION: 403,
        STRATEGY_NOT_FOUND: 5004
    }
}));

// Mock the strategy classes to isolate factory logic
jest.mock('../strategies/AiParseStrategy', () => {
    return jest.fn().mockImplementation(() => ({
        parse: jest.fn().mockResolvedValue({ title: 'AI Parsed' })
    }));
});

jest.mock('../strategies/RegexParseStrategy', () => {
    return jest.fn().mockImplementation(() => ({
        parse: jest.fn().mockResolvedValue({ title: 'Regex Parsed' })
    }));
});

jest.mock('../strategies/RawParseStrategy', () => {
    return jest.fn().mockImplementation(() => ({
        parse: jest.fn().mockResolvedValue({ title: 'Raw Parsed' })
    }));
});

// Now require the module under test
const { getStrategy, getAvailableStrategies } = require('../strategies');

describe('getStrategy', () => {
    describe('valid strategy selection', () => {
        test("Given 'ai-parse' returns AiParseStrategy instance", () => {
            const strategy = getStrategy('ai-parse');

            expect(strategy).toBeDefined();
            expect(typeof strategy.parse).toBe('function');
        });

        test("Given 'regex-parse' returns RegexParseStrategy instance", () => {
            const strategy = getStrategy('regex-parse');

            expect(strategy).toBeDefined();
            expect(typeof strategy.parse).toBe('function');
        });

        test("Given 'no-parse' returns RawParseStrategy instance", () => {
            const strategy = getStrategy('no-parse');

            expect(strategy).toBeDefined();
            expect(typeof strategy.parse).toBe('function');
        });
    });

    describe('strategy instances are singletons', () => {
        test('calling getStrategy multiple times returns the same instance', () => {
            const strategy1 = getStrategy('ai-parse');
            const strategy2 = getStrategy('ai-parse');

            expect(strategy1).toBe(strategy2);
        });

        test('different strategies return different instances', () => {
            const aiStrategy = getStrategy('ai-parse');
            const regexStrategy = getStrategy('regex-parse');
            const rawStrategy = getStrategy('no-parse');

            expect(aiStrategy).not.toBe(regexStrategy);
            expect(aiStrategy).not.toBe(rawStrategy);
            expect(regexStrategy).not.toBe(rawStrategy);
        });
    });

    describe('unknown strategy throws STRATEGY_NOT_FOUND error', () => {
        test('Given unknown strategy throws error with STRATEGY_NOT_FOUND code', () => {
            expect(() => getStrategy('unknown-strategy')).toThrow();
        });

        test('Error envelope contains code and message properties', () => {
            try {
                getStrategy('invalid-strategy');
                fail('Should have thrown');
            } catch (error) {
                expect(error).toHaveProperty('code');
                expect(error).toHaveProperty('message');
                expect(error.code).toBe(5004); // STRATEGY_NOT_FOUND
            }
        });

        test('Error message lists available strategies', () => {
            try {
                getStrategy('bad-strategy');
                fail('Should have thrown');
            } catch (error) {
                expect(error.message).toContain('ai-parse');
                expect(error.message).toContain('regex-parse');
                expect(error.message).toContain('no-parse');
            }
        });

        test('Empty string throws STRATEGY_NOT_FOUND', () => {
            try {
                getStrategy('');
                fail('Should have thrown');
            } catch (error) {
                expect(error.code).toBe(5004);
            }
        });

        test('null throws STRATEGY_NOT_FOUND', () => {
            try {
                getStrategy(null);
                fail('Should have thrown');
            } catch (error) {
                expect(error.code).toBe(5004);
            }
        });

        test('undefined throws STRATEGY_NOT_FOUND', () => {
            try {
                getStrategy(undefined);
                fail('Should have thrown');
            } catch (error) {
                expect(error.code).toBe(5004);
            }
        });
    });

    describe('getAvailableStrategies', () => {
        test('returns array of all supported strategy names', () => {
            const available = getAvailableStrategies();

            expect(Array.isArray(available)).toBe(true);
            expect(available).toContain('ai-parse');
            expect(available).toContain('regex-parse');
            expect(available).toContain('no-parse');
            expect(available.length).toBe(3);
        });
    });
});

'use strict';

const {
    getStrategy,
    getAvailableStrategies,
    RegexParseStrategy,
    RawParseStrategy
} = require('../../../uniCloud-aliyun/cloudfunctions/parseArticles/strategies');

describe('strategyFactory', () => {
    describe('getStrategy', () => {
        it('returns RegexParseStrategy instance for regex-parse', () => {
            const strategy = getStrategy('regex-parse');
            expect(strategy).toBeInstanceOf(RegexParseStrategy);
        });

        it('returns RawParseStrategy instance for no-parse', () => {
            const strategy = getStrategy('no-parse');
            expect(strategy).toBeInstanceOf(RawParseStrategy);
        });

        it('returns object with parse method for ai-parse', () => {
            const strategy = getStrategy('ai-parse');
            expect(strategy).toBeDefined();
            expect(typeof strategy.parse).toBe('function');
        });

        it('throws with STRATEGY_NOT_FOUND for unknown strategy', () => {
            expect(() => getStrategy('unknown-strategy')).toThrow();
            try {
                getStrategy('unknown-strategy');
            } catch (e) {
                expect(e.code).toBeDefined();
                expect(e.message).toContain('unknown-strategy');
            }
        });

        it('throws for empty string strategy', () => {
            expect(() => getStrategy('')).toThrow();
        });
    });

    describe('getAvailableStrategies', () => {
        it('returns array with regex-parse', () => {
            const available = getAvailableStrategies();
            expect(available).toContain('regex-parse');
        });

        it('returns array with no-parse', () => {
            const available = getAvailableStrategies();
            expect(available).toContain('no-parse');
        });

        it('returns array with ai-parse', () => {
            const available = getAvailableStrategies();
            expect(available).toContain('ai-parse');
        });

        it('returns array of correct length', () => {
            const available = getAvailableStrategies();
            expect(available.length).toBe(3);
        });
    });

    describe('exports', () => {
        it('exports RegexParseStrategy class', () => {
            expect(RegexParseStrategy).toBeDefined();
            expect(typeof RegexParseStrategy).toBe('function');
        });

        it('exports RawParseStrategy class', () => {
            expect(RawParseStrategy).toBeDefined();
            expect(typeof RawParseStrategy).toBe('function');
        });
    });
});

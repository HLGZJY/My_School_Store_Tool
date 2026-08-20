'use strict';

const { ERROR_CODES } = require('../common/constants');
const AiParseStrategy = require('./AiParseStrategy');
const RegexParseStrategy = require('./RegexParseStrategy');
const RawParseStrategy = require('./RawParseStrategy');

/**
 * Strategy factory for parseArticles
 * Per D-07: Strategy selection is automatic by source.parseStrategy (ai-parse/regex-parse/no-parse)
 *
 * Maps parseStrategy values to strategy instances:
 * - 'ai-parse' -> AiParseStrategy
 * - 'regex-parse' -> RegexParseStrategy
 * - 'no-parse' -> RawParseStrategy
 */

// Strategy instances (singleton per D-10)
const _strategies = {
    'ai-parse': new AiParseStrategy(),
    'regex-parse': new RegexParseStrategy(),
    'no-parse': new RawParseStrategy()
};

/**
 * Get strategy instance by parseStrategy name
 * @param {string} parseStrategy - Strategy identifier ('ai-parse', 'regex-parse', 'no-parse')
 * @returns {Object} Strategy instance implementing parse(htmlContent, metadata)
 * @throws {Object} Error envelope with ERROR_CODES.STRATEGY_NOT_FOUND
 */
function getStrategy(parseStrategy) {
    const strategy = _strategies[parseStrategy];

    if (!strategy) {
        const available = Object.keys(_strategies).join(', ');
        console.error(`[StrategyFactory] Unknown parseStrategy: "${parseStrategy}". Available: ${available}`);
        throw {
            code: ERROR_CODES.STRATEGY_NOT_FOUND,
            message: `Unknown parse strategy: "${parseStrategy}". Available: ${available}`
        };
    }

    return strategy;
}

/**
 * Get all available strategy names
 * @returns {string[]} List of supported parseStrategy values
 */
function getAvailableStrategies() {
    return Object.keys(_strategies);
}

module.exports = {
    getStrategy,
    getAvailableStrategies,
    AiParseStrategy,
    RegexParseStrategy,
    RawParseStrategy
};

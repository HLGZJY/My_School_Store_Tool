/**
 * Mock httpGet factory using nock
 * Allows intercepting HTTP requests in tests
 */

const nock = require('nock');

/**
 * Creates a mocked httpGet using nock interceptors
 * @param {string} baseUrl - Base URL to mock (e.g., 'https://example.com')
 * @param {Array<{path: string, statusCode?: number, body?: any, error?: Error}>} replies - Array of mocked replies
 * @returns {Function} Cleanup function to remove nock interceptors
 *
 * @example
 * const cleanup = createMockHttpGet('https://example.com', [
 *   { path: '/page.html', body: '<html><a href="/link1">Link</a></html>' },
 *   { path: '/api/data', body: { code: 0, data: { content: 'test' } } }
 * ]);
 * // ... run tests ...
 * cleanup();
 */
function createMockHttpGet(baseUrl, replies = []) {
  // Enable nock if not already enabled
  if (!nock.isActive()) {
    nock.activate();
  }

  const scopes = [];

  for (const reply of replies) {
    const { path, statusCode = 200, body, error } = reply;
    const url = new URL(path, baseUrl).href;

    let scope;

    if (error) {
      scope = nock(baseUrl)
        .get(path)
        .replyWithError(error);
    } else {
      scope = nock(baseUrl)
        .get(path)
        .reply(statusCode, body);
    }

    scopes.push(scope);
  }

  // Return cleanup function
  return function cleanup() {
    for (const scope of scopes) {
      scope.persist(false);
      nock.removeInterceptor(scope);
    }
    // Don't deactivate nock globally as other tests may need it
  };
}

/**
 * Clean up all active nock interceptors
 */
function cleanupAllNock() {
  nock.cleanAll();
}

/**
 * Disable all nock interceptors (pause mocking)
 */
function pauseNock() {
  nock.pause();
}

/**
 * Re-enable all nock interceptors (resume mocking)
 */
function resumeNock() {
  nock.resume();
}

module.exports = {
  createMockHttpGet,
  cleanupAllNock,
  pauseNock,
  resumeNock
};

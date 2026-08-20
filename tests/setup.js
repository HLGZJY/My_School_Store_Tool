/**
 * Jest setup file - runs before each test file
 * Configures global mocks and test environment
 */

const { createMockDb } = require('./mocks/uniCloud.mock');
const { cleanupAllNock } = require('./mocks/httpGet.mock');

// Set default timeout for all tests
jest.setTimeout(10000);

// Mock global.uniCloud with a fresh mock database for each test
// Tests can override this by setting global.uniCloud.database to a custom mock
global.uniCloud = {
  database() {
    return createMockDb();
  }
};

// Global afterAll hook to clean up nock interceptors after all tests
afterAll(() => {
  cleanupAllNock();
});

// Optional: Log unhandled rejections for debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

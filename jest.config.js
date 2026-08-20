module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'uniCloud-aliyun/cloudfunctions/**/*.js',
    '!uniCloud-aliyun/cloudfunctions/**/node_modules/**',
    '!uniCloud-aliyun/cloudfunctions/**/*.param.json'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/uniCloud-aliyun/cloudfunctions/*/node_modules/'],
  testTimeout: 10000
};

module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: ({ testResults }) => {
        // Determine test type based on file path
        const testPath = testResults[0].testFilePath;
        if (testPath.includes('/unit/')) {
          return 'junit-unit.xml';
        } else if (testPath.includes('/integration/')) {
          return 'junit-integration.xml';
        } else if (testPath.includes('/e2e/')) {
          return 'junit-e2e.xml';
        }
        return 'junit.xml';
      },
    }],
  ],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 30000, // 30 seconds
}; 
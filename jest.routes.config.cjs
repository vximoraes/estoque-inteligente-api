module.exports = {
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  verbose: true,
  transformIgnorePatterns: ['/node_modules/(?!node-fetch)/'],
  testMatch: ['<rootDir>/src/modules/*/__tests__/*Routes.test.ts'],
  globalSetup: '<rootDir>/test/routesGlobalSetup.ts',
  globalTeardown: '<rootDir>/test/routesGlobalTeardown.ts',
  testTimeout: 30000,
};

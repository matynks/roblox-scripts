/** Unit tests (pure logic, offline backend, game engines). Integration tests live in tests/integration. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: { '^@/assets/(.*)$': '<rootDir>/assets/$1', '^@/(.*)$': '<rootDir>/src/$1' },
};

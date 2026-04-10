import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  "transform": {
  "^.+\\.tsx?$": ["ts-jest", { "tsconfig": "tsconfig.json" }]
},
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
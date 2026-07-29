import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

const sharedRules = {
  'no-unused-vars': 'off',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'warn',
    {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    },
  ],
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'no-debugger': 'error',
  'no-duplicate-imports': 'error',
  'no-template-curly-in-string': 'warn',
  'prefer-const': 'warn',
  'no-var': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  curly: ['error', 'multi-line'],
  'no-throw-literal': 'error',
  'no-return-await': 'warn',
  'require-await': 'warn',
};

const testGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
};

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
};

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  // JavaScript files
  {
    files: ['**/*.js', '**/*.mjs'],
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: sharedRules,
  },
  // TypeScript files
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      globals: nodeGlobals,
    },
    rules: {
      ...sharedRules,
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Test files (JS + TS)
  {
    files: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts', '**/tests/**/*.js', '**/tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...testGlobals,
      },
    },
    rules: {
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];

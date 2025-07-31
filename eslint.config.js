import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import prettierPlugin from 'eslint-plugin-prettier';

export default {
  ignores: ['node_modules', '.next', 'dist', '*.config.js', '.env*'],
  ...js.configs.recommended,
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          project: './tsconfig.json',
          ecmaVersion: 'latest',
          sourceType: 'module',
        },
      },
      plugins: {
        '@typescript-eslint': tsPlugin,
        react: reactPlugin,
        prettier: prettierPlugin,
      },
      rules: {
        ...tsPlugin.configs.recommended.rules,
        ...reactPlugin.configs.recommended.rules,
        'prettier/prettier': 'warn',
      },
    },
  ],
};

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'game', 'design', 'scripts', 'fonts'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    settings: {
      react: { version: '18.3' },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The project uses TypeScript for prop type safety once Phase 4
      // converts components to .tsx. JSX components in phase 1b are
      // minimal-edit ports of the legacy inline-script components,
      // which never used PropTypes.
      'react/prop-types': 'off',
    },
  },
  {
    // RN-portable boundary: src/lib must not import React, DOM, or
    // concrete data. Pure functions take data as parameters (decided
    // in Phase 1.5 plan update, enforced here).
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/lib/ must be platform-agnostic — no React imports.' },
            {
              name: 'react-dom',
              message: 'src/lib/ must be platform-agnostic — no react-dom imports.',
            },
            {
              name: 'react-dom/client',
              message: 'src/lib/ must be platform-agnostic — no react-dom imports.',
            },
          ],
          patterns: [
            { group: ['react/*', 'react-dom/*'], message: 'src/lib/ must be platform-agnostic.' },
            {
              group: ['**/data/*', '../data/*', '../../data/*'],
              message:
                'src/lib/ must not import concrete data — take it as a function parameter instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Tests need to wire concrete data + React into the pure modules
      // they're exercising — the production boundary doesn't apply here.
      'no-restricted-imports': 'off',
    },
  },
);

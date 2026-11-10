/**
 * config/eslint.config.js
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      '**/.astro/**',
      '**/dist/**',
      '**/.docs/**',
      '**/node_modules/**',
      '**/tests/results/**',
      '**/demo-dist/**',
      '**/lib-dist/**',
      '**/site-dist/**',
      '**/test-results/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  { files: ['bin/**/*.mjs', 'site/**/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['site/**/*.tsx'], languageOptions: { globals: globals.browser } },
);

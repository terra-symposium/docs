import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.astro/**',
      'dist/**',
      'lib-dist/**',
      'site-dist/**',
      'demo-dist/**',
      'docs-dist/**',
      '.terra-docs/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['bin/**/*.mjs', 'site/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['site/**/*.tsx'],
    languageOptions: { globals: globals.browser },
  },
  {
    // The imported Terra editor still carries unchecked types and placeholder bindings.
    files: ['src/components/terra/**/*.{ts,tsx}', 'src/lib/terra/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);

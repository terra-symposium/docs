/**
 * config/vite.config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import react from '@vitejs/plugin-react';
import tailwindConfig from './tailwind.docs.config.mjs';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';
export default defineConfig({
  root: 'demo',
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss(tailwindConfig)] } },
  build: { outDir: '../dist/demo', emptyOutDir: true },
});

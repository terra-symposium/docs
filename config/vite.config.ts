import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import tailwindConfig from './tailwind.docs.config.mjs';

export default defineConfig({
  root: 'demo',
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(tailwindConfig)],
    },
  },
  build: { outDir: '../dist/demo', emptyOutDir: true },
});

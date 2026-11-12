import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss({ config: './tailwind.docs.config.mjs' })] } },
  build: { outDir: '../demo-dist', emptyOutDir: true },
});

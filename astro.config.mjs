import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/standards-error-boundaries/astro-integration';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { DOCS_VITE_OPTIMIZE_DEPS } from './dist/lib/lib/astro.js';

export default defineConfig({
  outDir: './dist/site/',
  devToolbar: { enabled: false },
  integrations: [__terraErrorBoundaryIntegration(), react()],
  vite: {
    // Linked local packages (notably the live Styling checkout) must resolve
    // React through this app. Otherwise Radix's portal providers load a second
    // React instance and fail during Astro SSR/hydration with invalid hooks.
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: { include: [...DOCS_VITE_OPTIMIZE_DEPS] },
  },
});

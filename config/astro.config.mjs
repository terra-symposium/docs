/**
 * astro.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { terraErrorBoundaryIntegration } from '@terra-symposium/standards-error-boundaries/astro-integration';
export default defineConfig({
	outDir: './dist/site/',
	cacheDir: './dist/cache/astro/',
	vite: { cacheDir: './dist/cache/vite/' },
	devToolbar: { enabled: false },
	integrations: [react(), terraErrorBoundaryIntegration()],
});

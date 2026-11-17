/**
 * astro.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { terraErrorBoundaryIntegration } from '@terra-symposium/boundaries/astro-integration';

const noStore = server => {
	server.middlewares.use((_request, response, next) => {
		response.setHeader('Cache-Control', 'no-store');
		next();
	});
};

export default defineConfig({
	outDir: './dist/site/',
	vite: { plugins: [{ name: 'docs-no-store', configureServer: noStore, configurePreviewServer: noStore }] },
	devToolbar: { enabled: false },
	integrations: [react(), terraErrorBoundaryIntegration()],
});

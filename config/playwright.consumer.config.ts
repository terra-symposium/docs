/**
 * playwright.consumer.config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { defineConfig } from '@playwright/test';
import { withResponsivePlaywright } from '@terra-symposium/reporting/viewports';
import { fileURLToPath } from 'node:url';
export default withResponsivePlaywright(
	defineConfig({
		testDir: '../tests/consumer-browser',
		reporter: [['list'], ['junit', { outputFile: '../tests/results/playwright-consumer.xml' }]],
		testMatch: '**/*.spec.ts',
		workers: 1,
		projects: [{ name: 'consumer' }],
		use: { browserName: 'chromium', viewport: { width: 1987, height: 1248 } },
		webServer: {
			cwd: fileURLToPath(new URL('../', import.meta.url)),
			command: 'pnpm run docs:build && ASTRO_PREVIEW_BACKGROUND=0 pnpm exec astro preview --config config/astro.config.mjs --host 127.0.0.1 --port 4336',
			url: 'http://127.0.0.1:4336/workspace-demo/',
			reuseExistingServer: false,
			timeout: 120_000,
		},
	}),
	{
		viewportPolicy: 'declared',
		viewportCatalog: { xl: { width: 1280, height: 720 } },
		outputDir: '../tests/results/playwright-consumer',
		outputRoot: 'tests/results/visual',
		screenshotsDirectory: 'tests/results/visual/screenshots',
		screenshotOnlySlideshow: true,
	},
);

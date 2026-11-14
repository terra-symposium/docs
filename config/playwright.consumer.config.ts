/**
 * playwright.consumer.config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { defineConfig } from '@playwright/test';
import { withResponsivePlaywright } from '@terra-symposium/standards-reporting/viewports';
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
			command: 'pnpm docs:build && python3 -m http.server 4336 --bind 127.0.0.1 --directory dist/site',
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

/**
 * playwright.config.ts
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
		testDir: '../tests/browser',
		reporter: [['list'], ['junit', { outputFile: '../tests/results/playwright-browser.xml' }]],
		use: { baseURL: 'http://127.0.0.1:4335', browserName: 'chromium' },
		projects: [{ name: 'chromium' }],
		webServer: {
			cwd: fileURLToPath(new URL('../', import.meta.url)),
			command: 'pnpm docs:build && python3 -m http.server 4335 --bind 127.0.0.1 --directory dist/site',
			url: 'http://127.0.0.1:4335/',
			reuseExistingServer: false,
			timeout: 120_000,
		},
	}),
	{
		viewportPolicy: 'declared',
		viewportCatalog: { mobile: { width: 390, height: 844 }, md: { width: 768, height: 900 }, xl: { width: 1280, height: 720 } },
		outputDir: '../tests/results/playwright-browser',
		outputRoot: 'tests/results/visual',
		screenshotsDirectory: 'tests/results/visual/screenshots',
		screenshotOnlySlideshow: true,
	},
);

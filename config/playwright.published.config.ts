/**
 * config/playwright.published.config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { publishedDocsSmokeTests } from './playwright-selection.mjs';
import { withResponsivePlaywright } from '@terra-symposium/standards-reporting/viewports';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const port = Number(process.env.DOCS_PUBLISHED_PLAYWRIGHT_PORT ?? 4336);
const baseURL = `http://127.0.0.1:${port}`;
export default withResponsivePlaywright(
  defineConfig({
    testDir: resolve(process.cwd(), 'test/browser'),
    workers: 1,
    outputDir: resolve(process.cwd(), 'tests/results/published-playwright-output'),
    projects: [{ name: 'chromium', grep: publishedDocsSmokeTests }],
    use: { baseURL, browserName: 'chromium' },
    webServer: {
      command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory ${resolve(process.cwd(), 'dist/docs')}`,
      url: `${baseURL}/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  }),
  {
    viewportPolicy: 'declared',
    viewportCatalog: {
      mobile: { width: 390, height: 844 },
      md: { width: 768, height: 900 },
      xl: { width: 1280, height: 720 },
    },
    screenshotsDirectory: resolve(process.cwd(), 'tests/results/published-visual/screenshots'),
    screenshotOnlySlideshow: true,
  },
);

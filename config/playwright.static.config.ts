/**
 * config/playwright.static.config.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export default defineConfig({
  testDir: resolve(process.cwd(), 'test/browser'),
  outputDir: resolve(process.cwd(), 'tests/results/playwright-output'),
  use: {
    baseURL: `http://127.0.0.1:${Number(process.env.DOCS_PLAYWRIGHT_PORT ?? 4335)}`,
    browserName: 'chromium',
  },
  expect: { toHaveScreenshot: { pathTemplate: '{testDir}/{testFileName}-snapshots/{arg}{ext}' } },
});

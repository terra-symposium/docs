import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { withResponsivePlaywright } from '@terra-symposium/standards-reporting/viewports';

const port = Number(process.env.DOCS_PLAYWRIGHT_PORT ?? 4335);
const baseURL = `http://127.0.0.1:${port}`;

export default withResponsivePlaywright(
  defineConfig({
    testDir: resolve(process.cwd(), 'test/browser'),
    projects: [{ name: 'chromium' }],
    use: { baseURL, browserName: 'chromium' },
    expect: {
      toHaveScreenshot: {
        pathTemplate: '{testDir}/{testFileName}-snapshots/{arg}{ext}',
      },
    },
    webServer: {
      command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory ${resolve(process.cwd(), 'dist/site')}`,
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
    screenshotsDirectory: resolve(process.cwd(), 'tests/results/visual/screenshots'),
    screenshotOnlySlideshow: true,
  },
);

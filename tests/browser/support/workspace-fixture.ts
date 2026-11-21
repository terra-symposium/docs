/**
 * tests/browser/support/workspace-fixture.ts
 */
/* Shared isolated workspace fixture and viewport contracts. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

export { expect };
export const XL_VIEWPORT_TEST = {
  tag: '@viewport:xl',
  annotation: {
    type: 'viewport-reason',
    description:
      'Layout-independent workspace behavior runs once at the canonical desktop width; breakpoint cases set and verify their own widths.',
  },
} as const;
export const DESKTOP_BREAKPOINT_TEST = {
  tag: '@viewport:xl',
  annotation: {
    type: 'viewport-reason',
    description:
      'The scenario checks the desktop header at 768 px and the mobile header at 767 px around the md breakpoint.',
  },
} as const;

/**
 * Wait until the workspace shell finishes its initial navigation and document load.
 *
 * @param page - Browser page containing the Docs workspace.
 */
export async function waitForWorkspaceReady(page: Page): Promise<void> {
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false', {
    timeout: 30_000,
  });
}

export const test = base.extend<{ workspaceSetup: void }>({
  workspaceSetup: [
    async ({ page }, use) => {
      const errs: string[] = [];
      page.on('pageerror', (err) => errs.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errs.push(msg.text());
      });
      page.on('requestfailed', (request) => {
        errs.push(
          `Request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`,
        );
      });
      await page.addInitScript(() => {
        const resetKey = 'docs-fixture-initialized';
        if (sessionStorage.getItem(resetKey) === 'true') return;
        localStorage.removeItem('docs-workspace-demo-v1');
        sessionStorage.setItem(resetKey, 'true');
      });
      await use();
      expect(errs, 'Unhandled browser errors').toEqual([]);
    },
    { auto: true },
  ],
});

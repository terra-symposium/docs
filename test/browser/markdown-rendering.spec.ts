/**
 * test/browser/markdown-rendering.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const XL_VIEWPORT_TEST = {
  tag: '@viewport:xl',
  annotation: {
    type: 'viewport-reason',
    description: 'Published tab and accordion interaction is checked in the desktop Docs layout.',
  },
} as const;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Confirms that the published Markdown route mounts interactive shared tabs and accordions.
 *
 * @param page Playwright page configured for the published Docs test site.
 * @returns Completion after the Git tab and accordion panel respond to user input.
 */
async function verifyPublishedMarkdownControls({
  page,
}: {
  page: import('@playwright/test').Page;
}): Promise<void> {
  await page.goto('/authoring/blocks/');
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');

  const tabs = page.getByRole('tablist');
  const npmTab = page.getByRole('tab', { name: 'npm', exact: true });
  const gitTab = page.getByRole('tab', { name: 'Git', exact: true });
  await expect(tabs).toBeVisible();
  await expect(npmTab).toHaveAttribute('aria-selected', 'true');
  await gitTab.click();
  await expect(gitTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('git tag docs-release', { exact: true })).toBeVisible();

  const accordion = page.getByRole('button', { name: 'Why use an accordion?', exact: true });
  await accordion.click();
  await expect(
    page.getByText('Keep optional background detail available', { exact: false }),
  ).toBeVisible();
}

test(
  'published Markdown uses interactive Styling controls',
  XL_VIEWPORT_TEST,
  verifyPublishedMarkdownControls,
);

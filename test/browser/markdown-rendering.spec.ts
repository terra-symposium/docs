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

  const gitTab = page.getByRole('tab', { name: 'Git', exact: true });
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'npm', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await gitTab.click();
  await expect(gitTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('git tag docs-release', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Why use an accordion?', exact: true }).click();
  await expect(
    page.getByText('Keep optional background detail available', { exact: false }),
  ).toBeVisible();
}

test(
  'published Markdown uses interactive Styling controls',
  {
    tag: '@viewport:xl',
    annotation: {
      type: 'viewport-reason',
      description: 'Published tab and accordion interaction is checked in the desktop Docs layout.',
    },
  } as const,
  verifyPublishedMarkdownControls,
);

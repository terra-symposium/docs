/**
 * test/browser/markdown-rendering.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const stylingVersion = JSON.parse(
  readFileSync(resolve('node_modules/@terra-symposium/styling/package.json'), 'utf8'),
) as { version: string };
const [stylingMajor, stylingMinor, stylingPatch] = stylingVersion.version.split('.').map(Number);
const controlVariantAvailable =
  stylingMajor! > 0 || stylingMinor! > 1 || (stylingMinor === 1 && stylingPatch! >= 39);

test(
  'published MDX code fixture has a language header and copy control',
  {
    tag: '@viewport:xl',
    annotation: {
      type: 'viewport-reason',
      description: 'Code controls are verified in the desktop Docs layout.',
    },
  },
  async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/fixture/code/');
    const block = page.locator('.docs-static-code-block');
    await expect(block).toBeVisible();
    await expect(block.locator('.docs-static-code-language')).toHaveText('sh');
    await expect(block.locator('pre.astro-code .line span').first()).toBeVisible();
    await block.getByRole('button', { name: 'Copy sh code' }).click();
    await expect(block.getByRole('button')).toHaveText('Copied');
  },
);

test(
  'published MDX nodes fixture renders graph data',
  { tag: '@viewport:xl' },
  async ({ page }) => {
    await page.goto('/fixture/nodes/');
    await expect(page.locator('[data-docs-editor-block="Nodes"]')).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByText('Finish', { exact: true })).toBeVisible();
  },
);

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
  await page.goto('/consumer/2-blocks/');
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);

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

test(
  'the Docs presentation fixture uses one highlighted code surface and clear title spacing',
  {
    tag: '@viewport:xl',
    annotation: {
      type: 'viewport-reason',
      description:
        'The fixture checks the desktop document title, toolbar, and published code surface.',
    },
  },
  async ({ page }) => {
    await page.goto('/consumer/2-blocks/');
    await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');

    const title = page.getByRole('textbox', { name: 'Title' });
    await expect(title).toHaveCSS('font-style', 'normal');
    await expect(title).not.toHaveClass(/font-serif/);

    const siteTitle = page.getByRole('link', { name: 'Docs', exact: true }).first();
    await expect(siteTitle).toHaveCSS('font-style', 'normal');
    await siteTitle.hover();
    await expect(siteTitle).toHaveCSS('font-style', 'italic');

    const code = page.locator('[data-docs-code-block="view"]').first();
    await expect(code.locator('.docs-code-block-header')).toContainText('md');
    await expect(code.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(code.locator('.cm-editor')).toBeVisible();
    await expect(code.locator('.cm-line')).not.toHaveCount(0);
    await expect(code.locator('.cm-line span').first()).toBeVisible();

    const spacing = await page.evaluate(() => {
      const toolbar = document.querySelector('[data-docs-body] [data-docs-toolbar-frame]');
      const content = document.querySelector('[data-docs-body-content]');
      if (!toolbar || !content) return null;
      return (
        (content.firstElementChild ?? content).getBoundingClientRect().top -
        toolbar.getBoundingClientRect().bottom
      );
    });
    expect(spacing).not.toBeNull();
    expect(spacing!).toBeGreaterThanOrEqual(48);

    const mode = page.getByRole('combobox', { name: 'Mode' });
    await mode.focus();
    await expect
      .poll(() =>
        mode.evaluate((element) =>
          getComputedStyle(element).getPropertyValue('--tw-ring-offset-width'),
        ),
      )
      .toBe('2px');
  },
);

test(
  'the Docs presentation fixture uses the control popover surface in both themes',
  {
    tag: '@viewport:xl',
    annotation: {
      type: 'viewport-reason',
      description: 'The shared select panel is inspected in light and dark desktop themes.',
    },
  },
  async ({ page }) => {
    test.skip(!controlVariantAvailable, 'Styling 0.1.39 has not been published yet.');
    await page.goto('/consumer/2-blocks/');
    await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
    const mode = page.getByRole('combobox', { name: 'Mode' });
    await mode.click();
    const menu = page.getByRole('listbox');
    await expect(menu).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(menu).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  },
);

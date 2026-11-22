/**
 * tests/browser/visual.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// The PNGs beside this test capture the current Docs package at the stated
// viewport and fixture state. Astro's development toolbar is excluded.
const refStyle = 'astro-dev-toolbar, astro-dev-overlay { display: none !important; }';
const screenshotTolerance = { threshold: 0.1, maxDiffPixelRatio: 0.002 };
/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Loads the stable parity fixture and waits until its document and fonts are ready to capture.
 *
 * @param page Playwright page used to open the parity route at the reference viewport.
 */
async function openParityFixture(page: import('@playwright/test').Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/parity-demo/');
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
  await expect(page.locator('.document-header')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Compares the current page with a reviewed Docs screenshot at the same viewport and state.
 *
 * @param page Playwright page whose rendered Docs UI should match the reference image.
 * @param name Viewport label used to select the corresponding screenshot baseline.
 */
async function expectCurrentScreenshot(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  await expect(page).toHaveScreenshot(`current-${name}.png`, {
    animations: 'disabled',
    caret: 'hide',
    style: refStyle,
    ...screenshotTolerance,
  });
}

/**
 * Selects a Docs surface mode through the visible mode control.
 *
 * @param page Playwright page containing the Docs mode combobox.
 * @param mode Mode option to activate in the editor.
 */
async function setMode(
  page: import('@playwright/test').Page,
  mode: 'View' | 'Edit' | 'Attachments',
): Promise<void> {
  await page.getByRole('combobox', { name: 'Mode' }).click();
  await page.getByRole('option', { name: mode, exact: true }).click();
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe(
  'Docs visual parity',
  {
    tag: '@viewport:xl',
    annotation: {
      type: 'viewport-reason',
      description: 'Parity scenarios set their reference viewport explicitly inside each test.',
    },
  },
  () => {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'breakpoint', width: 768, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ] as const) {
      test(`current Docs UI: ${viewport.name}`, async ({ page: p }) => {
        const errs: string[] = [];
        p.on('pageerror', (error) => errs.push(error.message));
        p.on('console', (message) => {
          if (message.type() === 'error') errs.push(message.text());
        });
        await p.setViewportSize({ width: viewport.width, height: viewport.height });
        await p.goto('/parity-demo/');
        await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
        await expect(p.getByRole('heading', { name: 'Start with the product' })).toBeVisible();
        await p.evaluate(async () => {
          await document.fonts.ready;
          window.scrollTo(0, 0);
        });
        await p.mouse.move(0, 0);
        await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
        await expect(p.locator('.document-header')).toBeVisible();
        await expect(p.locator('[data-docs-toolbar-frame]')).toBeVisible();
        await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
          'Salesphere',
        );
        await expect
          .poll(() =>
            p.locator('body').evaluate((body) => getComputedStyle(body).webkitFontSmoothing),
          )
          .toBe('antialiased');
        await expect(p).toHaveScreenshot(`current-${viewport.name}.png`, {
          animations: 'disabled',
          caret: 'hide',
          // The pinned source is an Astro dev server and injects its dev toolbar.
          // That browser tooling is not part of the Docs UI captured by the golden.
          style: refStyle,
          ...screenshotTolerance,
        });
        expect(errs, `Browser errors at ${viewport.width}x${viewport.height}`).toEqual([]);
      });
    }
    test('long document descriptions remain fully visible at responsive widths', async ({
      page: p,
    }) => {
      const desc =
        'This deliberately long document description wraps onto several lines at narrow viewports. The header must expand to show every line, keep the mode toolbar below it, and never hide the final sentence.';
      await p.goto('/parity-demo/');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
      await p.evaluate((value) => {
        const key = 'docs-workspace-demo-v1';
        const fixture = JSON.parse(localStorage.getItem(key) ?? '{}');
        fixture.documents.salesphere.description = value;
        localStorage.setItem(key, JSON.stringify(fixture));
        window.dispatchEvent(new CustomEvent('docs-fixture-updated'));
      }, desc);
      const field = p.locator('#docs-description');
      await expect(field).toHaveValue(desc);
      for (const viewport of [
        { name: 'desktop', width: 1440, height: 1000 },
        { name: 'breakpoint', width: 768, height: 900 },
        { name: 'mobile', width: 390, height: 844 },
      ]) {
        await p.setViewportSize({ width: viewport.width, height: viewport.height });
        await expect
          .poll(() =>
            field.evaluate(
              (element: HTMLTextAreaElement) => element.scrollHeight <= element.clientHeight + 1,
            ),
          )
          .toBe(true);
        const layout = await p.evaluate(() => {
          const desc = document.querySelector<HTMLTextAreaElement>('#docs-description');
          const toolbar = document.querySelector<HTMLElement>('[data-docs-toolbar-frame]');
          if (!desc || !toolbar) return null;
          return {
            descriptionHeight: desc.getBoundingClientRect().height,
            lineHeight: Number.parseFloat(getComputedStyle(desc).lineHeight),
            descriptionBottom: desc.getBoundingClientRect().bottom,
            toolbarTop: toolbar.getBoundingClientRect().top,
          };
        });
        expect(layout).not.toBeNull();
        expect(layout!.descriptionHeight).toBeGreaterThanOrEqual(layout!.lineHeight * 2);
        if (viewport.width < 768)
          expect(layout!.descriptionHeight).toBeGreaterThan(layout!.lineHeight * 2);
        expect(layout!.descriptionBottom).toBeLessThanOrEqual(layout!.toolbarTop);
        await p.screenshot({
          path: `tests/results/description-${viewport.name}.png`,
          fullPage: true,
          style: refStyle,
        });
      }
    });
    test('empty descriptions show an editing hint only in Edit mode', async ({ page: p }) => {
      await p.goto('/parity-demo/');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
      await p.evaluate(() => {
        const key = 'docs-workspace-demo-v1';
        const fixture = JSON.parse(localStorage.getItem(key) ?? '{}');
        fixture.documents.salesphere.description = '';
        localStorage.setItem(key, JSON.stringify(fixture));
        window.dispatchEvent(new CustomEvent('docs-fixture-updated'));
      });
      const desc = p.locator('#docs-description');
      await expect(desc).toHaveValue('');
      await expect(desc).not.toHaveAttribute('placeholder', 'Add a description...');
      await setMode(p, 'Edit');
      await expect(desc).toHaveAttribute('placeholder', 'Add a description...');
    });
    test('Docs toolbar mode menu shows the available modes', async ({ page: p }) => {
      await openParityFixture(p);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await expect(p.getByRole('option', { name: 'View', exact: true })).toBeVisible();
      await expect(p.getByRole('option', { name: 'Edit', exact: true })).toBeVisible();
      await expect(p.getByRole('option', { name: 'Attachments', exact: true })).toBeVisible();
      await expect(p.getByRole('option', { name: 'Code', exact: true })).toHaveCount(0);
      await expectCurrentScreenshot(p, 'mode-menu');
    });
    test('Docs visual editor toolbar exposes editing controls', async ({ page: p }) => {
      await openParityFixture(p);
      await setMode(p, 'Edit');
      await expect(p.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
      await expect(p.getByRole('combobox', { name: 'Block type' })).toBeVisible();
      await expectCurrentScreenshot(p, 'edit-mode');
    });
    test('Docs attachments mode uses a compact selector and preserves the empty state', async ({
      page: p,
    }) => {
      await openParityFixture(p);
      await p.evaluate(() => {
        const key = 'docs-workspace-demo-v1';
        const state = JSON.parse(localStorage.getItem(key) ?? '{}');
        if (state.documents?.salesphere) state.documents.salesphere.attachments = [];
        localStorage.setItem(key, JSON.stringify(state));
        window.dispatchEvent(new Event('docs-fixture-updated'));
      });
      await setMode(p, 'Attachments');
      await expect(p.locator('[data-docs-attachments]')).toHaveAttribute('data-loading', 'false');
      await expect(p.getByText('No attachments found.', { exact: true })).toBeVisible();
      await p.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      await p.mouse.move(0, 0);
      // The selector stays content-sized so attachment filters fit on one row.
      await expect(p).toHaveScreenshot('compact-attachments-mode.png', {
        animations: 'disabled',
        caret: 'hide',
        style: refStyle,
        ...screenshotTolerance,
      });
    });
    test('Docs leaf context menu exposes leaf actions', async ({ page: p }) => {
      await openParityFixture(p);
      await p.getByRole('link', { name: 'Salesphere', exact: true }).click({ button: 'right' });
      const menu = p.getByRole('menu');
      await expect(menu.getByRole('menuitem', { name: 'Rename leaf', exact: true })).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: 'Files', exact: true })).toBeVisible();
      await expect(
        menu.getByRole('menuitem', { name: 'Duplicate leaf', exact: true }),
      ).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: 'Delete leaf', exact: true })).toBeVisible();
      await expectCurrentScreenshot(p, 'leaf-context-menu');
    });
    test('Docs branch context menu exposes branch actions', async ({ page: p }) => {
      await openParityFixture(p);
      await expect(p.getByRole('button', { name: /Actions for group/ })).toHaveCount(0);
      await p.locator('[data-docs-drop^="branch:"]').filter({ hasText: 'Start here' }).hover();
      await expect(p.getByRole('button', { name: /Actions for group/ })).toHaveCount(0);
      await p.mouse.move(0, 0);
      await p
        .locator('[data-docs-drop^="branch:"]')
        .filter({ hasText: 'Start here' })
        .click({ button: 'right' });
      const menu = p.getByRole('menu');
      await expect(menu.getByRole('menuitem', { name: 'Add leaf', exact: true })).toBeVisible();
      await expect(
        menu.getByRole('menuitem', { name: 'Manage attachments', exact: true }),
      ).toBeVisible();
      await expect(
        menu.getByRole('menuitem', { name: 'Delete branch', exact: true }),
      ).toBeVisible();
      await expectCurrentScreenshot(p, 'group-context-menu');
    });
    test('Docs attachment management dialog stays within the viewport', async ({ page: p }) => {
      await openParityFixture(p);
      await p
        .locator('[data-docs-drop^="branch:"]')
        .filter({ hasText: 'Start here' })
        .click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Manage attachments', exact: true }).click();
      const dialog = p.getByRole('dialog', { name: /Manage Attachments — Start here/i });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveCSS('position', 'fixed');
      await expect(p.locator('[data-state="open"].fixed').first()).toHaveCSS('position', 'fixed');
      await expect(p.locator('[data-state="open"].fixed').first()).toHaveCSS('height', '1000px');
      await expect(dialog.getByText('Salesphere', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Runtime map', { exact: true })).toBeVisible();
      await expectCurrentScreenshot(p, 'attachment-management-dialog');
    });
  },
);

/**
 * test/browser/parity.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// The PNGs beside this test were captured from the pinned website checkout at
// cad2bae15a975d32f60a01b60693c5e0b5c90ed2 using its parity-baseline route,
// hue 145, and the exact viewport/state below. Only Astro's injected dev UI is
// excluded from the package capture.
const referenceStyle = 'astro-dev-toolbar, astro-dev-overlay { display: none !important; }';
const screenshotTolerance = { threshold: 0.1, maxDiffPixelRatio: 0.002 };
/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Opens the pinned visual-parity route and waits for its shared Docs shell to finish rendering.
 *
 * @param page Playwright page configured with the viewport under comparison.
 */
async function openParityFixture(page: import('@playwright/test').Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/parity-demo/');
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
  await expect(page.locator('.docs-document-header')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Compares the current Docs page with the named screenshot captured from the pinned consumer.
 *
 * @param page Rendered page whose pixels are checked against the committed baseline.
 * @param name Baseline suffix that identifies the view or viewport being compared.
 */
async function expectOriginalScreenshot(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  await expect(page).toHaveScreenshot(`original-${name}.png`, {
    animations: 'disabled',
    caret: 'hide',
    style: referenceStyle,
    ...screenshotTolerance,
  });
}

/**
 * Selects a Docs mode through the visible mode control, exercising the user-facing navigation path.
 *
 * @param page Page showing the Docs workspace.
 * @param mode View, Edit, or Attachments option to activate.
 */
async function setMode(
  page: import('@playwright/test').Page,
  mode: 'View' | 'Edit' | 'Attachments',
): Promise<void> {
  await page.getByRole('combobox', { name: 'Mode' }).click();
  await page.getByRole('option', { name: mode, exact: true }).click();
}
for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'breakpoint', width: 768, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`pinned Docs UI parity: ${viewport.name}`, async ({ page: p }) => {
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
    await expect(p.locator('.docs-document-header')).toBeVisible();
    await expect(p.locator('[data-docs-toolbar-frame]')).toBeVisible();
    await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Salesphere');
    await expect
      .poll(() => p.locator('body').evaluate((body) => getComputedStyle(body).webkitFontSmoothing))
      .toBe('antialiased');
    await expect(p).toHaveScreenshot(`original-${viewport.name}.png`, {
      animations: 'disabled',
      caret: 'hide',
      // The pinned source is an Astro dev server and injects its dev toolbar.
      // That browser tooling is not part of the Docs UI captured by the golden.
      style: referenceStyle,
      ...screenshotTolerance,
    });
    expect(errs, `Browser errors at ${viewport.width}x${viewport.height}`).toEqual([]);
  });
}
test('long document descriptions remain fully visible at responsive widths', async ({
  page: p,
}) => {
  const description =
    'This deliberately long document description wraps onto several lines at narrow viewports. The header must expand to show every line, keep the mode toolbar below it, and never hide the final sentence.';
  await p.goto('/parity-demo/');
  await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
  await p.evaluate((value) => {
    const key = 'docs-workspace-demo-v1';
    const fixture = JSON.parse(localStorage.getItem(key) ?? '{}');
    fixture.documents.salesphere.description = value;
    localStorage.setItem(key, JSON.stringify(fixture));
    window.dispatchEvent(new CustomEvent('docs-fixture-updated'));
  }, description);
  const field = p.locator('#docs-description');
  await expect(field).toHaveValue(description);
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
      const description = document.querySelector<HTMLTextAreaElement>('#docs-description');
      const toolbar = document.querySelector<HTMLElement>('[data-docs-toolbar-frame]');
      if (!description || !toolbar) return null;
      return {
        descriptionHeight: description.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(getComputedStyle(description).lineHeight),
        descriptionBottom: description.getBoundingClientRect().bottom,
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
      style: referenceStyle,
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
  const description = p.locator('#docs-description');
  await expect(description).toHaveValue('');
  await expect(description).not.toHaveAttribute('placeholder', 'Add a description...');
  await setMode(p, 'Edit');
  await expect(description).toHaveAttribute('placeholder', 'Add a description...');
});
test('pinned Docs toolbar mode menu matches the original', async ({ page: p }) => {
  await openParityFixture(p);
  await p.getByRole('combobox', { name: 'Mode' }).click();
  await expect(p.getByRole('option', { name: 'View', exact: true })).toBeVisible();
  await expect(p.getByRole('option', { name: 'Edit', exact: true })).toBeVisible();
  await expect(p.getByRole('option', { name: 'Attachments', exact: true })).toBeVisible();
  await expect(p.getByRole('option', { name: 'Code', exact: true })).toHaveCount(0);
  await expectOriginalScreenshot(p, 'mode-menu');
});
test('pinned Docs visual editor toolbar matches the original', async ({ page: p }) => {
  await openParityFixture(p);
  await setMode(p, 'Edit');
  await expect(p.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(p.getByRole('combobox', { name: 'Block type' })).toBeVisible();
  await expectOriginalScreenshot(p, 'edit-mode');
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
  // The original website used a full-width mode select here. The shared Docs
  // toolbar intentionally keeps this selector content-sized so attachment
  // filters stay on the same row; original-attachments-mode.png remains the
  // pinned pre-abstraction reference for documenting that single change.
  await expect(p).toHaveScreenshot('compact-attachments-mode.png', {
    animations: 'disabled',
    caret: 'hide',
    style: referenceStyle,
    ...screenshotTolerance,
  });
});
test('pinned Docs leaf context menu matches the original', async ({ page: p }) => {
  await openParityFixture(p);
  await p.getByRole('link', { name: 'Salesphere', exact: true }).click({ button: 'right' });
  const menu = p.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Rename page', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Files', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Duplicate page', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Delete page', exact: true })).toBeVisible();
  await expectOriginalScreenshot(p, 'leaf-context-menu');
});
test('pinned Docs group context menu matches the original', async ({ page: p }) => {
  await openParityFixture(p);
  await expect(p.getByRole('button', { name: /Actions for group/ })).toHaveCount(0);
  await p.locator('[data-docs-drop^="branch:"]').filter({ hasText: 'Start here' }).hover();
  await expect(p.getByRole('button', { name: /Actions for group/ })).toHaveCount(0);
  await p.mouse.move(0, 0);
  await p.mouse.click(169, 160, { button: 'right' });
  const menu = p.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Add page', exact: true })).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: 'Manage attachments', exact: true }),
  ).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Delete group', exact: true })).toBeVisible();
  await expectOriginalScreenshot(p, 'group-context-menu');
});
test('pinned Docs attachment management dialog matches the original', async ({ page: p }) => {
  await openParityFixture(p);
  await p.mouse.click(169, 160, { button: 'right' });
  await p.getByRole('menuitem', { name: 'Manage attachments', exact: true }).click();
  const dialog = p.getByRole('dialog', { name: /Manage Attachments — Start here/i });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('position', 'fixed');
  await expect(p.locator('[data-state="open"].fixed').first()).toHaveCSS('position', 'fixed');
  await expect(p.locator('[data-state="open"].fixed').first()).toHaveCSS('height', '1000px');
  await expect(dialog.getByText('Salesphere', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Runtime map', { exact: true })).toBeVisible();
  await expectOriginalScreenshot(p, 'attachment-management-dialog');
});

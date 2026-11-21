/**
 * tests/browser/workspace/capabilities.spec.ts
 */
/* Workspace capabilities browser contracts. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import {
  expect,
  test,
  XL_VIEWPORT_TEST,
  waitForWorkspaceReady,
} from '../support/workspace-fixture';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe('tree management and host capability modes', () => {
  test(
    'tree creation is retained, and menus remain keyboard accessible and portaled',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1280, height: 900 });
      await p.goto('/workspace-demo/');
      await waitForWorkspaceReady(p);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await expect(p.getByRole('option', { name: 'Edit' })).toBeVisible();
      await p.keyboard.press('Escape');
      const section = p.getByRole('combobox', { name: 'Tree' });
      await section.focus();
      await p.keyboard.press('Enter');
      await expect(p.getByRole('listbox')).toBeVisible();
      await expect
        .poll(() =>
          p.getByRole('listbox').evaluate((listbox) => getComputedStyle(listbox).backgroundColor),
        )
        .not.toBe('rgba(0, 0, 0, 0)');
      await expect
        .poll(() =>
          p
            .getByRole('listbox')
            .evaluate(
              (listbox) =>
                listbox.closest('[data-radix-popper-content-wrapper]')?.parentElement ===
                document.body,
            ),
        )
        .toBe(true);
      await p.keyboard.press('Escape');
      await p.getByRole('link', { name: 'Salesphere', exact: true }).click({ button: 'right' });
      const contextMenu = p.getByRole('menu');
      await expect(contextMenu).toBeVisible();
      await expect(
        contextMenu.getByRole('menuitem', { name: 'Rename leaf', exact: true }),
      ).toBeVisible();
      await expect
        .poll(() =>
          contextMenu.evaluate(
            (menu) =>
              menu.closest('[data-radix-popper-content-wrapper]')?.parentElement === document.body,
          ),
        )
        .toBe(true);
      const renamePageAction = contextMenu.getByRole('menuitem', {
        name: 'Rename leaf',
        exact: true,
      });
      await renamePageAction.focus();
      await expect(renamePageAction).toBeFocused();
      await p.keyboard.press('Enter');
      await expect(p.getByRole('dialog', { name: 'Rename leaf' })).toBeVisible();
      await p.keyboard.press('Escape');
      await section.click();
      await p.getByRole('option', { name: 'Add tree', exact: true }).click();
      const dialog = p.getByRole('dialog', { name: 'Add Tree' });
      await dialog.getByRole('textbox', { name: 'Tree name' }).fill('Created from browser');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(async () =>
          p.evaluate(() => {
            return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}').tree.some(
              (node: { title?: string }) => node.title === 'Created from browser',
            );
          }),
        )
        .toBe(true);
      await p.goto('/workspace-demo/');
      await waitForWorkspaceReady(p);
      await expect(p.getByRole('combobox', { name: 'Tree' })).toBeVisible();
      await p.getByRole('combobox', { name: 'Tree' }).click();
      await expect(p.getByRole('option', { name: 'Created from browser' })).toBeVisible();
    },
  );
  test(
    'tree rename, color, and deletion persist through tree actions',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/workspace-demo/', { waitUntil: 'domcontentloaded' });
      await waitForWorkspaceReady(p);
      await p.getByRole('combobox', { name: 'Tree' }).click();
      await p.getByRole('option', { name: 'Add tree', exact: true }).click();
      const createDialog = p.getByRole('dialog', { name: 'Add Tree' });
      await createDialog.getByRole('textbox', { name: 'Tree name' }).fill('Section lifecycle');
      await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
      const sectionControl = p.getByRole('combobox', { name: 'Tree' });
      await sectionControl.click();
      await p.getByRole('option', { name: 'Section lifecycle', exact: true }).click();
      await sectionControl.click({ button: 'right' });
      await expect(p.getByRole('menu')).toBeVisible();
      await p.getByRole('menuitem', { name: 'Rename tree', exact: true }).click();
      const renameDialog = p.getByRole('dialog', { name: 'Rename Tree' });
      await renameDialog
        .getByRole('textbox', { name: 'Tree name' })
        .fill('Section lifecycle renamed');
      await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
      await sectionControl.click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Change color', exact: true }).click();
      const colorDialog = p.getByRole('dialog', { name: 'Tree color' });
      const hue = colorDialog.getByRole('slider', { name: 'Hue' });
      const prevHue = Number(await hue.getAttribute('aria-valuenow'));
      await hue.focus();
      await p.keyboard.press(prevHue < 360 ? 'End' : 'Home');
      const hueValue = Number(await hue.getAttribute('aria-valuenow'));
      expect(hueValue).not.toBe(prevHue);
      await p.clock.install();
      await colorDialog.getByRole('button', { name: 'Save', exact: true }).click();
      await p.clock.fastForward(2500);
      await expect
        .poll(
          async () =>
            p.evaluate(() => {
              return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}').tree.find(
                (node: { title?: string }) => node.title?.startsWith('Section lifecycle'),
              )?.hue;
            }),
          { intervals: [25, 75, 150], timeout: 1500 },
        )
        .toBe(hueValue);
      await sectionControl.click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Delete tree', exact: true }).click();
      await p
        .getByRole('dialog', { name: /Delete tree\?/i })
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
      await expect(
        p.getByRole('option', { name: 'Section lifecycle renamed', exact: true }),
      ).toHaveCount(0);
      expect(
        (
          await p.evaluate(() => JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'))
        ).tree.some((node: { title?: string }) => node.title === 'Section lifecycle renamed'),
      ).toBe(false);
    },
  );
  test(
    'remote editors get visual authoring controls while Code remains document content, not a mode',
    XL_VIEWPORT_TEST,
    async ({ page: p }, t) => {
      await p.goto('/workspace-demo/');
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await expect(p.getByRole('option', { name: 'Edit' })).toBeVisible();
      await expect(p.getByRole('option', { name: 'Code', exact: true })).toHaveCount(0);
      await p.getByRole('option', { name: 'Edit' }).click();
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-docs-mode', 'edit');
      await expect(p.getByRole('button', { name: 'Save' })).toBeVisible();
      await expect(p.getByRole('combobox', { name: 'Block type' })).toBeVisible();
      await expect(p.getByText('e.replace is not a function')).toHaveCount(0);
      await p.screenshot({ path: t.outputPath('docs-edit-desktop.png'), fullPage: true });
      await p.getByRole('button', { name: 'Insert content' }).click();
      const insertMenu = p.getByRole('listbox');
      await expect(insertMenu.getByRole('option', { name: 'Accordion', exact: true })).toHaveCount(
        0,
      );
      await expect(insertMenu.getByRole('option', { name: 'Tabs', exact: true })).toHaveCount(0);
      await expect(insertMenu.getByRole('option', { name: 'Table', exact: true })).toBeVisible();
      await expect(insertMenu.getByRole('option', { name: 'Code', exact: true })).toBeVisible();
      await expect(
        insertMenu.getByRole('option', { name: 'Add attachment', exact: true }),
      ).toBeVisible();
      await expect(insertMenu.getByRole('option', { name: 'Image', exact: true })).toHaveCount(0);
      await expect(insertMenu.getByRole('option', { name: 'Embed', exact: true })).toHaveCount(0);
    },
  );
  test(
    'local workspaces expose View, Edit, and Attachments, with leaf files in the Attachments mode',
    XL_VIEWPORT_TEST,
    async ({ page: p }, t) => {
      await p.setViewportSize({ width: 390, height: 844 });
      await p.goto('/workspace-readonly/');
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await expect(p.getByRole('option', { name: 'Edit' })).toBeVisible();
      await expect(p.getByRole('option', { name: 'Code', exact: true })).toHaveCount(0);
      await p.getByRole('option', { name: 'Attachments' }).click();
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-docs-mode', 'attachments');
      await expect(p.getByText('Product brief.pdf')).toBeVisible();
      const attachmentModeWidth = await p
        .getByRole('combobox', { name: 'Mode' })
        .evaluate((element) => element.getBoundingClientRect().width);
      expect(attachmentModeWidth).toBeGreaterThan(90);
      expect(attachmentModeWidth).toBeLessThan(220);
      expect(
        await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await p.screenshot({ path: t.outputPath('docs-shared-mobile.png'), fullPage: true });
    },
  );
  test(
    'host branding stays in the sidebar while leaf metadata stays in the document header',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1280, height: 900 });
      await p.goto('/workspace-readonly/');
      await expect(p.getByRole('link', { name: 'Salesphere Docs' })).toBeVisible();
      const header = p.locator('.docs-document-header');
      await expect(header).toContainText('Salesphere');
      await expect(header).toContainText('A page level description for the Salesphere overview.');
      await expect(header).not.toContainText('Product and engineering documentation.');
      const desc = p.getByRole('textbox', { name: 'Description' });
      await expect(desc).toBeDisabled();
      await expect(desc).toHaveValue('A page level description for the Salesphere overview.');
      await expect(desc).not.toHaveAttribute('class', /min-h-6/);
      await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
    },
  );
});

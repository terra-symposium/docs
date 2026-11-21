/**
 * tests/browser/workspace/editing.spec.ts
 */
/* Workspace editing browser contracts. */

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

test.describe('attachments and document editing', () => {
  test(
    'attachment upload, open, download, and deletion persist across reloads',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/workspace-demo/');
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Attachments' }).click();
      await expect(p.locator('[data-docs-attachments]')).toHaveAttribute('data-loading', 'false');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
      const filename = 'workspace-fixture-attachment.bin';
      await p.getByTestId('docs-attachment-upload').setInputFiles({
        name: filename,
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('Persistent attachment fixture content.'),
      });
      await expect
        .poll(() =>
          p.evaluate(() =>
            (
              window as Window & { __docsActionCalls?: Array<{ operation: string }> }
            ).__docsActionCalls?.some((call) => call.operation === 'write.asset.upload'),
          ),
        )
        .toBe(true);
      await expect(p.getByText(filename, { exact: true })).toBeVisible();
      await p.getByRole('button', { name: `Attachment ${filename}`, exact: true }).click();
      // hygiene-ignore single-use -- Register the download listener before clicking the asset action to avoid an event race.
      const download = p.waitForEvent('download');
      await p.getByRole('button', { name: 'Download Asset', exact: true }).click();
      expect((await download).suggestedFilename()).toBe(filename);
      await p.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
      await p
        .getByRole('button', {
          name: `Attachment ${filename}`,
          exact: true,
        })
        .click({ button: 'right' });
      const attachmentMenu = p.locator('[data-docs-attachment-menu]');
      await expect(
        attachmentMenu.getByRole('menuitem', { name: 'Delete', exact: true }),
      ).toBeVisible();
      await expect
        .poll(async () => {
          const bounds = await attachmentMenu.boundingBox();
          const viewport = p.viewportSize();
          return Boolean(
            bounds &&
            viewport &&
            bounds.x >= 0 &&
            bounds.y >= 0 &&
            bounds.x + bounds.width <= viewport.width &&
            bounds.y + bounds.height <= viewport.height,
          );
        })
        .toBe(true);
      p.once('dialog', (dialog) => dialog.accept());
      await attachmentMenu.getByRole('menuitem', { name: 'Delete', exact: true }).click();
      await expect(p.getByText(filename, { exact: true })).toHaveCount(0);
      const stateWithoutAttachment = await p.evaluate(() =>
        JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'),
      );
      expect(stateWithoutAttachment.documents.salesphere.attachments).not.toContainEqual(
        expect.objectContaining({ name: filename }),
      );
      expect(
        Object.values(stateWithoutAttachment.assets).map((asset: { name: string }) => asset.name),
      ).not.toContain(filename);
      await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Attachments' }).click();
      await expect(p.getByText(filename, { exact: true })).toHaveCount(0);
    },
  );
  test(
    'visual edits save and reload the updated title and content',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/workspace-demo/');
      await waitForWorkspaceReady(p);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Edit' }).click();
      await expect(
        p.locator('[data-docs-edit-toolbar-slot]').getByRole('toolbar', {
          name: 'Editor controls',
        }),
      ).toBeVisible();
      await expect(p.getByRole('toolbar', { name: 'Editor controls' })).toHaveCount(1);
      const editor = p.getByRole('textbox', { name: 'Document editor' });
      await editor.click();
      await p.keyboard.press('ControlOrMeta+End');
      await p.keyboard.press('Enter');
      await p.keyboard.insertText('Body content survives a remote save and reload.');
      await expect(editor).toContainText('Body content survives a remote save and reload.');
      const title = p.getByRole('textbox', { name: 'Title', exact: true });
      await title.fill('Salesphere saved title');
      await p.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(title).toHaveValue('Salesphere saved title');
      const saved = await p.evaluate(() =>
        JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'),
      );
      expect(saved.documents.salesphere.title).toBe('Salesphere saved title');
      expect(JSON.stringify(saved.documents.salesphere.content)).toContain(
        'Body content survives a remote save and reload.',
      );
      expect(saved.documents.salesphere.versions).toHaveLength(1);
      await p.reload();
      await waitForWorkspaceReady(p);
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Salesphere saved title',
      );
      await expect(p.getByRole('textbox', { name: 'Document editor' })).toContainText(
        'Body content survives a remote save and reload.',
      );
    },
  );
  test(
    'visual history restores and saves a prior revision',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/workspace-demo/');
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Edit' }).click();
      const title = p.getByRole('textbox', { name: 'Title', exact: true });
      await title.fill('Salesphere saved title');
      await p.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(title).toHaveValue('Salesphere saved title');
      await p.getByRole('button', { name: 'Version History' }).click();
      const history = p.getByRole('dialog', { name: 'Version History' });
      await expect(history).toBeVisible();
      await history.getByRole('combobox', { name: 'Select a version' }).click();
      await p.getByRole('option', { name: /Salesphere \(/ }).click();
      await history.getByRole('button', { name: 'Restore', exact: true }).click();
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Salesphere',
      );
      await p.getByRole('button', { name: 'Save', exact: true }).click();
      await p.reload({ waitUntil: 'domcontentloaded' });
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Salesphere',
      );
    },
  );
  test(
    'deleting the active leaf switches to the next available page',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/workspace-demo/');
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Salesphere',
      );
      await p.getByRole('link', { name: 'Salesphere', exact: true }).click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Delete leaf', exact: true }).click();
      await p
        .getByRole('dialog', { name: 'Delete leaf?' })
        .getByRole('button', { name: 'Delete' })
        .click();
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Runtime map',
      );
      await expect(
        p.locator('[data-docs-view-root] p').filter({ hasText: 'Runtime map' }),
      ).toBeVisible();
      await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
    },
  );
});

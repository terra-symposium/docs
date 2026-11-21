/**
 * tests/browser/workspace/tree-actions.spec.ts
 */
/* Workspace tree actions browser contracts. */

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

test.describe('sidebar and page organization actions', () => {
  test(
    'tree create and rename persist through the original context menu',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/');
      await waitForWorkspaceReady(p);
      await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
      await p
        .locator('[data-docs-drop^="branch:"]')
        .filter({ hasText: 'Start here' })
        .click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Add leaf', exact: true }).click();
      const createDialog = p.getByRole('dialog', { name: 'Add Leaf' });
      await createDialog
        .getByRole('textbox', { name: 'Leaf title' })
        .fill('Regression fixture page');
      await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
      const created = p.getByRole('link', { name: 'Regression fixture page', exact: true });
      await expect(created).toBeVisible();
      await created.click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Rename leaf', exact: true }).click();
      const renameDialog = p.getByRole('dialog', { name: 'Rename leaf' });
      await expect(renameDialog).toBeVisible();
      await renameDialog.getByRole('textbox').fill('Regression page renamed');
      await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        p.getByRole('link', { name: 'Regression page renamed', exact: true }),
      ).toBeVisible();
      expect(
        Object.values(
          (
            await p.evaluate(() =>
              JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'),
            )
          ).documents,
        ).map((item: { title: string }) => item.title),
      ).toContain('Regression page renamed');
      await p.reload({ waitUntil: 'commit' });
      await expect(
        p.getByRole('link', { name: 'Regression page renamed', exact: true }),
      ).toBeVisible();
    },
  );
  test(
    'tree duplicate, download, and delete persist through the original context menu',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/', { waitUntil: 'domcontentloaded' });
      await waitForWorkspaceReady(p);
      await p.getByRole('link', { name: 'Salesphere', exact: true }).click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Duplicate leaf', exact: true }).hover();
      await p.getByRole('menuitem', { name: 'By content (Duplicate leaf)', exact: true }).click();
      const duplicateDialog = p.getByRole('dialog', { name: 'Duplicate by Content' });
      await expect(duplicateDialog).toBeVisible();
      await duplicateDialog
        .getByRole('textbox', { name: 'New leaf name' })
        .fill('Regression page copy');
      await duplicateDialog.getByRole('button', { name: 'Save', exact: true }).click();
      const duplicate = p.getByRole('link', { name: 'Regression page copy', exact: true });
      await expect(duplicate).toBeVisible();
      await duplicate.click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Download leaf', exact: true }).click();
      const exportDialog = p.getByRole('dialog');
      await expect(exportDialog).toBeVisible();
      // hygiene-ignore single-use -- Register ZIP download before triggering export to avoid an event race.
      const download = p.waitForEvent('download');
      await exportDialog.getByRole('button', { name: 'Download ZIP', exact: true }).click();
      expect((await download).suggestedFilename()).toMatch(/\.zip$/i);
      await duplicate.click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Delete leaf', exact: true }).click();
      await p
        .getByRole('dialog', { name: 'Delete leaf?' })
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
      await expect(duplicate).toHaveCount(0);
      expect(
        Object.values(
          (
            await p.evaluate(() =>
              JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'),
            )
          ).documents,
        ).map((item: { title: string }) => item.title),
      ).not.toContain('Regression page copy');
      await p.reload({ waitUntil: 'commit' });
      await expect(p.getByRole('link', { name: 'Salesphere', exact: true })).toBeVisible();
      await expect(p.getByRole('link', { name: 'Regression page copy', exact: true })).toHaveCount(
        0,
      );
    },
  );
  test(
    'branch create, rename, and reorder use the shared sidebar actions',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/');
      await waitForWorkspaceReady(p);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Edit' }).click();
      await p.getByRole('combobox', { name: 'Tree' }).click();
      await p.getByRole('option', { name: 'Add tree', exact: true }).click();
      const sectionDialog = p.getByRole('dialog', { name: 'Add Tree' });
      await sectionDialog.getByRole('textbox', { name: 'Tree name' }).fill('Group lifecycle');
      await sectionDialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(async () =>
          p.evaluate(() => {
            return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}').tree.some(
              (node: { title?: string }) => node.title === 'Group lifecycle',
            );
          }),
        )
        .toBe(true);
      await p.getByRole('combobox', { name: 'Tree' }).click();
      await p.getByRole('option', { name: 'Group lifecycle', exact: true }).click();
      const sidebarContent = p.locator('[data-sidebar="content"]').filter({ visible: true }).last();
      await expect(sidebarContent).toBeVisible();
      await sidebarContent.dispatchEvent('contextmenu', { button: 2, clientX: 16, clientY: 160 });
      const addGroup = p.getByRole('menuitem', { name: 'Add branch', exact: true });
      await expect(addGroup).toBeVisible();
      await addGroup.click();
      const createDialog = p.getByRole('dialog', { name: 'Add Branch' });
      await createDialog.getByRole('textbox', { name: 'Branch name' }).fill('Regression group');
      await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
      const sectionId = await p.evaluate(() => {
        return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}').tree.find(
          (node: { title?: string }) => node.title === 'Group lifecycle',
        ).origName;
      });
      const group = p
        .locator(`[data-docs-drop^="branch:${sectionId}/"]`)
        .filter({ hasText: 'Regression group' });
      await expect(group).toBeVisible();
      await expect(
        p.locator('[data-docs-drop^="leaf:"]').filter({ hasText: 'Untitled' }),
      ).toBeVisible();
      await group.click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Rename branch', exact: true }).click();
      const renameDialog = p.getByRole('dialog', { name: 'Rename Branch' });
      await renameDialog.getByRole('textbox', { name: 'Branch name' }).fill('Regression renamed');
      await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
      const renamedGroup = p
        .locator(`[data-docs-drop^="branch:${sectionId}/"]`)
        .filter({ hasText: 'Regression renamed' });
      await expect(renamedGroup).toBeVisible();
      // hygiene-ignore single-use -- Read the original branch identifier before later rename and reorder assertions.
      const generalGroupId = await p.evaluate(() => {
        return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}')
          .tree.find((node: { title?: string }) => node.title === 'Group lifecycle')
          .children.find((node: { title?: string }) => node.title === 'General').origName;
      });
      await renamedGroup
        .getByRole('button', { name: 'Reorder item' })
        .dragTo(p.locator(`[data-docs-drop="branch:${sectionId}/${generalGroupId}"]`), {
          targetPosition: { x: 8, y: 1 },
        });
      await expect
        .poll(async () =>
          p.evaluate(() => {
            return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}')
              .tree.find((node: { title?: string }) => node.title === 'Group lifecycle')
              .children.map((node: { title?: string }) => node.title);
          }),
        )
        .toEqual(['Regression renamed', 'General']);
      await expect(renamedGroup).toBeVisible();
    },
  );
  test(
    'group deletion removes its sidebar branch and preserves the remaining section content',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/', { waitUntil: 'domcontentloaded' });
      await waitForWorkspaceReady(p);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Edit' }).click();
      const sectionId = await p.evaluate(() => {
        return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}').tree.find(
          (node: { title?: string }) => node.title === 'Overview',
        ).origName;
      });
      const sidebarContent = p.locator('[data-sidebar="content"]').filter({ visible: true }).last();
      await expect(sidebarContent).toBeVisible();
      await sidebarContent.dispatchEvent('contextmenu', { button: 2, clientX: 16, clientY: 160 });
      await p.getByRole('menuitem', { name: 'Add branch', exact: true }).click();
      const createDialog = p.getByRole('dialog', { name: 'Add Branch' });
      await createDialog
        .getByRole('textbox', { name: 'Branch name' })
        .fill('Regression deletion group');
      await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
      const group = p
        .locator(`[data-docs-drop^="branch:${sectionId}/"]`)
        .filter({ hasText: 'Regression deletion group' });
      await expect(group).toBeVisible();
      await group.click({ button: 'right' });
      await p.getByRole('menuitem', { name: 'Delete branch', exact: true }).click();
      await p
        .getByRole('dialog', { name: /Delete branch\?/i })
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
      await expect(group).toHaveCount(0);
      const remainingGroups = await p.evaluate((id) => {
        return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}').tree.find(
          (node: { origName?: string }) => node.origName === id,
        ).children;
      }, sectionId);
      expect(remainingGroups.map((node: { title?: string }) => node.title)).toEqual(['Start here']);
      expect(remainingGroups[0].children.map((node: { title?: string }) => node.title)).toEqual([
        'Salesphere',
        'Runtime map',
      ]);
    },
  );
  test(
    'leaf reorder is stored and appears in the same order after reload',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/');
      await waitForWorkspaceReady(p);
      const reorderHandle = p
        .locator('[data-docs-drop]')
        .filter({ hasText: 'Salesphere' })
        .getByRole('button', { name: 'Reorder item' });
      await expect(reorderHandle).toBeEnabled();
      await reorderHandle.dragTo(p.locator('[data-docs-drop]').filter({ hasText: 'Runtime map' }), {
        // A leaf row is only 24px tall in the shared sidebar. Drop near its bottom
        // so this specifically tests insertion after the target leaf.
        targetPosition: { x: 8, y: 23 },
      });
      await expect
        .poll(
          () =>
            p.evaluate(() => {
              return JSON.parse(
                localStorage.getItem('docs-workspace-demo-v1') ?? '{}',
              ).tree[0].children[0].children.map((node: { origName: string }) => node.origName);
            }),
          { timeout: 5_000 },
        )
        .toEqual(['runtime-map', 'salesphere']);
      await p.reload();
      await expect
        .poll(async () => p.locator('[data-docs-drop^="leaf:"] a').allTextContents(), {
          timeout: 10_000,
        })
        .toEqual(['Runtime map', 'Salesphere']);
    },
  );
  test(
    'merging selected pages through the sidebar retains source content and all attachments',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
      await waitForWorkspaceReady(p);
      await p.evaluate(() => {
        const key = 'docs-workspace-demo-v1';
        const state = JSON.parse(localStorage.getItem(key) ?? '{}');
        const attachment = {
          id: 'runtime-map-attachment',
          name: 'Runtime trace.zip',
          path: '/assets/runtime-trace.zip',
          type: 'application/zip',
          size: 18,
        };
        state.documents['runtime-map'].attachments.push(attachment);
        state.assets[attachment.path] = {
          ...attachment,
          docId: 'runtime-map',
          bytes: [80, 75, 3, 4, 68, 79, 67, 83],
        };
        localStorage.setItem(key, JSON.stringify(state));
      });
      await p.reload();
      await waitForWorkspaceReady(p);
      const runtimeMap = p.getByRole('link', { name: 'Runtime map', exact: true });
      await p.getByRole('link', { name: 'Salesphere', exact: true }).click({ modifiers: ['Meta'] });
      await runtimeMap.click({ modifiers: ['Meta'] });
      await runtimeMap.click({ button: 'right' });
      const merge = p.getByRole('menuitem', { name: 'Merge 2 leaves', exact: true });
      await expect(merge).toBeVisible();
      await merge.click();
      const prompt = p.getByRole('dialog', { name: 'Merge Leaves' });
      await prompt.getByRole('textbox', { name: 'New leaf title' }).fill('Combined guide');
      await prompt.getByRole('button', { name: 'Save', exact: true }).click();
      const mergedView = p.locator('[data-docs-view-root]');
      await expect(mergedView).toContainText('Salesphere helps sales professionals');
      await expect(mergedView).toContainText('The request enters through the Astro application.');
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Combined guide',
      );
      const persisted = await p.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}');
        return {
          runtimeMapExists: Boolean(state.documents['runtime-map']),
          merged: state.documents.salesphere,
          runtimeAssetOwner: state.assets['/assets/runtime-trace.zip']?.docId,
          retargetWasCalled: (
            window as Window & { __docsActionCalls?: Array<{ operation: string }> }
          ).__docsActionCalls?.some((call) => call.operation === 'write.doc.retargetSources'),
        };
      });
      expect(persisted.runtimeMapExists).toBe(false);
      expect(persisted.runtimeAssetOwner).toBe('salesphere');
      expect(persisted.retargetWasCalled).toBe(true);
      expect(persisted.merged.title).toBe('Combined guide');
      expect(persisted.merged.source).toContain('## Salesphere');
      expect(persisted.merged.source).toContain('## Runtime map');
      expect(
        persisted.merged.attachments.map((item: { name: string }) => item.name).sort(),
      ).toEqual(['Product brief.pdf', 'Runtime trace.zip']);
      await expect(p.getByRole('link', { name: 'Runtime map', exact: true })).toHaveCount(0);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Attachments' }).click();
      await expect(p.getByRole('button', { name: 'Attachment Product brief.pdf' })).toBeVisible();
      await expect(p.getByRole('button', { name: 'Attachment Runtime trace.zip' })).toBeVisible();
      await p.reload();
      await waitForWorkspaceReady(p);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Attachments' }).click();
      await expect(p.getByRole('button', { name: 'Attachment Product brief.pdf' })).toBeVisible();
      await expect(p.getByRole('button', { name: 'Attachment Runtime trace.zip' })).toBeVisible();
    },
  );
});

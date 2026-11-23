/**
 * tests/browser/workspace/static-source.spec.ts
 */
/* Workspace static source browser contracts. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import {
  expect,
  test,
  XL_VIEWPORT_TEST,
  waitForWorkspaceReady,
} from '../support/workspace-fixture';
import { readFile } from 'node:fs/promises';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe('local source downloads', () => {
  test(
    'static Markdown page downloads its edited source on Save',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/consumer/0-configuration/0-install/');
      await waitForWorkspaceReady(p);
      await expect(p.getByRole('heading', { name: '1. Prepare' })).toBeVisible();
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Edit', exact: true }).click();
      await p
        .getByRole('textbox', { name: 'Title', exact: true })
        .fill('Getting started with Docs');
      const editor = p.locator('[data-docs-body-editor] [data-docs-article-editor="true"]');
      await editor.locator('p').first().click();
      await p.keyboard.press('End');
      await p.keyboard.insertText(' The downloaded file includes this edit.');
      await expect(editor).toContainText('The downloaded file includes this edit.');
      const [download] = await Promise.all([
        p.waitForEvent('download'),
        p.getByRole('button', { name: 'Save', exact: true }).click(),
      ]);
      expect(download.suggestedFilename()).toBe('0-install.md');
      const src = await readFile(await download.path(), 'utf8');
      expect(src).toContain('title: Getting started with Docs');
      expect(src).toContain('The downloaded file includes this edit.');
      expect(src).toContain('## 1. Prepare');
    },
  );
  test(
    'Tree reference editor opens and preserves rich Markdown on Save',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/consumer/1-usage/0-tree/?mode=edit');
      await waitForWorkspaceReady(p);
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-docs-mode', 'edit');
      await expect(p.locator('[data-docs-article-editor="true"]')).toBeVisible();
      await expect(p.getByRole('heading', { name: 'Editor Surface Crashed' })).toHaveCount(0);
      await p.getByRole('textbox', { name: 'Title', exact: true }).fill('Tree operations');
      const [download] = await Promise.all([
        p.waitForEvent('download'),
        p.getByRole('button', { name: 'Save', exact: true }).click(),
      ]);
      expect(download.suggestedFilename()).toBe('0-tree.md');
      const src = await readFile(await download.path(), 'utf8');
      expect(src).toContain('title: Tree operations');
      expect(src).toContain('| 🧭 Level');
      expect(src).toContain('|||[Local]');
    },
  );
  test(
    'local embedded workspace downloads edited Markdown on Save',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.addInitScript(
        (fixture) => {
          Object.assign(window, { __docsLocalWorkspaceFixture: fixture });
        },
        {
          tree: [
            {
              type: 'branch',
              origName: 'guides',
              title: 'Guides',
              path: 'guides',
              children: [
                {
                  type: 'leaf',
                  origName: 'start',
                  title: 'Start',
                  path: 'docs/start.md',
                  url: '/docs/start/',
                },
              ],
            },
          ],
          pages: [
            {
              id: 'start',
              path: 'docs/start.md',
              pathname: '/docs/start/',
              title: 'Start',
              markdown:
                '---\ntitle: Start\nsidebar:\n  label: Start\n---\n\n## First step\n\nOriginal text.\n',
            },
          ],
          pathname: '/docs/start/',
          title: 'Fixture Docs',
          rootPath: '/docs/',
        },
      );
      await p.goto('/strict-local-workspace-harness/');
      await waitForWorkspaceReady(p);
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Edit', exact: true }).click();
      await p.getByRole('textbox', { name: 'Title', exact: true }).fill('Updated start');
      const [download] = await Promise.all([
        p.waitForEvent('download'),
        p.getByRole('button', { name: 'Save', exact: true }).click(),
      ]);
      expect(download.suggestedFilename()).toBe('start.md');
      const src = await readFile(await download.path(), 'utf8');
      expect(src).toContain('title: Updated start');
      expect(src).toContain('label: Start');
      expect(src).toContain('## First step');
    },
  );
});

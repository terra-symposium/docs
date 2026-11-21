/**
 * tests/browser/workspace/navigation.spec.ts
 */
/* Workspace navigation browser contracts. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import {
  expect,
  test,
  XL_VIEWPORT_TEST,
  DESKTOP_BREAKPOINT_TEST,
  waitForWorkspaceReady,
} from '../support/workspace-fixture';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe('shared shell and document navigation', () => {
  test(
    'shared workspace keeps the Terra header, toolbar position, section navigation, and tree selection',
    DESKTOP_BREAKPOINT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
      await waitForWorkspaceReady(p);
      await expect(p.getByRole('heading', { name: 'Start with the product' })).toBeVisible();
      await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
      await expect(p.getByRole('link', { name: 'Salesphere Docs' })).toBeVisible();
      await expect(p.getByRole('combobox', { name: 'Tree' })).toBeVisible();
      await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
      await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
      await expect(p.getByText(/Last modified/)).toBeVisible();
      // The pinned UI has no persistent section action button; actions live in the selector.
      await expect(p.getByRole('button', { name: /Actions for section/ })).toHaveCount(0);
      await expect(p.getByRole('button', { name: 'Actions for group Start here' })).toHaveCount(0);
      const toolbarPosition = await p.evaluate(() => {
        const header = document.querySelector('.docs-document-header');
        const toolbar = document.querySelector('[data-docs-toolbar-frame]');
        const proseHeading = document.querySelector<HTMLElement>('[data-docs-view-root] h2');
        const pageContents = document.querySelector<HTMLElement>('nav[aria-label="On this page"]');
        const workspace = document.querySelector<HTMLElement>('.docs-workspace');
        return {
          followsHeader:
            !!header &&
            !!toolbar &&
            Boolean(header.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING),
          toolbarWidth: toolbar?.getBoundingClientRect().width ?? 0,
          modeWidth:
            document.querySelector<HTMLElement>('[aria-label="Mode"]')?.getBoundingClientRect()
              .width ?? 0,
          fontFamily: workspace ? getComputedStyle(workspace).fontFamily : '',
          headingWidth: proseHeading?.getBoundingClientRect().width ?? 0,
          headingFontSize: proseHeading ? getComputedStyle(proseHeading).fontSize : '',
          headingGap:
            proseHeading && toolbar
              ? proseHeading.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom
              : 0,
          contentsGap:
            pageContents && toolbar
              ? pageContents.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom
              : 0,
          toolbarMarginTop: toolbar ? getComputedStyle(toolbar).marginTop : '',
          headingScrollMargin: proseHeading
            ? parseFloat(getComputedStyle(proseHeading).scrollMarginTop)
            : 0,
        };
      });
      expect(toolbarPosition.followsHeader).toBeTruthy();
      expect(toolbarPosition.toolbarWidth).toBeGreaterThan(300);
      expect(toolbarPosition.toolbarWidth).toBeLessThan(1440);
      expect(toolbarPosition.modeWidth).toBeGreaterThan(40);
      expect(toolbarPosition.modeWidth).toBeLessThan(100);
      expect(toolbarPosition.fontFamily).toContain('Inter');
      expect(toolbarPosition.headingWidth).toBeCloseTo(720, 0);
      expect(toolbarPosition.headingFontSize).toBe('30px');
      expect(toolbarPosition.headingGap).toBeGreaterThan(48);
      expect(toolbarPosition.contentsGap).toBeGreaterThan(48);
      expect(toolbarPosition.toolbarMarginTop).toBe('0px');
      expect(toolbarPosition.headingScrollMargin).toBeGreaterThanOrEqual(160);
      const hostPalette = await p.evaluate(() => {
        const host = document.querySelector('.workspace-demo-theme');
        const workspace = document.querySelector('.docs-workspace');
        return {
          host: host ? getComputedStyle(host).getPropertyValue('--primaryLight9').trim() : '',
          workspace: workspace
            ? getComputedStyle(workspace).getPropertyValue('--primary-9').trim()
            : '',
        };
      });
      expect(hostPalette.host).not.toBe('');
      expect(hostPalette.workspace).toBe(hostPalette.host);
      const mobileHeader = p.locator('.docs-workspace header.md\\:hidden');
      await expect
        .poll(() => mobileHeader.evaluate((element) => getComputedStyle(element).display))
        .toBe('none');
      await p.setViewportSize({ width: 768, height: 900 });
      await expect
        .poll(() => mobileHeader.evaluate((element) => getComputedStyle(element).display))
        .toBe('none');
      await p.setViewportSize({ width: 767, height: 900 });
      await expect
        .poll(() => mobileHeader.evaluate((element) => getComputedStyle(element).display))
        .toBe('flex');
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.getByRole('combobox', { name: 'Tree' }).click();
      await p.getByRole('option', { name: 'Configure' }).click();
      await expect(p.getByRole('link', { name: 'Local files' })).toBeVisible();
      await p.getByRole('combobox', { name: 'Tree' }).click();
      await p.getByRole('option', { name: 'Overview' }).click();
    },
  );
  test(
    'branch and leaf context menus expose actions and support drag reordering',
    XL_VIEWPORT_TEST,
    async ({ page: p }, t) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
      await waitForWorkspaceReady(p);
      const leaf = p.getByRole('link', { name: 'Salesphere', exact: true });
      const startHereGroup = p
        .locator('[data-docs-drop^="branch:"]')
        .filter({ hasText: 'Start here' });
      await startHereGroup.hover();
      await expect(p.getByRole('button', { name: 'Actions for group Start here' })).toHaveCount(0);
      await startHereGroup.click({ button: 'right' });
      for (const name of [
        'Copy link',
        'Add leaf',
        'Manage attachments',
        'Download branch',
        'Rename branch',
        'Delete branch',
      ]) {
        await expect(p.getByRole('menuitem', { name })).toBeVisible();
      }
      await p.getByRole('menuitem', { name: 'Manage attachments' }).click();
      await expect(p.getByRole('dialog')).toContainText('Manage Attachments');
      await p.keyboard.press('Escape');
      await startHereGroup.click({ button: 'right' });
      await expect(p.getByRole('menuitem', { name: 'Add leaf' })).toBeVisible();
      await p.keyboard.press('Escape');
      await leaf.click({ button: 'right' });
      const contextMenu = p.getByRole('menu');
      await expect(contextMenu).toBeVisible();
      await expect
        .poll(() =>
          contextMenu.evaluate(
            (menu) =>
              menu.closest('[data-radix-popper-content-wrapper]')?.parentElement === document.body,
          ),
        )
        .toBe(true);
      await expect(p.getByRole('menuitem', { name: 'Files' })).toBeVisible();
      await expect(p.getByRole('menuitem', { name: 'Rename leaf' })).toBeVisible();
      await expect(p.getByRole('menuitem', { name: 'Delete leaf' })).toBeVisible();
      await expect(p.getByRole('menuitem', { name: 'Duplicate leaf' })).toBeVisible();
      await p.waitForTimeout(250);
      await p.screenshot({ path: t.outputPath('docs-leaf-context-menu.png'), fullPage: true });
      await p.keyboard.press('Escape');
      await leaf.hover();
      await expect(p.getByRole('button', { name: 'Reorder item' }).last()).toBeVisible();
      await p
        .locator('[data-docs-drop]')
        .filter({ hasText: 'Salesphere' })
        .getByRole('button', { name: 'Reorder item' })
        .dragTo(p.locator('[data-docs-drop]').filter({ hasText: 'Runtime map' }));
      await expect
        .poll(() =>
          p.evaluate(() =>
            (
              window as Window & { __docsActionCalls?: Array<{ operation: string }> }
            ).__docsActionCalls?.some((call) => call.operation === 'write.doc.reorder'),
          ),
        )
        .toBe(true);
      await p.screenshot({ path: t.outputPath('docs-shared-desktop.png'), fullPage: true });
    },
  );
  test(
    'switching between leaves hot-swaps the active document without a page reload',
    {
      tag: '@viewport:xl',
      annotation: {
        type: 'viewport-reason',
        description:
          'Leaf navigation and document replacement are exercised in the wide workspace.',
      },
    },
    async ({ page: p }) => {
      await p.addInitScript(() => {
        const key = 'docs-document-instance-count';
        sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));
      });
      await p.goto('/workspace-stable-demo/?section=overview&group=start-here&leaf=salesphere');
      await waitForWorkspaceReady(p);
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Salesphere',
      );
      await expect(p.locator('[data-docs-view-root]')).toContainText('Start with the product');
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Edit', exact: true }).click();
      const editor = p.getByRole('textbox', { name: 'Document editor' });
      await expect(editor).toContainText('Start with the product');
      await p.getByRole('link', { name: 'Runtime map', exact: true }).click();
      await expect(p).toHaveURL(/leaf=runtime-map/);
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Runtime map',
      );
      await expect(editor).toContainText('The request enters through the Astro application.');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
      await p.getByRole('link', { name: 'Salesphere', exact: true }).click();
      await expect(p).toHaveURL(/leaf=salesphere/);
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Salesphere',
      );
      await expect(editor).toContainText('Start with the product');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
      await expect
        .poll(() => p.evaluate(() => sessionStorage.getItem('docs-document-instance-count')))
        .toBe('1');
    },
  );
  test(
    'static Docs sibling links navigate to the selected leaf without dispatching stale content',
    {
      tag: '@viewport:xl',
      annotation: {
        type: 'viewport-reason',
        description:
          'Static sibling pages must render their own content instead of hot-swapping the current body.',
      },
    },
    async ({ page: p }) => {
      let loadCount = 0;
      p.on('load', () => {
        loadCount += 1;
      });
      await p.addInitScript(() => {
        document.addEventListener('docs:navigate', (event) => {
          const detail = (event as CustomEvent<{ pathname?: string }>).detail;
          if (detail.pathname && detail.pathname !== window.location.pathname)
            sessionStorage.setItem('docs-stale-navigation', detail.pathname);
        });
      });
      await p.goto('/static-leaf-swap/one/');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Leaf one');
      const content = p.locator('[data-docs-view-root]');
      await expect(content).toContainText('Content from the first static leaf.');
      expect(loadCount).toBe(1);
      await p.getByRole('link', { name: 'Leaf two', exact: true }).click();
      await expect(p).toHaveURL(/\/static-leaf-swap\/two\/$/);
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Leaf two');
      await expect(content).toContainText('Content from the second static leaf.');
      await expect
        .poll(() => p.evaluate(() => sessionStorage.getItem('docs-stale-navigation')))
        .toBeNull();
      expect(loadCount).toBe(2);
    },
  );
  test(
    'view headings keep hover permalinks and the sidebar table of contents behavior',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
      await waitForWorkspaceReady(p);
      const heading = p
        .locator('[data-docs-view-root] h2')
        .filter({ hasText: /^Start with the product$/ });
      await expect(heading).toBeVisible();
      const copy = heading.getByRole('button', { name: 'Copy link to Start with the product' });
      await expect(copy).toHaveCount(1);
      await heading.hover();
      await expect(copy.locator('.heading-anchor-icon')).toBeVisible();
      const origin = new URL(p.url()).origin;
      await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
      await copy.click();
      await expect
        .poll(() => p.evaluate(() => navigator.clipboard.readText()))
        .toBe(`${origin}/workspace-demo/#start-with-the-product`);
      await p.evaluate(() => {
        const key = 'docs-workspace-demo-v1';
        const state = JSON.parse(localStorage.getItem(key) ?? '{}');
        state.documents.salesphere.content.push({
          _key: 'heading-navigation-tail',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {
              _key: 'heading-navigation-tail-text',
              _type: 'span',
              marks: [],
              text: 'Trailing content keeps enough page height to verify heading navigation. '.repeat(
                80,
              ),
            },
          ],
        });
        localStorage.setItem(key, JSON.stringify(state));
      });
      await p.reload();
      await waitForWorkspaceReady(p);
      const toc = p.getByRole('navigation', { name: 'On this page' });
      await expect(toc).toBeVisible();
      const target = toc.getByRole('link', { name: 'Jump to Find the implementation' });
      await expect(target).toBeVisible();
      await target.click();
      await expect(p).toHaveURL(/#find-the-implementation$/);
      await expect
        .poll(
          async () =>
            (
              await p
                .locator('[data-docs-view-root] h2')
                .filter({ hasText: /^Find the implementation$/ })
                .boundingBox()
            )?.y ?? Number.POSITIVE_INFINITY,
        )
        .toBeLessThan(180);
    },
  );
  test(
    'shared workspace performs deletion and opens attachment management from its original controls',
    XL_VIEWPORT_TEST,
    async ({ page: p }) => {
      await p.goto('/workspace-demo/');
      await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-docs-mode', 'view');
      await p.getByRole('link', { name: 'Runtime map', exact: true }).click({ button: 'right' });
      await expect(p.getByRole('menuitem', { name: 'Delete leaf' })).toBeVisible();
      await p.getByRole('menuitem', { name: 'Delete leaf' }).click();
      await expect(p.getByRole('dialog')).toContainText('Delete leaf?');
      await p.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await expect
        .poll(() =>
          p.evaluate(() =>
            (
              window as Window & { __docsActionCalls?: Array<{ operation: string }> }
            ).__docsActionCalls?.some((call) => call.operation === 'write.doc.rm'),
          ),
        )
        .toBe(true);
      await expect(p.getByRole('link', { name: 'Runtime map', exact: true })).toHaveCount(0);
      await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
        'Salesphere',
      );
      await p.getByRole('combobox', { name: 'Mode' }).click();
      await p.getByRole('option', { name: 'Attachments' }).click();
      await expect(p.locator('[data-docs-attachments]')).toBeVisible();
      await expect(p.getByText('Product brief.pdf')).toBeVisible();
      await p
        .locator('[data-docs-attachments]')
        .evaluate((element) =>
          element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 })),
        );
      await expect(p.getByRole('dialog')).toContainText('Add Attachment');
      await expect(p.getByRole('button', { name: 'Add Document attachment' })).toBeVisible();
    },
  );
});

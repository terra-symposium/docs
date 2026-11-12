/**
 * test/browser/workspace.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';

// TYPES
import type { Page } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const browserErrs = new WeakMap<Page, string[]>();
const XL_VIEWPORT_TEST = {
  tag: '@viewport:xl',
  annotation: {
    type: 'viewport-reason',
    description:
      'Layout-independent workspace behavior runs once at the canonical desktop width; breakpoint cases set and verify their own widths.',
  },
} as const;
const DESKTOP_BREAKPOINT_TEST = {
  tag: '@viewport:xl',
  annotation: {
    type: 'viewport-reason',
    description:
      'The scenario checks the desktop header at 768 px and the mobile header at 767 px around the md breakpoint.',
  },
} as const;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Waits until the workspace has released its initial loading shell.
 *
 * @param page Browser page currently displaying a workspace route.
 */
async function waitForWorkspaceReady(page: Page): Promise<void> {
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false', {
    timeout: 30_000,
  });
}
/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe('Docs workspace browser contracts', () => {
  test.beforeEach(async ({ page: p }) => {
    const errs: string[] = [];
    browserErrs.set(p, errs);
    p.on('pageerror', (error) => errs.push(error.message));
    p.on('console', (message) => {
      if (message.type() === 'error') errs.push(message.text());
    });
    p.on('requestfailed', (request) => {
      errs.push(
        `Request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`,
      );
    });
    await p.addInitScript(() => {
      const resetKey = 'docs-fixture-initialized';
      if (sessionStorage.getItem(resetKey) === 'true') return;
      localStorage.removeItem('docs-workspace-demo-v1');
      sessionStorage.setItem(resetKey, 'true');
    });
  });
  test.afterEach(async ({ page: p }) => {
    expect(browserErrs.get(p) ?? [], 'Unhandled browser errors').toEqual([]);
  });
  test.describe('read-only routes, Markdown, and responsive rendering', () => {
    test(
      'standalone Astro pages mount the extracted read-only workspace with their nested navigation',
      DESKTOP_BREAKPOINT_TEST,
      async ({ page: p }, t) => {
        await p.setViewportSize({ width: 1440, height: 1000 });
        await p.goto('/');
        await expect(p.getByRole('link', { name: 'Docs', exact: true }).first()).toBeVisible();
        await expect(p.getByRole('link', { name: 'Create an instance' })).toBeVisible();
        await expect(p.getByRole('combobox', { name: 'Section' })).toBeVisible();
        await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
        await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
        await expect(p.getByRole('heading', { name: 'Requirements' })).toBeVisible();
        await p.screenshot({ path: t.outputPath('docs-static-desktop.png'), fullPage: true });
        const mobileHeader = p.locator('.docs-workspace header.md\\:hidden');
        await expect
          .poll(() => mobileHeader.evaluate((element) => getComputedStyle(element).display))
          .toBe('none');
        await p.setViewportSize({ width: 768, height: 900 });
        await expect
          .poll(() => mobileHeader.evaluate((element) => getComputedStyle(element).display))
          .toBe('none');
        await p.screenshot({ path: t.outputPath('docs-static-breakpoint.png'), fullPage: true });
        await p.setViewportSize({ width: 767, height: 900 });
        await expect
          .poll(() => mobileHeader.evaluate((element) => getComputedStyle(element).display))
          .toBe('flex');
        await p.screenshot({ path: t.outputPath('docs-static-mobile.png'), fullPage: true });
        await p.setViewportSize({ width: 1440, height: 1000 });
        const storagePage = p.getByRole('link', { name: 'Storage providers', exact: true });
        await expect(storagePage).toBeVisible();
        await storagePage.click();
        await expect(p).toHaveURL(/\/development\/storage\//);
        await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Storage providers');
      },
    );
    test(
      'read-only Docs hides the section selector when the navigation has one section',
      {
        tag: '@viewport:xl @viewport:md @viewport:mobile',
        annotation: {
          type: 'viewport-reason',
          description:
            'The single-section navigation should stay compact at every supported width.',
        },
      },
      async ({ page: p }) => {
        await p.goto('/workspace-readonly/');
        await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
        if ((p.viewportSize()?.width ?? 0) < 768)
          await p.getByRole('button', { name: 'Toggle Sidebar' }).click();
        const sectionSelect = p.getByRole('combobox', { name: 'Section' });
        await expect(sectionSelect).toBeVisible();
        await expect
          .poll(() => p.evaluate(() => localStorage.getItem('docs-workspace-demo-v1')))
          .not.toBeNull();
        await p.evaluate(() => {
          const key = 'docs-workspace-demo-v1';
          const fixture = JSON.parse(localStorage.getItem(key) ?? '{}');
          fixture.tree = fixture.tree.slice(0, 1);
          localStorage.setItem(key, JSON.stringify(fixture));
          window.dispatchEvent(new CustomEvent('docs-fixture-updated'));
        });
        await expect(sectionSelect).toHaveCount(0);
        await expect(p.getByRole('link', { name: 'Salesphere Docs', exact: true })).toBeVisible();
      },
    );
    test(
      'local Markdown thematic breaks render as visible dividers in the Docs workspace',
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
                origName: 'programming',
                title: 'Programming',
                path: 'programming',
                children: [
                  {
                    type: 'leaf',
                    origName: 'divider-page',
                    title: 'Divider page',
                    path: 'programming/divider-page/index.md',
                    url: '/docs/divider-page/',
                  },
                ],
              },
            ],
            pages: [
              {
                id: 'divider-page',
                path: 'content/programming/divider-page/index.md',
                pathname: '/docs/divider-page/',
                title: 'Divider page',
                markdown: 'Before the rule.\n\n---\n\nAfter the rule.',
              },
            ],
            pathname: '/docs/divider-page/',
            title: 'Fixture Docs',
            hue: 145,
            rootPath: '/docs/',
            homePath: '/docs/divider-page/',
          },
        );
        await p.goto('/strict-local-workspace-harness/');
        await waitForWorkspaceReady(p);
        const content = p.locator('[data-docs-view-root]');
        const divider = content.locator('hr[data-docs-raw-divider]');
        await expect(divider).toHaveCount(1);
        await expect(divider).toBeVisible();
        await expect(content).toContainText('Before the rule.');
        await expect(content).toContainText('After the rule.');
        await expect(content.locator('[data-docs-code-block="view"]')).toHaveCount(0);
      },
    );
    test(
      'Markdown ordered lists keep consecutive numbering and restart after a paragraph',
      XL_VIEWPORT_TEST,
      async ({ page: p }, t) => {
        await p.addInitScript(
          (fixture) => {
            Object.assign(window, { __docsLocalWorkspaceFixture: fixture });
          },
          {
            tree: [
              {
                type: 'branch',
                origName: 'programming',
                title: 'Programming',
                path: 'programming',
                children: [
                  {
                    type: 'leaf',
                    origName: 'numbered-page',
                    title: 'Numbered page',
                    path: 'programming/numbered-page/index.md',
                    url: '/docs/numbered-page/',
                  },
                ],
              },
            ],
            pages: [
              {
                id: 'numbered-page',
                path: 'content/programming/numbered-page/index.md',
                pathname: '/docs/numbered-page/',
                title: 'Numbered page',
                markdown: [
                  '## Ordered steps',
                  '',
                  '1. First step',
                  '2. Second step',
                  '3. Third step',
                  '',
                  'A separate paragraph ends the list.',
                  '',
                  '1. A new list starts at one.',
                  '',
                  '- Base bullet',
                  '  - Nested bullet',
                  '    - Third-level bullet',
                ].join('\n'),
              },
            ],
            pathname: '/docs/numbered-page/',
            title: 'Fixture Docs',
            hue: 145,
            rootPath: '/docs/',
            homePath: '/docs/numbered-page/',
          },
        );
        await p.goto('/strict-local-workspace-harness/');
        await waitForWorkspaceReady(p);
        const content = p.locator('[data-docs-view-root]');
        await expect(content.getByText('First step')).toBeVisible();
        const orderedLists = content.locator('ol');
        await expect(orderedLists).toHaveCount(2);
        await expect
          .poll(() =>
            orderedLists.evaluateAll((lists) =>
              lists.map((list) => Number(list.getAttribute('start') ?? 1)),
            ),
          )
          .toEqual([1, 1]);
        await expect(content.locator('ol li')).toHaveText([
          'First step',
          'Second step',
          'Third step',
          'A new list starts at one.',
        ]);
        const baseList = content
          .locator('ul[data-docs-list-level="1"]')
          .filter({ hasText: 'Base bullet' });
        const nestedList = content
          .locator('ul[data-docs-list-level="2"]')
          .filter({ hasText: 'Nested bullet' });
        const thirdLevelList = content
          .locator('ul[data-docs-list-level="3"]')
          .filter({ hasText: 'Third-level bullet' });
        await expect(baseList).toHaveCount(1);
        await expect(nestedList).toHaveCount(1);
        await expect(thirdLevelList).toHaveCount(1);
        const listLayout = await Promise.all(
          [baseList, nestedList, thirdLevelList].map((list) =>
            list.evaluate((element) => {
              const styles = getComputedStyle(element);
              const paragraph = element.querySelector('li > p');
              const paragraphStyles = paragraph ? getComputedStyle(paragraph) : null;
              return {
                padding: Number.parseFloat(styles.paddingInlineStart),
                left: element.getBoundingClientRect().left,
                marker: styles.listStyleType,
                lineHeight: Number.parseFloat(styles.lineHeight),
                paragraphMargin: paragraphStyles
                  ? Number.parseFloat(paragraphStyles.marginBlockStart) +
                    Number.parseFloat(paragraphStyles.marginBlockEnd)
                  : null,
              };
            }),
          ),
        );
        expect(listLayout.map((item) => item.marker)).toEqual(['disc', 'disc', 'disc']);
        expect(listLayout.every((item) => item.padding >= 20)).toBe(true);
        expect(listLayout[1]?.left).toBeGreaterThan(listLayout[0]?.left ?? 0);
        expect(listLayout[2]?.left).toBeGreaterThan(listLayout[1]?.left ?? 0);
        expect(listLayout.every((item) => item.lineHeight <= 28)).toBe(true);
        expect(listLayout.every((item) => item.paragraphMargin !== null)).toBe(true);
        await p.screenshot({ path: t.outputPath('docs-markdown-lists.png'), fullPage: true });
      },
    );
    test(
      'section hues update without reload and color page backgrounds and diagram strokes',
      XL_VIEWPORT_TEST,
      async ({ page: p }, t) => {
        await p.setViewportSize({ width: 1440, height: 1000 });
        await p.addInitScript(
          (fixture) => {
            Object.assign(window, { __docsLocalWorkspaceFixture: fixture });
          },
          {
            tree: [
              {
                type: 'branch',
                origName: 'programming',
                title: 'Programming',
                hue: 30,
                children: [
                  {
                    type: 'branch',
                    origName: 'programming-one',
                    title: 'Programming 1',
                    children: [
                      {
                        type: 'leaf',
                        origName: 'orange-page',
                        title: 'Orange page',
                        path: 'programming/orange-page/index.md',
                        url: '/docs/#orange-page',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'branch',
                origName: 'mathematics',
                title: 'Mathematics',
                hue: 150,
                children: [
                  {
                    type: 'branch',
                    origName: 'mathematics-one',
                    title: 'Mathematics 1',
                    children: [
                      {
                        type: 'leaf',
                        origName: 'green-page',
                        title: 'Green page',
                        path: 'mathematics/green-page/index.md',
                        url: '/docs/#green-page',
                      },
                    ],
                  },
                ],
              },
            ],
            pages: [
              {
                id: 'orange-page',
                path: 'content/programming/orange-page/index.md',
                pathname: '/docs/#orange-page',
                title: 'Orange page',
                markdown: [
                  'A [complementary link](#green-page) follows the section hue.',
                  '',
                  '<Nodes direction="TB" nodes={[{"id":"orange-node","type":"terminator","data":{"title":"Orange section node","href":"/#green-page"}},{"id":"primary-node","type":"process","data":{"title":"Primary section node","href":"/#green-page"}}]} edges={[]} height={240} />',
                  '',
                  ...Array.from(
                    { length: 36 },
                    (_, index) => `Long page background check ${index + 1}.`,
                  ),
                ].join('\n\n'),
              },
              {
                id: 'green-page',
                path: 'content/mathematics/green-page/index.md',
                pathname: '/docs/#green-page',
                title: 'Green page',
                markdown: 'This page belongs to the Mathematics hue.\n\n- One\n- Two',
              },
            ],
            pathname: '/docs/#orange-page',
            title: 'Hue fixture',
            hue: 145,
            rootPath: '/docs/',
            homePath: '/docs/#orange-page',
          },
        );
        let loadCount = 0;
        p.on('load', () => {
          loadCount += 1;
        });
        await p.goto('/strict-local-workspace-harness/');
        await waitForWorkspaceReady(p);
        const content = p.locator('[data-docs-view-root]');
        /**
         * Reads the page hue and canvas colors used to detect route/theme leakage.
         * @returns Theme values from the document root and body.
         */
        const hueOfPage = () =>
          p.evaluate(() => ({
            hue: document.documentElement.style.getPropertyValue('--hue'),
            rootBackground: getComputedStyle(document.documentElement).backgroundColor,
            bodyBackground: getComputedStyle(document.body).backgroundColor,
            primary: getComputedStyle(document.documentElement)
              .getPropertyValue('--primary-1')
              .trim(),
          }));
        await expect(content.getByText('Long page background check 1.')).toBeVisible();
        await expect.poll(async () => (await hueOfPage()).hue).toBe('30');
        const diagram = content.getByRole('img', { name: 'Document diagram' });
        await expect(diagram.locator('text')).toHaveText([
          'Orange section node',
          'Primary section node',
        ]);
        const orangeDiagramColor = await diagram.evaluate((svg) => ({
          color: getComputedStyle(svg).color,
          stroke: getComputedStyle(svg.querySelector('rect')!).stroke,
        }));
        expect(orangeDiagramColor.color).not.toBe('');
        expect(orangeDiagramColor.stroke).toBe(orangeDiagramColor.color);
        const beforeNavigation = await p.evaluate(
          () => performance.getEntriesByType('navigation').length,
        );
        await p.getByRole('combobox', { name: 'Section' }).click();
        await p.getByRole('option', { name: 'Mathematics' }).click();
        const greenPageLink = p.getByRole('link', { name: 'Green page', exact: true });
        await expect(greenPageLink).toBeVisible();
        await greenPageLink.click();
        await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Green page');
        await expect(content.getByText('This page belongs to the Mathematics hue.')).toBeVisible();
        await expect(content.getByText('Long page background check 1.')).toHaveCount(0);
        await expect.poll(async () => (await hueOfPage()).hue).toBe('150');
        expect(await p.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(
          beforeNavigation,
        );
        expect(loadCount).toBe(1);
        await p.emulateMedia({ colorScheme: 'dark' });
        const darkModeState = await p.evaluate(() => ({
          htmlClass: document.documentElement.className,
          scopeClass: document.querySelector('.docs-theme-scope')?.className ?? '',
          colorScheme: getComputedStyle(document.querySelector('.docs-theme-scope')!).colorScheme,
          media: matchMedia('(prefers-color-scheme: dark)').matches,
          primary: getComputedStyle(document.querySelector('.docs-theme-scope')!)
            .getPropertyValue('--primary-1')
            .trim(),
        }));
        expect(darkModeState.colorScheme, JSON.stringify(darkModeState)).toBe('dark');
        const darkPage = await hueOfPage();
        expect(darkPage.hue).toBe('150');
        expect(darkPage.rootBackground).toBe(darkPage.bodyBackground);
        expect(darkPage.rootBackground).not.toBe('rgb(255, 255, 255)');
        expect(darkPage.primary).not.toBe('');
        await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await p.screenshot({
          path: t.outputPath('docs-section-hue-dark-long-page.png'),
          fullPage: true,
        });
      },
    );
  });

  test.describe('shared shell and document navigation', () => {
    test(
      'shared workspace keeps the Terra header, toolbar position, section navigation, and nested leaf actions',
      DESKTOP_BREAKPOINT_TEST,
      async ({ page: p }, t) => {
        await p.setViewportSize({ width: 1440, height: 1000 });
        await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
        await waitForWorkspaceReady(p);
        await expect(p.getByRole('heading', { name: 'Start with the product' })).toBeVisible();
        await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
        await expect(p.getByRole('link', { name: 'Salesphere Docs' })).toBeVisible();
        await expect(p.getByRole('combobox', { name: 'Section' })).toBeVisible();
        await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
        await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
        await expect(p.getByText(/Last modified/)).toBeVisible();
        // The pinned UI has no persistent section action button; actions live in the selector.
        await expect(p.getByRole('button', { name: /Actions for section/ })).toHaveCount(0);
        await expect(p.getByRole('button', { name: 'Actions for group Start here' })).toHaveCount(
          0,
        );
        const toolbarPosition = await p.evaluate(() => {
          const header = document.querySelector('.docs-document-header');
          const toolbar = document.querySelector('[data-docs-toolbar-frame]');
          const mode = document.querySelector<HTMLElement>('[aria-label="Mode"]');
          const proseHeading = document.querySelector<HTMLElement>('[data-docs-view-root] h2');
          const workspace = document.querySelector<HTMLElement>('.docs-workspace');
          return {
            followsHeader:
              !!header &&
              !!toolbar &&
              Boolean(header.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING),
            toolbarWidth: toolbar?.getBoundingClientRect().width ?? 0,
            modeWidth: mode?.getBoundingClientRect().width ?? 0,
            fontFamily: workspace ? getComputedStyle(workspace).fontFamily : '',
            headingWidth: proseHeading?.getBoundingClientRect().width ?? 0,
            headingFontSize: proseHeading ? getComputedStyle(proseHeading).fontSize : '',
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
        await p.getByRole('combobox', { name: 'Section' }).click();
        await p.getByRole('option', { name: 'Configure' }).click();
        await expect(p.getByRole('link', { name: 'Local files' })).toBeVisible();
        await p.getByRole('combobox', { name: 'Section' }).click();
        await p.getByRole('option', { name: 'Overview' }).click();
        const leaf = p.getByRole('link', { name: 'Salesphere', exact: true });
        const startHereGroup = p
          .locator('[data-docs-drop^="branch:"]')
          .filter({ hasText: 'Start here' });
        await startHereGroup.hover();
        await expect(p.getByRole('button', { name: 'Actions for group Start here' })).toHaveCount(
          0,
        );
        await startHereGroup.click({ button: 'right' });
        for (const name of [
          'Copy link',
          'Add page',
          'Manage attachments',
          'Download group',
          'Rename group',
          'Delete group',
        ]) {
          await expect(p.getByRole('menuitem', { name })).toBeVisible();
        }
        await p.getByRole('menuitem', { name: 'Manage attachments' }).click();
        await expect(p.getByRole('dialog')).toContainText('Manage Attachments');
        await p.keyboard.press('Escape');
        await startHereGroup.click({ button: 'right' });
        await expect(p.getByRole('menuitem', { name: 'Add page' })).toBeVisible();
        await p.keyboard.press('Escape');
        await leaf.click({ button: 'right' });
        const contextMenu = p.getByRole('menu');
        await expect(contextMenu).toBeVisible();
        await expect
          .poll(() =>
            contextMenu.evaluate(
              (menu) =>
                menu.closest('[data-radix-popper-content-wrapper]')?.parentElement ===
                document.body,
            ),
          )
          .toBe(true);
        await expect(p.getByRole('menuitem', { name: 'Files' })).toBeVisible();
        await expect(p.getByRole('menuitem', { name: 'Rename page' })).toBeVisible();
        await expect(p.getByRole('menuitem', { name: 'Delete page' })).toBeVisible();
        await expect(p.getByRole('menuitem', { name: 'Duplicate page' })).toBeVisible();
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
          const current = Number(sessionStorage.getItem(key) ?? '0');
          sessionStorage.setItem(key, String(current + 1));
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
        await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
          'Leaf one',
        );
        const content = p.locator('[data-docs-view-root]');
        await expect(content).toContainText('Content from the first static leaf.');
        expect(loadCount).toBe(1);
        await p.getByRole('link', { name: 'Leaf two', exact: true }).click();
        await expect(p).toHaveURL(/\/static-leaf-swap\/two\/$/);
        await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
          'Leaf two',
        );
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
        await expect(p.getByRole('menuitem', { name: 'Delete page' })).toBeVisible();
        await p.getByRole('menuitem', { name: 'Delete page' }).click();
        await expect(p.getByRole('dialog')).toContainText('Delete page?');
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
        await p.getByRole('menuitem', { name: 'Add page', exact: true }).click();
        const createDialog = p.getByRole('dialog', { name: 'Add Page' });
        await createDialog
          .getByRole('textbox', { name: 'Page title' })
          .fill('Regression fixture page');
        await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
        const created = p.getByRole('link', { name: 'Regression fixture page', exact: true });
        await expect(created).toBeVisible();
        await created.click({ button: 'right' });
        await p.getByRole('menuitem', { name: 'Rename page', exact: true }).click();
        const renameDialog = p.getByRole('dialog', { name: 'Rename page' });
        await expect(renameDialog).toBeVisible();
        await renameDialog.getByRole('textbox').fill('Regression page renamed');
        await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(
          p.getByRole('link', { name: 'Regression page renamed', exact: true }),
        ).toBeVisible();
        const stored = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'),
        );
        expect(
          Object.values(stored.documents).map((item: { title: string }) => item.title),
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
        await p.getByRole('menuitem', { name: 'Duplicate page', exact: true }).hover();
        await p.getByRole('menuitem', { name: 'By content (Duplicate leaf)', exact: true }).click();
        const duplicateDialog = p.getByRole('dialog', { name: 'Duplicate by Content' });
        await expect(duplicateDialog).toBeVisible();
        await duplicateDialog
          .getByRole('textbox', { name: 'New page name' })
          .fill('Regression page copy');
        await duplicateDialog.getByRole('button', { name: 'Save', exact: true }).click();
        const duplicate = p.getByRole('link', { name: 'Regression page copy', exact: true });
        await expect(duplicate).toBeVisible();
        await duplicate.click({ button: 'right' });
        await p.getByRole('menuitem', { name: 'Download page', exact: true }).click();
        const exportDialog = p.getByRole('dialog');
        await expect(exportDialog).toBeVisible();
        const download = p.waitForEvent('download');
        await exportDialog.getByRole('button', { name: 'Download ZIP', exact: true }).click();
        expect((await download).suggestedFilename()).toMatch(/\.zip$/i);
        await duplicate.click({ button: 'right' });
        await p.getByRole('menuitem', { name: 'Delete page', exact: true }).click();
        await p
          .getByRole('dialog', { name: 'Delete page?' })
          .getByRole('button', { name: 'Delete', exact: true })
          .click();
        await expect(duplicate).toHaveCount(0);
        const storedBeforeReload = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'),
        );
        expect(
          Object.values(storedBeforeReload.documents).map((item: { title: string }) => item.title),
        ).not.toContain('Regression page copy');
        await p.reload({ waitUntil: 'commit' });
        await expect(p.getByRole('link', { name: 'Salesphere', exact: true })).toBeVisible();
        await expect(
          p.getByRole('link', { name: 'Regression page copy', exact: true }),
        ).toHaveCount(0);
      },
    );
    test(
      'group create, rename, and reorder use the shared sidebar actions',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        await p.setViewportSize({ width: 1440, height: 1000 });
        await p.goto('/workspace-demo/');
        await waitForWorkspaceReady(p);
        await p.getByRole('combobox', { name: 'Mode' }).click();
        await p.getByRole('option', { name: 'Edit' }).click();
        await p.getByRole('combobox', { name: 'Section' }).click();
        await p.getByRole('option', { name: 'Add section', exact: true }).click();
        const sectionDialog = p.getByRole('dialog', { name: 'Add Section' });
        await sectionDialog.getByRole('textbox', { name: 'Section name' }).fill('Group lifecycle');
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
        await p.reload();
        await waitForWorkspaceReady(p);
        await p.getByRole('combobox', { name: 'Section' }).click();
        await p.getByRole('option', { name: 'Group lifecycle', exact: true }).click();
        const sidebarContent = p
          .locator('[data-sidebar="content"]')
          .filter({ visible: true })
          .last();
        await expect(sidebarContent).toBeVisible();
        await sidebarContent.dispatchEvent('contextmenu', { button: 2, clientX: 16, clientY: 160 });
        const addGroup = p.getByRole('menuitem', { name: 'Add group', exact: true });
        await expect(addGroup).toBeVisible();
        await addGroup.click();
        const createDialog = p.getByRole('dialog', { name: 'Add Group' });
        await createDialog.getByRole('textbox', { name: 'Group name' }).fill('Regression group');
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
        await p.getByRole('menuitem', { name: 'Rename group', exact: true }).click();
        const renameDialog = p.getByRole('dialog', { name: 'Rename Group' });
        await renameDialog.getByRole('textbox', { name: 'Group name' }).fill('Regression renamed');
        await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
        const renamedGroup = p
          .locator(`[data-docs-drop^="branch:${sectionId}/"]`)
          .filter({ hasText: 'Regression renamed' });
        await expect(renamedGroup).toBeVisible();
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
        const sidebarContent = p
          .locator('[data-sidebar="content"]')
          .filter({ visible: true })
          .last();
        await expect(sidebarContent).toBeVisible();
        await sidebarContent.dispatchEvent('contextmenu', { button: 2, clientX: 16, clientY: 160 });
        await p.getByRole('menuitem', { name: 'Add group', exact: true }).click();
        const createDialog = p.getByRole('dialog', { name: 'Add Group' });
        await createDialog
          .getByRole('textbox', { name: 'Group name' })
          .fill('Regression deletion group');
        await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
        const group = p
          .locator(`[data-docs-drop^="branch:${sectionId}/"]`)
          .filter({ hasText: 'Regression deletion group' });
        await expect(group).toBeVisible();
        await group.click({ button: 'right' });
        await p.getByRole('menuitem', { name: 'Delete group', exact: true }).click();
        await p
          .getByRole('dialog', { name: /Delete group\?/i })
          .getByRole('button', { name: 'Delete', exact: true })
          .click();
        await expect(group).toHaveCount(0);
        const remainingGroups = await p.evaluate((id) => {
          return JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}').tree.find(
            (node: { origName?: string }) => node.origName === id,
          ).children;
        }, sectionId);
        expect(remainingGroups.map((node: { title?: string }) => node.title)).toEqual([
          'Start here',
        ]);
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
        await reorderHandle.dragTo(
          p.locator('[data-docs-drop]').filter({ hasText: 'Runtime map' }),
          {
            // A leaf row is only 24px tall in the shared sidebar. Drop near its bottom
            // so this specifically tests insertion after the target leaf.
            targetPosition: { x: 8, y: 23 },
          },
        );
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
        await p
          .getByRole('link', { name: 'Salesphere', exact: true })
          .click({ modifiers: ['Meta'] });
        await runtimeMap.click({ modifiers: ['Meta'] });
        await runtimeMap.click({ button: 'right' });
        const merge = p.getByRole('menuitem', { name: 'Merge 2 pages', exact: true });
        await expect(merge).toBeVisible();
        await merge.click();
        const prompt = p.getByRole('dialog', { name: 'Merge Pages' });
        await prompt.getByRole('textbox', { name: 'New page title' }).fill('Combined guide');
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
        const download = p.waitForEvent('download');
        await p.getByRole('button', { name: 'Download Asset', exact: true }).click();
        expect((await download).suggestedFilename()).toBe(filename);
        await p.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
        const attachmentCard = p.getByRole('button', {
          name: `Attachment ${filename}`,
          exact: true,
        });
        await attachmentCard.click({ button: 'right' });
        const attachmentMenu = p.locator('[data-docs-attachment-menu]');
        await expect(
          attachmentMenu.getByRole('menuitem', { name: 'Delete', exact: true }),
        ).toBeVisible();
        const menuBounds = await attachmentMenu.boundingBox();
        const viewport = p.viewportSize();
        expect(menuBounds).not.toBeNull();
        expect(viewport).not.toBeNull();
        expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
        expect(menuBounds!.y).toBeGreaterThanOrEqual(0);
        expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(viewport!.width);
        expect(menuBounds!.y + menuBounds!.height).toBeLessThanOrEqual(viewport!.height);
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
        const mode = p.getByRole('combobox', { name: 'Mode' });
        await mode.click();
        await p.getByRole('option', { name: 'Edit' }).click();
        const title = p.getByRole('textbox', { name: 'Title', exact: true });
        await title.fill('Salesphere saved title');
        await p.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(title).toHaveValue('Salesphere saved title');
        await p.reload();
        await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
          'Salesphere saved title',
        );
        await mode.click();
        await p.getByRole('option', { name: 'View' }).click();
        await p.getByRole('combobox', { name: 'Mode' }).click();
        await p.getByRole('option', { name: 'Edit' }).click();
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
        await p.reload();
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
        await p.getByRole('menuitem', { name: 'Delete page', exact: true }).click();
        await p
          .getByRole('dialog', { name: 'Delete page?' })
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

  test.describe('section management and host capability modes', () => {
    test(
      'section creation is retained, and menus remain keyboard accessible and portaled',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        await p.setViewportSize({ width: 1280, height: 900 });
        await p.goto('/workspace-demo/');
        await waitForWorkspaceReady(p);
        await p.getByRole('combobox', { name: 'Mode' }).click();
        await expect(p.getByRole('option', { name: 'Edit' })).toBeVisible();
        await p.keyboard.press('Escape');
        const section = p.getByRole('combobox', { name: 'Section' });
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
          contextMenu.getByRole('menuitem', { name: 'Rename page', exact: true }),
        ).toBeVisible();
        await expect
          .poll(() =>
            contextMenu.evaluate(
              (menu) =>
                menu.closest('[data-radix-popper-content-wrapper]')?.parentElement ===
                document.body,
            ),
          )
          .toBe(true);
        const renamePageAction = contextMenu.getByRole('menuitem', {
          name: 'Rename page',
          exact: true,
        });
        await renamePageAction.focus();
        await expect(renamePageAction).toBeFocused();
        await p.keyboard.press('Enter');
        await expect(p.getByRole('dialog', { name: 'Rename page' })).toBeVisible();
        await p.keyboard.press('Escape');
        await section.click();
        await p.getByRole('option', { name: 'Add section', exact: true }).click();
        const dialog = p.getByRole('dialog', { name: 'Add Section' });
        await dialog.getByRole('textbox', { name: 'Section name' }).fill('Created from browser');
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
        await expect(p.getByRole('combobox', { name: 'Section' })).toBeVisible();
        await p.getByRole('combobox', { name: 'Section' }).click();
        await expect(p.getByRole('option', { name: 'Created from browser' })).toBeVisible();
      },
    );
    test(
      'section rename, color, and deletion persist through the section actions',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        await p.goto('/workspace-demo/', { waitUntil: 'domcontentloaded' });
        await waitForWorkspaceReady(p);
        await p.getByRole('combobox', { name: 'Section' }).click();
        await p.getByRole('option', { name: 'Add section', exact: true }).click();
        const createDialog = p.getByRole('dialog', { name: 'Add Section' });
        await createDialog.getByRole('textbox', { name: 'Section name' }).fill('Section lifecycle');
        await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
        await p.reload({ waitUntil: 'domcontentloaded' });
        await waitForWorkspaceReady(p);
        const sectionControl = p.getByRole('combobox', { name: 'Section' });
        await sectionControl.click();
        await p.getByRole('option', { name: 'Section lifecycle', exact: true }).click();
        await sectionControl.click({ button: 'right' });
        await expect(p.getByRole('menu')).toBeVisible();
        await p.getByRole('menuitem', { name: 'Rename section', exact: true }).click();
        const renameDialog = p.getByRole('dialog', { name: 'Rename Section' });
        await renameDialog
          .getByRole('textbox', { name: 'Section name' })
          .fill('Section lifecycle renamed');
        await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
        await sectionControl.click({ button: 'right' });
        await p.getByRole('menuitem', { name: 'Change color', exact: true }).click();
        const colorDialog = p.getByRole('dialog', { name: 'Section Color' });
        const hue = colorDialog.getByRole('slider', { name: 'Hue' });
        const previousHue = Number(await hue.getAttribute('aria-valuenow'));
        await hue.focus();
        await p.keyboard.press(previousHue < 360 ? 'End' : 'Home');
        const hueValue = Number(await hue.getAttribute('aria-valuenow'));
        expect(hueValue).not.toBe(previousHue);
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
        await p.getByRole('menuitem', { name: 'Delete section', exact: true }).click();
        await p
          .getByRole('dialog', { name: /Delete section\?/i })
          .getByRole('button', { name: 'Delete', exact: true })
          .click();
        await expect(
          p.getByRole('option', { name: 'Section lifecycle renamed', exact: true }),
        ).toHaveCount(0);
        const stateAfterDelete = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('docs-workspace-demo-v1') ?? '{}'),
        );
        expect(
          stateAfterDelete.tree.some(
            (node: { title?: string }) => node.title === 'Section lifecycle renamed',
          ),
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
        await expect(
          insertMenu.getByRole('option', { name: 'Accordion', exact: true }),
        ).toHaveCount(0);
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
      'local read-only workspaces expose View and Attachments, with leaf files in the Attachments mode',
      XL_VIEWPORT_TEST,
      async ({ page: p }, t) => {
        await p.setViewportSize({ width: 390, height: 844 });
        await p.goto('/workspace-readonly/');
        await p.getByRole('combobox', { name: 'Mode' }).click();
        await expect(p.getByRole('option', { name: 'Edit' })).toHaveCount(0);
        await expect(p.getByRole('option', { name: 'Code', exact: true })).toHaveCount(0);
        await p.getByRole('option', { name: 'Attachments' }).click();
        await expect(p.locator('[data-docs-shell]')).toHaveAttribute(
          'data-docs-mode',
          'attachments',
        );
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
        const description = p.getByRole('textbox', { name: 'Description' });
        await expect(description).toBeDisabled();
        await expect(description).toHaveValue(
          'A page level description for the Salesphere overview.',
        );
        await expect(description).not.toHaveAttribute('class', /min-h-6/);
        await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
      },
    );
  });
});

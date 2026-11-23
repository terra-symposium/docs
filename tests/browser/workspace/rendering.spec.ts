/**
 * tests/browser/workspace/rendering.spec.ts
 */
/* Workspace rendering browser contracts. */

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

test.describe('read-only routes, Markdown, and responsive rendering', () => {
  test(
    'standalone Astro pages mount the extracted read-only workspace with their nested navigation',
    DESKTOP_BREAKPOINT_TEST,
    async ({ page: p }, t) => {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.goto('/');
      await expect(p.getByRole('link', { name: 'Docs', exact: true }).first()).toBeVisible();
      await expect(
        p.locator('[data-sidebar="sidebar"]').getByRole('link', { name: 'Get started' }),
      ).toBeVisible();
      await expect(p.getByRole('combobox', { name: 'Tree' })).toBeVisible();
      await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
      await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
      await expect(p.getByRole('heading', { name: '1. Prepare' })).toBeVisible();
      await p.screenshot({ path: t.outputPath('docs-static-desktop.png'), fullPage: true });
      const mobileHeader = p.locator('.workspace header.md\\:hidden');
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
      await p.evaluate(() => document.fonts.ready);
      await p.waitForLoadState('networkidle');
      const treeRef = p
        .locator('[data-sidebar="sidebar"]')
        .getByRole('link', { name: 'Tree', exact: true });
      await expect(treeRef).toBeVisible();
      await treeRef.click();
      await expect(p).toHaveURL(/\/consumer\/1-usage\/0-tree\//);
      await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Tree');
    },
  );
  test(
    'local workspace navigation keeps the active leaf, URL, and document aligned',
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
                  origName: 'first',
                  title: 'First guide',
                  path: 'content/first.md',
                  url: '/docs/first/',
                },
                {
                  type: 'leaf',
                  origName: 'second',
                  title: 'Second guide',
                  path: 'content/second.md',
                  url: '/docs/second/',
                },
              ],
            },
          ],
          pages: [
            {
              id: 'first',
              path: 'content/first.md',
              pathname: '/docs/first/',
              title: 'First guide',
              markdown: '## First body',
            },
            {
              id: 'second',
              path: 'content/second.md',
              pathname: '/docs/second/',
              title: 'Second guide',
              markdown: '## Second body',
            },
          ],
          pathname: '/docs/first/',
          title: 'Fixture Docs',
          rootPath: '/docs/',
        },
      );
      await p.goto('/strict-local-workspace-harness/');
      await waitForWorkspaceReady(p);
      const first = p.getByRole('link', { name: 'First guide', exact: true });
      const second = p.getByRole('link', { name: 'Second guide', exact: true });
      await expect(first.locator('..')).toHaveAttribute('data-active', 'true');
      await second.click();
      await expect(p).toHaveURL(/\/docs\/second\/$/);
      await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Second guide');
      await expect(second.locator('..')).toHaveAttribute('data-active', 'true');
      await expect(first.locator('..')).toHaveAttribute('data-active', 'false');
      await first.click();
      await expect(p).toHaveURL(/\/docs\/first\/$/);
      await expect(first.locator('..')).toHaveAttribute('data-active', 'true');
    },
  );
  test(
    'read-only Docs hides the tree selector when navigation has one tree',
    {
      tag: '@viewport:xl @viewport:md @viewport:mobile',
      annotation: {
        type: 'viewport-reason',
        description: 'Navigation with one tree should stay compact at every supported width.',
      },
    },
    async ({ page: p }) => {
      await p.goto('/workspace-readonly/');
      await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
      await expect
        .poll(() => p.evaluate(() => localStorage.getItem('docs-workspace-demo-v1')))
        .not.toBeNull();
      if ((p.viewportSize()?.width ?? 0) < 768)
        await p.getByRole('button', { name: 'Toggle Sidebar' }).click();
      const sectionSelect = p.getByRole('combobox', { name: 'Tree' });
      await expect(sectionSelect).toBeVisible();
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
       *
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
      const diagram = content.getByRole('application');
      await expect(diagram.getByRole('link', { name: 'Orange section node' })).toBeVisible();
      await expect(diagram.getByRole('link', { name: 'Primary section node' })).toBeVisible();
      const orangeDiagramColor = await diagram
        .locator('.react-flow__node')
        .first()
        .evaluate((node) => ({
          color: getComputedStyle(node).color,
          border: getComputedStyle(node).borderColor,
        }));
      expect(orangeDiagramColor.color).not.toBe('');
      expect(orangeDiagramColor.border).not.toBe('');
      // hygiene-ignore single-use -- Snapshot navigation count before following a route to prove client-side transition.
      const beforeNavigation = await p.evaluate(
        () => performance.getEntriesByType('navigation').length,
      );
      await p.getByRole('combobox', { name: 'Tree' }).click();
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
        scopeClass: document.querySelector('.theme-scope')?.className ?? '',
        colorScheme: getComputedStyle(document.querySelector('.theme-scope')!).colorScheme,
        media: matchMedia('(prefers-color-scheme: dark)').matches,
        primary: getComputedStyle(document.querySelector('.theme-scope')!)
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

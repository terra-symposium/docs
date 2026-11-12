/**
 * test/browser/components/terra/editor/docs/tabs.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';
import { openEditor } from '../../../../support/editor.js';

// TYPES
import type { Content } from '../../../../support/editor.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const XL_VIEWPORT_TEST = {
  tag: '@viewport:xl',
  annotation: {
    type: 'viewport-reason',
    description: 'Tab rendering and selection are checked in the desktop editor layout.',
  },
} as const;
/**
 * Creates one paragraph for a tab panel fixture.
 *
 * @param key Stable fixture key for the block and its child span.
 * @param text Paragraph text shown inside the tab panel.
 * @returns A Portable Text block in the shape consumed by the tabs renderer.
 */
const paragraph = (key: string, text: string) => ({
  _key: key,
  _type: 'block' as const,
  style: 'normal' as const,
  markDefs: [],
  children: [{ _key: `${key}-span`, _type: 'span' as const, marks: [], text }],
});
const tabsFixture = [
  {
    _key: 'tabs-under-test',
    _type: 'tabs',
    items: [
      {
        _key: 'first-tab',
        _type: 'item',
        title: 'First topic',
        content: [paragraph('first-content', 'First explanation')],
      },
      {
        _key: 'second-tab',
        _type: 'item',
        title: 'Second topic',
        content: [paragraph('second-content', 'Second explanation')],
      },
    ],
  },
] satisfies Content;
/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe('Docs editor tab contracts', () => {
  test.describe('tab migration and selection', () => {
    test(
      'legacy tab records migrate to Markdown in the editor',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        await openEditor(p, tabsFixture);
        await expect(p.locator('[data-block="tabs"]')).toHaveCount(0);
        const raw = p.locator('[data-docs-editor-block="Raw Markdown"]');
        await expect(raw).toBeVisible();
        await expect(raw).toContainText('|||[First topic]');
        await expect(raw).toContainText('First explanation');
      },
    );
    test(
      'legacy tab Markdown switches with the shared Styling control',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        await openEditor(p, tabsFixture, { readOnly: true });
        const secondTab = p.getByRole('tab', { name: 'Second topic' });
        const firstPanel = p.getByRole('tabpanel', { name: 'First topic' });
        await expect(p.getByRole('tab', { name: 'First topic' })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await expect(firstPanel.getByText('First explanation', { exact: true })).toBeVisible();
        await secondTab.click();
        await expect(secondTab).toHaveAttribute('aria-selected', 'true');
        await expect(
          p
            .getByRole('tabpanel', { name: 'Second topic' })
            .getByText('Second explanation', { exact: true }),
        ).toBeVisible();
        await expect(firstPanel.getByText('First explanation', { exact: true })).toBeHidden();
        await expect(p.getByRole('tablist')).toBeVisible();
      },
    );
  });

  test.describe('table content inside legacy tabs', () => {
    test(
      'tabs.spec: Render source-backed table cells inside read-only tabs',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        /**
         * Builds a read-only Sanity table cell fixture for a tab body.
         * @param key Stable cell key used by the editor fixture.
         * @param text Visible table-cell text.
         * @returns A cell containing one Portable Text block and span.
         */
        const cell = (key: string, text: string) => ({
          _key: key,
          _type: 'cell',
          content: [
            {
              _key: `${key}-block`,
              _type: 'block',
              children: [{ _key: `${key}-span`, _type: 'span', marks: [], text }],
              markDefs: [],
              style: 'normal',
            },
          ],
        });
        const content = [
          {
            _key: 'brand-tabs',
            _type: 'tabs',
            items: [
              {
                _key: 'overview',
                _type: 'item',
                title: 'Overview',
                content: [
                  {
                    _key: 'overview-table',
                    _type: 'table',
                    header: 'Overview values',
                    rows: [
                      {
                        _key: 'overview-header',
                        _type: 'row',
                        cells: [cell('aspect', 'Aspect'), cell('description', 'Description')],
                      },
                      {
                        _key: 'overview-voice',
                        _type: 'row',
                        cells: [
                          cell('voice', 'Voice'),
                          cell('voice-copy', 'Professional and evidence-based.'),
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                _key: 'principles',
                _type: 'item',
                title: 'Principles',
                content: [
                  {
                    _key: 'principles-table',
                    _type: 'table',
                    header: 'Principle values',
                    rows: [
                      {
                        _key: 'principles-header',
                        _type: 'row',
                        cells: [
                          cell('attribute', 'Attribute'),
                          cell('description-2', 'Description'),
                        ],
                      },
                      {
                        _key: 'principles-motto',
                        _type: 'row',
                        cells: [
                          cell('motto', 'Motto'),
                          cell('motto-copy', 'Engineering trust and confidence.'),
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ] satisfies Content;
        await openEditor(p, content, { readOnly: true });
        await expect(p.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await expect(p.getByRole('table').getByText('Voice', { exact: true })).toBeVisible();
        await expect(
          p.getByRole('table').getByText('Professional and evidence-based.', { exact: true }),
        ).toBeVisible();
        await p.getByRole('tab', { name: 'Principles' }).click();
        await expect(p.getByRole('table').getByText('Motto', { exact: true })).toBeVisible();
        await expect(
          p.getByRole('table').getByText('Engineering trust and confidence.', { exact: true }),
        ).toBeVisible();
        await expect(p.getByRole('tablist').last()).toBeVisible();
      },
    );
    test(
      'tabs.spec: Render Sanity block cells inside production-shaped nested tables',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        /**
         * Creates a keyed production Sanity cell for the nested table fixture.
         * @param key Stable cell key used to derive nested member keys.
         * @param text Text rendered inside the nested table.
         * @returns A production-shaped Sanity cell fixture.
         */
        const terraCell = (key: string, text: string) => ({
          _key: key,
          _type: 'cell',
          content: [
            {
              _key: `${key}-block`,
              _type: 'block',
              children: [{ _key: `${key}-span`, _type: 'span', marks: [], text }],
              markDefs: [],
              style: 'normal',
            },
          ],
        });
        const content = [
          {
            _key: 'salesphere-brand-tabs',
            _type: 'tabs',
            items: [
              {
                _key: 'brand-overview',
                _type: 'item',
                title: 'Overview',
                content: [
                  {
                    _key: 'brand-overview-table',
                    _type: 'table',
                    header: 'Table',
                    rows: [
                      {
                        _key: 'brand-heading-row',
                        _type: 'row',
                        cells: [
                          terraCell('brand-aspect', '🔍 Aspect'),
                          terraCell('brand-description', 'Description'),
                        ],
                      },
                      {
                        _key: 'brand-voice-row',
                        _type: 'row',
                        cells: [
                          terraCell('brand-voice', '🗣️ Voice'),
                          terraCell(
                            'brand-voice-description',
                            'Professional, authoritative, and evidence-based.',
                          ),
                        ],
                      },
                      {
                        _key: 'brand-culture-row',
                        _type: 'row',
                        cells: [
                          terraCell('brand-culture', '🏢 Culture'),
                          terraCell(
                            'brand-culture-description',
                            'Data-driven, ethical, and collaborative.',
                          ),
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ] satisfies Content;
        await openEditor(p, content, { readOnly: true });
        const cells = p
          .getByRole('tabpanel', { name: 'Overview' })
          .getByRole('table')
          .getByRole('cell');
        await expect(p.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await expect(cells.nth(0)).toContainText('🔍 Aspect');
        await expect(cells.nth(1)).toContainText('Description');
        await expect(cells.nth(2)).toContainText('🗣️ Voice');
        await expect(cells.nth(3)).toContainText(
          'Professional, authoritative, and evidence-based.',
        );
        await expect(cells.nth(5)).toContainText('Data-driven, ethical, and collaborative.');
      },
    );
    test(
      'tabs.spec: Render production legacy string children in table cells',
      XL_VIEWPORT_TEST,
      async ({ page: p }) => {
        /**
         * Creates a legacy cell with string-valued Portable Text children.
         * @param key Stable cell key used to derive the nested block key.
         * @param text Text stored in the legacy string child field.
         * @returns A table cell exercising legacy string normalization inside tabs.
         */
        const cell = (key: string, text: string) => ({
          _key: key,
          _type: 'cell',
          content: [
            { _key: `${key}-block`, _type: 'block', children: text, markDefs: [], style: 'normal' },
          ],
        });
        const content = [
          {
            _key: 'production-tabs',
            _type: 'tabs',
            items: [
              {
                _key: 'production-overview',
                _type: 'item',
                title: 'Overview',
                content: [
                  {
                    _key: 'production-brand-table',
                    _type: 'table',
                    header: 'Table',
                    rows: [
                      {
                        _key: 'production-header',
                        _type: 'row',
                        cells: [cell('aspect', '🔍 Aspect'), cell('description', 'Description')],
                      },
                      {
                        _key: 'production-voice',
                        _type: 'row',
                        cells: [
                          cell('voice', '🗣️ Voice'),
                          cell('voice-copy', 'Professional, authoritative, and evidence-based.'),
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ] satisfies Content;
        await openEditor(p, content, { readOnly: true });
        const cells = p
          .getByRole('tabpanel', { name: 'Overview' })
          .getByRole('table')
          .getByRole('cell');
        await expect(p.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await expect(cells.nth(0)).toHaveText('🔍 Aspect');
        await expect(cells.nth(1)).toHaveText('Description');
        await expect(cells.nth(2)).toHaveText('🗣️ Voice');
        await expect(cells.nth(3)).toHaveText('Professional, authoritative, and evidence-based.');
      },
    );
  });
});

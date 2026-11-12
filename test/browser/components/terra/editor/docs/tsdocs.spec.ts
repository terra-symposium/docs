/**
 * test/browser/components/terra/editor/docs/tsdocs.spec.ts
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
    description: 'Rich-block interactions use the standard desktop editor layout.',
  },
} as const;
/**
 * Wraps text in the document shape expected by the tsDocs fixture.
 *
 * @param text Content shown alongside generated documentation in the browser scenario.
 * @returns A one-paragraph Portable Text document.
 */
const paragraph = (text: string): Content => [
  {
    _key: `${text}-block`,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: `${text}-span`, _type: 'span', marks: [], text }],
  },
];
test('tsdocs.spec: Hide remote panel without a scope', XL_VIEWPORT_TEST, async ({ page: p }) => {
  await openEditor(p, [
    { _key: 'tsdocs-under-test', _type: 'tsDocs', scope: '' },
  ] satisfies Content);
  await expect(p.locator('[data-docs-block-skeleton]')).toHaveCount(0);
  await expect(p.getByTestId('editor-output')).toContainText('tsDocs');
});
test('tsdocs.spec: Render generated pages for a scope', XL_VIEWPORT_TEST, async ({ page: p }) => {
  await openEditor(
    p,
    [{ _key: 'tsdocs-under-test', _type: 'tsDocs', scope: 'lib/local' }] satisfies Content,
    {
      mockResponses: {
        'read.tsdocs': {
          data: {
            docs: [
              { slug: 'lib/local/alpha', title: 'Alpha helper', body: 'alpha source' },
              { slug: 'lib/local/beta', title: 'Beta helper', body: 'beta source' },
            ],
          },
        },
        'read.source.body': {
          dataByInput: {
            'alpha source': paragraph('Alpha returns a value.'),
            'beta source': paragraph('Beta returns nothing.'),
          },
        },
      },
    },
  );
  const contents = p.getByRole('navigation', { name: 'TSDocs contents' });
  await expect(contents.getByRole('link', { name: 'Alpha helper' })).toHaveAttribute(
    'href',
    '#lib-local-alpha',
  );
  await expect(contents.getByRole('link', { name: 'Beta helper' })).toHaveAttribute(
    'href',
    '#lib-local-beta',
  );
  await expect(p.locator('#lib-local-alpha')).toContainText('Alpha returns a value.');
  await expect(p.locator('#lib-local-beta')).toContainText('Beta returns nothing.');
});
test(
  'tsdocs.spec: Show an error when the scope cannot load',
  XL_VIEWPORT_TEST,
  async ({ page: p }) => {
    await openEditor(
      p,
      [{ _key: 'tsdocs-under-test', _type: 'tsDocs', scope: 'lib/local' }] satisfies Content,
      { mockResponses: { 'read.tsdocs': { data: { docs: null } } } },
    );
    await expect(p.getByText('TsDocs Error')).toBeVisible();
  },
);

/**
 * test/browser/components/terra/editor/docs/callout.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import {
  docsValueToMarkdown,
  markdownToDocsValue,
} from '../../../../../../dist/lib/lib/markdown-model.js';
import { expect, test } from '@playwright/test';
import { openEditor } from '../../../../support/editor.js';

// TYPES
import type { Content } from '../../../../support/editor.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const calloutFixture = [
  {
    _key: 'callout-under-test',
    _type: 'callout',
    kind: 'example',
    title: 'Original example',
    content: [
      {
        _key: 'callout-paragraph',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 'callout-text', _type: 'span', marks: [], text: 'Nested explanation' }],
      },
    ],
  },
] satisfies Content;
test('callout.spec: Render content and emit title edits', async ({ page: p }) => {
  await openEditor(p, calloutFixture);
  const callout = p.locator('[data-block="callout"]');
  await expect(callout).toHaveAttribute('data-docs-aside', 'example');
  await expect(callout).toContainText('Nested explanation');
  await callout.getByRole('textbox', { name: 'Callout title' }).fill('Updated example');
  await expect
    .poll(
      async () =>
        JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.title,
    )
    .toBe('Updated example');
  await expect(callout).toContainText('Nested explanation');
});
test('callout.spec: Emit nested content edits', async ({ page: p }) => {
  await openEditor(p, calloutFixture);
  await p
    .locator('[data-block="callout"]')
    .getByRole('textbox', { name: 'Document editor' })
    .click();
  await p.keyboard.press('End');
  await p.keyboard.type(' updated');
  await expect
    .poll(
      async () =>
        JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.content?.[0]
          ?.children?.[0]?.text,
    )
    .toBe('Nested explanation updated');
});
test('callout.spec: Imported directives retain rich body while edited content serializes', async ({
  page: p,
}) => {
  await openEditor(p, markdownToDocsValue(':::warning[Check this]\nReview **the source**.\n:::'));
  const callout = p.locator('[data-block="callout"]');
  await expect(callout).toContainText('Review the source.');
  await callout.getByRole('textbox', { name: 'Document editor' }).click();
  await p.keyboard.press('End');
  await p.keyboard.type(' updated');
  await expect
    .poll(async () =>
      JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]
        ?.content?.[0]?.children?.map((child: { text?: string }) => child.text ?? '')
        .join(''),
    )
    .toContain('Review the source. updated');
  const saved = JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]');
  expect(saved[0].markdown).toBe('');
  expect(docsValueToMarkdown(saved as never)).toContain(':::warning[Check this]');
  expect(docsValueToMarkdown(saved as never)).toContain('Review **the source**. updated');
});

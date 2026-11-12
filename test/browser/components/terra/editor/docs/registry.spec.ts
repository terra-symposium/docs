/**
 * test/browser/components/terra/editor/docs/registry.spec.ts
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
    description: 'The Docs insertion menu is checked in the desktop editor layout.',
  },
} as const;
const paragraph = [
  {
    _key: 'registry-paragraph',
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: 'registry-span', _type: 'span', marks: [], text: 'Start writing here.' }],
  },
] satisfies Content;
test(
  'default registry inserts code content and exposes every shared block',
  XL_VIEWPORT_TEST,
  async ({ page: p }) => {
    await openEditor(p, paragraph);
    await p.getByRole('button', { name: 'Insert content' }).click();
    const menu = p.getByRole('listbox');
    const blocks = menu.getByRole('group', { name: 'Block' });
    await expect(
      menu
        .getByRole('group', { name: 'Inline' })
        .getByRole('option', { name: 'Math', exact: true }),
    ).toBeVisible();
    for (const block of [
      'Math',
      'Code',
      'Receive value',
      'Nodes',
      'TypeScript docs',
      'Raw',
      'Table',
      'Callout',
      'Add attachment',
    ]) {
      await expect(blocks.getByRole('option', { name: block, exact: true })).toBeVisible();
    }
    for (const markdownOnly of ['Tabs', 'Accordion']) {
      await expect(blocks.getByRole('option', { name: markdownOnly, exact: true })).toHaveCount(0);
    }
    await blocks.getByRole('option', { name: 'Code', exact: true }).click();
    await expect(p.locator('[data-block="code"]')).toBeVisible();
    await expect
      .poll(async () => {
        return JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]').some(
          (block: { _type?: string }) => block._type === 'code',
        );
      })
      .toBe(true);
  },
);
test(
  'block opt-outs hide insertion controls, retain source, and keep attachment links available',
  XL_VIEWPORT_TEST,
  async ({ page: p }) => {
    const preservedCode = {
      _key: 'disabled-code',
      _type: 'code',
      language: 'json',
      value: '{"preserved":true}',
    };
    await openEditor(p, [preservedCode], {
      attachments: [{ name: 'Course notes.pdf', path: '/files/course-notes.pdf' }],
      blocks: { code: false, docImage: false, embed: false },
    });
    await expect(p.locator('[data-docs-unsupported-block="code"]')).toBeVisible();
    const displayedSource = await p
      .locator('[data-docs-unsupported-block="code"] pre')
      .textContent();
    expect(JSON.parse(displayedSource ?? 'null')).toEqual(preservedCode);
    const initialValue = JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]');
    expect(initialValue).toContainEqual(preservedCode);
    await p.getByRole('button', { name: 'Insert content' }).click();
    const menu = p.getByRole('listbox');
    const blocks = menu.getByRole('group', { name: 'Block' });
    for (const hidden of ['Code', 'Receive value'])
      await expect(blocks.getByRole('option', { name: hidden, exact: true })).toHaveCount(0);
    for (const hidden of ['Image', 'Embed'])
      await expect(menu.getByRole('option', { name: hidden, exact: true })).toHaveCount(0);
    await blocks.getByRole('option', { name: 'Add attachment', exact: true }).click();
    const dialog = p.getByRole('dialog', { name: 'Add attachment' });
    await expect(dialog.getByRole('button', { name: 'Visual embed', exact: true })).toHaveCount(0);
    await dialog.getByRole('combobox', { name: 'Document attachment' }).click();
    await p.getByRole('option', { name: 'Course notes.pdf', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Visual embed', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Insert text link', exact: true }).click();
    await expect
      .poll(async () => {
        const value = JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]');
        return JSON.stringify(value);
      })
      .toContain('Course notes.pdf');
    await expect(p.getByTestId('editor-output')).toContainText('/files/course-notes.pdf');
  },
);
test(
  'attachment picker enables visual embeds only for enabled block types',
  XL_VIEWPORT_TEST,
  async ({ page: p }) => {
    await openEditor(p, paragraph, {
      attachments: [
        { name: 'Course notes.pdf', path: '/files/course-notes.pdf' },
        { name: 'Class diagram.png', path: '/files/class-diagram.png' },
      ],
      blocks: { docImage: false },
    });
    await p.getByRole('button', { name: 'Insert content' }).click();
    await p
      .getByRole('listbox')
      .getByRole('group', { name: 'Block' })
      .getByRole('option', { name: 'Add attachment', exact: true })
      .click();
    const dialog = p.getByRole('dialog', { name: 'Add attachment' });
    await dialog.getByRole('combobox', { name: 'Document attachment' }).click();
    await p.getByRole('option', { name: 'Course notes.pdf', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Visual embed', exact: true })).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Document attachment' }).click();
    await p.getByRole('option', { name: 'Class diagram.png', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Visual embed', exact: true })).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: 'Insert text link', exact: true }),
    ).toBeVisible();
  },
);

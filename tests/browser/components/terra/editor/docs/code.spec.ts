/**
 * tests/browser/components/terra/editor/docs/code.spec.ts
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
const codeFixture = [
  { _key: 'code-under-test', _type: 'code', language: 'typescript', value: 'const answer = 1;' },
] satisfies Content;

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('code.spec: Render source and emit edits', XL_VIEWPORT_TEST, async ({ page: p }) => {
  const code = p.locator('[data-block="code"] .cm-content');
  await test.step('Inject Code and verify it renders', async () => {
    await openEditor(p, codeFixture);
    await expect(code).toContainText('const answer = 1;');
  });
  await test.step('Edit Code and verify onChange', async () => {
    await code.click();
    await p.keyboard.press('ControlOrMeta+A');
    await p.keyboard.type('const answer = 2;');
    await expect
      .poll(
        async () =>
          JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.value,
      )
      .toBe('const answer = 2;');
  });
});
test('code.spec: Change language and copy source', XL_VIEWPORT_TEST, async ({ page: p }) => {
  await openEditor(p, codeFixture);
  const code = p.locator('[data-block="code"]');
  await code.getByRole('combobox').click();
  await p.getByRole('option', { name: 'javascript' }).click();
  await expect
    .poll(
      async () =>
        JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.language,
    )
    .toBe('javascript');
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await code.getByRole('button', { name: 'Copy' }).click();
  await expect
    .poll(async () => p.evaluate(() => navigator.clipboard.readText()))
    .toBe('const answer = 1;');
});
test('code.spec: Preserve entered newlines', XL_VIEWPORT_TEST, async ({ page: p }) => {
  await openEditor(p, codeFixture);
  await p.locator('[data-block="code"] .cm-content').click();
  await p.keyboard.press('ControlOrMeta+End');
  await p.keyboard.press('Enter');
  await p.keyboard.type('const answer = 2;');
  await expect
    .poll(
      async () =>
        JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.value,
    )
    .toBe('const answer = 1;\nconst answer = 2;');
});
test(
  'code.spec: Preserve literal backslash-n in read-only source',
  XL_VIEWPORT_TEST,
  async ({ page: p }) => {
    await openEditor(
      p,
      [
        {
          _key: 'literal-newline',
          _type: 'code',
          language: 'cpp',
          value: 'std::cout << "Hello World\\n";\nstd::cout << "second line";',
        },
      ],
      { readOnly: true },
    );
    const lines = p.locator('[data-docs-code-block="view"] .cm-line');
    await expect(lines).toHaveCount(2);
    await expect(lines.nth(0)).toHaveText('std::cout << "Hello World\\n";');
    await expect(lines.nth(1)).toHaveText('std::cout << "second line";');
  },
);

test(
  'code.spec: Highlight received source with the shared header and copy control',
  XL_VIEWPORT_TEST,
  async ({ page: p }) => {
    await p.route('**/code-fixture.ts', (route) =>
      route.fulfill({ contentType: 'text/plain', body: 'const received = 42;' }),
    );
    await openEditor(
      p,
      [
        {
          _key: 'received-code',
          _type: 'code',
          language: 'typescript',
          value: '',
          source: '/code-fixture.ts',
        },
      ],
      { readOnly: true },
    );
    const code = p.locator('[data-docs-code-block="view"]');
    await expect(code.locator('.docs-code-block-header')).toContainText('typescript');
    await expect(code.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(code.locator('.cm-line')).toContainText('const received = 42;');
    await expect(code.locator('.cm-line span').first()).toBeVisible();
  },
);

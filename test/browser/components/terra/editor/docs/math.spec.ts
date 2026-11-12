/**
 * test/browser/components/terra/editor/docs/math.spec.ts
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

test('math.spec: Render block and emit formula edits', async ({ page: p }) => {
  const missingKatexFonts: string[] = [];
  p.on('response', (response) => {
    if (/\/fonts\/KaTeX_[^/]+\.(?:woff2?|ttf)$/u.test(new URL(response.url()).pathname)) {
      if (response.status() >= 400)
        missingKatexFonts.push(`${response.status()} ${response.url()}`);
    }
  });
  await openEditor(p, [
    { _key: 'math-under-test', _type: 'math', code: 'x^2', inline: false },
  ] satisfies Content);
  const math = p.locator('[data-docs-editor-block="math"]');
  await expect(math).toHaveAttribute('data-math-code', 'x^2');
  await expect(math.locator('.katex')).toBeVisible();
  await p.evaluate(() => document.fonts.ready);
  await expect.poll(() => p.evaluate(() => document.fonts.check('16px "KaTeX_Main"'))).toBe(true);
  expect(missingKatexFonts).toEqual([]);
  await p.locator('.docs-math-wrapper').evaluate((element) => {
    (
      element as HTMLElement & { __blockActions?: Array<{ onSelect?: () => void }> }
    ).__blockActions?.[0]?.onSelect?.();
  });
  const formula = p.getByPlaceholder("f'(x) = ...");
  await expect(formula).toBeFocused();
  await formula.fill('y^3');
  await p.getByRole('button', { name: 'Save Formula' }).click();
  await expect(formula).not.toBeVisible();
  await expect(math).toHaveAttribute('data-math-code', 'y^3');
  await expect
    .poll(
      async () => JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.code,
    )
    .toBe('y^3');
  await p.locator('.docs-math-wrapper').evaluate((element) => {
    (
      element as HTMLElement & { __blockActions?: Array<{ onSelect?: () => void }> }
    ).__blockActions?.[0]?.onSelect?.();
  });
  await expect(formula).toBeFocused();
  await expect(formula).toHaveValue('y^3');
  await formula.fill('z^4');
  await p.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(formula).not.toBeVisible();
  await expect(math).toHaveAttribute('data-math-code', 'y^3');
});
test('math.spec: Render inline within a paragraph', async ({ page: p }) => {
  const missingKatexFonts: string[] = [];
  p.on('response', (response) => {
    if (/\/fonts\/KaTeX_[^/]+\.(?:woff2?|ttf)$/u.test(new URL(response.url()).pathname)) {
      if (response.status() >= 400)
        missingKatexFonts.push(`${response.status()} ${response.url()}`);
    }
  });
  await openEditor(p, [
    {
      _key: 'inline-math-paragraph',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        { _key: 'before-math', _type: 'span', marks: [], text: 'Equation ' },
        { _key: 'inline-math', _type: 'math', code: 'x^2', inline: true },
        { _key: 'after-math', _type: 'span', marks: [], text: ' is useful.' },
      ],
    },
  ] satisfies Content);
  await expect(p.locator('[data-terra-inline="math"]').locator('.katex')).toBeVisible();
  await p.evaluate(() => document.fonts.ready);
  await expect.poll(() => p.evaluate(() => document.fonts.check('16px "KaTeX_Main"'))).toBe(true);
  expect(missingKatexFonts).toEqual([]);
  await expect(p.locator('[data-content-editor]')).toContainText('Equation');
  await expect(p.locator('[data-content-editor]')).toContainText('is useful.');
});

/**
 * test/styles.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';

// DATA
import { URL } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const root = fileURLToPath(new URL('../', import.meta.url));
test('the packed Docs stylesheet is a single deterministic Styling and Docs cascade', async () => {
  const style = await readFile(`${root}/dist/lib/style.css`, 'utf8');
  assert.doesNotMatch(style, /@import\s|@tailwind\s|@terra-symposium\/styling\/ui\.css/);
  assert.match(style, /\.flex\s*\{\s*display:\s*flex\s*\}/);
  assert.match(style, /\.md\\:hidden\s*\{\s*display:\s*none\s*\}/);
  assert.match(style, /\.max-w-3xl\s*\{/);
  assert.ok(style.includes('text-3xl'), 'rich text heading variant is present');
  assert.match(style, /\.font-docs\s*\{/);
  assert.match(style, /\.max-w-5xl\s*\{/);
  const hiddenUtility = style.indexOf('.hidden{display:none}');
  assert.ok(hiddenUtility >= 0, 'base hidden utility is present');
  assert.ok(
    style.indexOf('.md\\:block{display:block}') > hiddenUtility,
    'responsive sidebar variant follows base utility',
  );
  assert.match(style, /\.grain\s*\{/);
  assert.doesNotMatch(
    style,
    /@layer\s+(?:base|utilities)/,
    'packed CSS must survive consumer Tailwind passes',
  );
  const nestedSelectors = [];
  postcss.parse(style).walkRules((rule) => {
    if (/(^|[^\\])&/.test(rule.selector)) nestedSelectors.push(rule.selector);
  });
  assert.deepEqual(
    nestedSelectors,
    [],
    'Tailwind nesting must be flattened before browser delivery, as it was in the website build',
  );
});
test('math font URLs in the package stylesheet resolve inside its published files', async () => {
  assert.match(
    await readFile(`${root}/dist/lib/style.css`, 'utf8'),
    /fonts\/KaTeX_Main-Regular\.woff2/,
  );
  await stat(`${root}/dist/lib/fonts/KaTeX_Main-Regular.woff2`);
});

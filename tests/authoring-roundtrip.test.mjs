/**
 * tests/authoring-roundtrip.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import console from 'node:console';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { createElement } from 'react';
import { DocsMarkdown } from '../dist/lib/components/MarkdownContent.js';
import { docsValueToMarkdown, markdownToDocsValue, renderMarkdown } from '../dist/lib/lib/index.js';
import { replaceCanonicalComponents } from '../dist/lib/lib/markdown-model.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('all authored aside types retain their type and render', () => {
  for (const kind of ['note', 'tip', 'caution', 'danger', 'example', 'warning']) {
    const blocks = markdownToDocsValue(`:::${kind}[Title]\n\nBody **strong**.\n\n:::`);
    assert.equal(blocks[0]?.kind, kind);
    const exported = docsValueToMarkdown(blocks);
    assert.match(exported, new RegExp(`^:::${kind}\\[Title\\]`));
    const rendered = renderMarkdown(exported);
    assert.match(rendered, new RegExp(`class="callout ${kind}"`));
    assert.match(rendered, new RegExp(`data-docs-aside="${kind}"`));
  }
});
test('authored blocks parse and render through the shared package', () => {
  for (const [kind, src, marker] of [
    ['table', '| A | B |\n| --- | --- |\n| 1 | 2 |', '<table'],
    ['table', '<table><tr><th>A</th></tr><tr><td>1</td></tr></table>', '<table'],
    ['code', '```js\nconsole.log(1)\n```', 'data-docs-code-block="view"'],
    ['accordion', '===[Title]\nBody\n===', 'data-orientation="vertical"'],
    ['tabs', '|||[Tab]\nBody\n|||', 'role="tablist"'],
    [
      'nodes',
      '<Nodes nodes={`[{"id":"a","data":{"title":"A"}}]`} edges={`[]`} />',
      'data-docs-editor-block="Nodes"',
    ],
    ['embed', '<Embed src="https://example.com" title="Example" />', '<iframe'],
  ]) {
    const blocks = markdownToDocsValue(src);
    assert.equal(blocks[0]?._type, kind, src);
    assert.ok(renderMarkdown(src).includes(marker), src);
    assert.equal(markdownToDocsValue(docsValueToMarkdown(blocks))[0]?._type, kind, src);
  }
});
test('canonical component scanning converts supported source without touching code fences', () => {
  const output = replaceCanonicalComponents(
    '<Embed src="https://example.test" title="Example" />\n\n```md\n<Embed src="https://literal.test" />\n```',
    (block, raw) => (block?._type === 'embed' ? 'EMBED' : raw),
  );
  assert.match(output, /^EMBED/);
  assert.match(output, /```md\n<Embed src="https:\/\/literal\.test" \/>\n```/);
});
test('fenced authoring examples stay literal and do not leak parser placeholders', () => {
  const src = [
    '```md',
    '===[Further detail]',
    'Supporting explanation.',
    '===',
    '',
    '|||[Linux]',
    'Linux instructions.',
    '|||',
    '```',
  ].join('\n');
  const value = markdownToDocsValue(src);
  assert.equal(value.length, 1);
  assert.equal(value[0]?._type, 'code');
  assert.match(value[0].value, /===\[Further detail\]/);
  assert.match(value[0].value, /\|\|\|\[Linux\]/);
  assert.doesNotMatch(renderMarkdown(src), /DOCSBLOCK|DOCSFENCE/);
});
test('accordion bodies can contain fenced delimiter examples', () => {
  const value = markdownToDocsValue(
    ['===[Details]', '```md', '===', '```', 'More detail.', '==='].join('\n'),
  );
  assert.equal(value[0]?._type, 'accordion');
  assert.equal(value[0].items[0].content[0]?._type, 'code');
  assert.match(value[0].items[0].content[0].value, /===/);
});

test('Get started preview tabs parse as one complete group', async () => {
  const src = await readFile(
    new URL('../docs/consumer/0-configuration/0-install.md', import.meta.url),
    'utf8',
  );
  // hygiene-ignore single-use -- Keep the parsed tab groups distinct from the rendered HTML assertions below.
  const groups = markdownToDocsValue(src).filter((block) => block._type === 'tabs');
  assert.ok(
    groups.some(
      (group) => group.items.map((item) => item.title).join(',') === 'Preview,Build,Check',
    ),
  );
  const html = renderToStaticMarkup(createElement(DocsMarkdown, { markdown: src }));
  assert.match(html, /role="tab"[^>]*>Preview/);
  assert.match(html, /role="tab"[^>]*>Build/);
  assert.match(html, /role="tab"[^>]*>Check/);
  assert.doesNotMatch(html, /\|\|\|\[Check\]/);
});

test('unclosed tab markers report their source line', () => {
  const errs = [];
  // hygiene-ignore single-use -- Restore the captured logger in finally even when parsing throws.
  const orig = console.error;
  console.error = (...args) => errs.push(args);
  try {
    markdownToDocsValue('Intro\n\n|||[Build]\n\nBody\n\n|||[Check]\n\nMore\n\n|||');
  } finally {
    console.error = orig;
  }
  assert.equal(errs.length, 1);
  assert.match(errs[0][0], /Unclosed group marker/);
  assert.deepEqual(errs[0][1], { delimiter: '|||', title: 'Build', line: 3 });
});

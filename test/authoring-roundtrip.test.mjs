import assert from 'node:assert/strict';
import { test } from 'node:test';
import { docsValueToMarkdown, markdownToDocsValue, renderMarkdown } from '../dist/lib/lib/index.js';
import { replaceCanonicalComponents } from '../dist/lib/lib/markdown-model.js';

test('all authored aside types retain their type and render', () => {
  for (const kind of ['note', 'tip', 'caution', 'danger', 'example', 'warning']) {
    const source = `:::${kind}[Title]\n\nBody **strong**.\n\n:::`;
    const blocks = markdownToDocsValue(source);
    assert.equal(blocks[0]?.kind, kind);
    const exported = docsValueToMarkdown(blocks);
    assert.match(exported, new RegExp(`^:::${kind}\\[Title\\]`));
    assert.match(renderMarkdown(exported), new RegExp(`docs-callout-${kind}`));
  }
});

test('authored blocks parse and render through the shared package', () => {
  const examples = [
    ['table', '| A | B |\n| --- | --- |\n| 1 | 2 |', '<table'],
    ['table', '<table><tr><th>A</th></tr><tr><td>1</td></tr></table>', '<table'],
    ['code', '```js\nconsole.log(1)\n```', '<code'],
    ['accordion', '=== [Title]\nBody\n===', 'data-orientation="vertical"'],
    ['tabs', '||| [Tab]\nBody\n|||', 'role="tablist"'],
    ['nodes', '<Nodes nodes={`[{"id":"a","data":{"title":"A"}}]`} edges={`[]`} />', 'docs-diagram'],
    ['embed', '<Embed src="https://example.com" title="Example" />', '<iframe'],
  ];
  for (const [kind, source, marker] of examples) {
    const blocks = markdownToDocsValue(source);
    assert.equal(blocks[0]?._type, kind, source);
    assert.ok(renderMarkdown(source).includes(marker), source);
    assert.equal(markdownToDocsValue(docsValueToMarkdown(blocks))[0]?._type, kind, source);
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
  const source = [
    '```md',
    '=== [Further detail]',
    'Supporting explanation.',
    '===',
    '',
    '||| [Linux]',
    'Linux instructions.',
    '|||',
    '```',
  ].join('\n');
  const value = markdownToDocsValue(source);
  assert.equal(value.length, 1);
  assert.equal(value[0]?._type, 'code');
  assert.match(value[0].value, /=== \[Further detail\]/);
  assert.match(value[0].value, /\|\|\| \[Linux\]/);
  assert.doesNotMatch(renderMarkdown(source), /DOCSBLOCK|DOCSFENCE/);
});

test('accordion bodies can contain fenced delimiter examples', () => {
  const source = ['=== [Details]', '```md', '===', '```', 'More detail.', '==='].join('\n');
  const value = markdownToDocsValue(source);
  assert.equal(value[0]?._type, 'accordion');
  assert.equal(value[0].items[0].content[0]?._type, 'code');
  assert.match(value[0].items[0].content[0].value, /===/);
});

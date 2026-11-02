import assert from 'node:assert/strict';
import { test } from 'node:test';
import { docsValueToMarkdown, markdownToDocsValue, renderMarkdown } from '../dist/lib/lib/index.js';

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
    ['accordion', '=== [Title]\nBody\n===', 'docs-accordion'],
    ['tabs', '||| [Tab]\nBody\n|||', 'docs-tab'],
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

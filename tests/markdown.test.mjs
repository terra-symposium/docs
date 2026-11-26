/**
 * tests/markdown.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { renderMarkdown } from '../dist/lib/lib/markdown.js';
import { markdownToDocsValue } from '../dist/lib/lib/markdown-model.js';
import { markdownHeadingDepthIssues } from '../dist/lib/lib/index.js';
import { test } from 'node:test';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('renders Terra accordion and tab syntax without dropping rich content', () => {
  const html = renderMarkdown(
    '===[Details]\nA **bold** answer.\n===\n\n|||[First]\n```ts\nconst x = 1;\n```\n|||',
  );
  assert.match(html, /data-orientation="vertical"/);
  assert.match(html, /<button[^>]*>.*Details/s);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab"[^>]*>First<\/button>/);
  assert.doesNotMatch(html, /<details|docs-tabs|docs-accordions/);
  assert.match(html, /const x = 1/);
  assert.match(html, /role="tablist"/);
});
test('heading depth check ignores code and rejects headings deeper than H3', () => {
  assert.deepEqual(markdownHeadingDepthIssues('## Topic\n### Part\n#### Too deep'), [3]);
  assert.deepEqual(markdownHeadingDepthIssues('```md\n#### Example\n```\n## Topic'), []);
  assert.deepEqual(markdownHeadingDepthIssues('~~~\n##### Example\n~~~'), []);
});
test('renderer replaces Markdown that contains H4 headings with an error', () => {
  assert.match(renderMarkdown('## Topic\n#### Too deep'), /H2 and H3 headings only/);
  assert.doesNotMatch(renderMarkdown('## Topic\n#### Too deep'), /<h4/);
});
test('images keep alt text and omit visible captions', () => {
  const html = renderMarkdown('![Relevant detail](https://example.com/crop.png "Slide heading")');
  assert.match(html, /alt="Relevant detail"/);
  assert.doesNotMatch(html, /Slide heading|<figcaption/);
});
test('renders accordion callouts when Prettier joins the title and directive', () => {
  const html = renderMarkdown(
    '===[Worked example] :::tip[Example]\n\nTrace the **packet**.\n\n:::\n\n===',
  );
  assert.match(html, /class="docs-markdown-accordions"/);
  assert.match(html, /Worked example/);
  assert.match(html, /class="callout tip"/);
  assert.match(html, /Trace the <\/span><span><strong>packet<\/strong>/);
  assert.doesNotMatch(html, /===[Worked example]|:::tip/);
});
test('nested and malformed groups preserve canonical Markdown behavior', () => {
  const nested = renderMarkdown('|||[Outer]\n===[Inner]\nInner body\n===\n|||');
  assert.match(nested, /role="tablist"/);
  assert.match(nested, /Inner body/);
  const malformed = renderMarkdown('|||[Unclosed]\nBody');
  assert.match(malformed, /\|\|\|\[Unclosed\]/);
  assert.doesNotMatch(malformed, /role="tablist"/);
});
test('mismatched group closers leave the malformed source readable', () => {
  const html = renderMarkdown('|||[Unclosed]\nBody\n===\n\nAfter the malformed group.');
  assert.match(html, /\|\|\|\[Unclosed\]/);
  assert.match(html, /Body/);
  assert.match(html, /After the malformed group\./);
  assert.doesNotMatch(html, /role="tablist"|data-orientation="vertical"/);
});
test('legacy spaced group delimiters remain readable', () => {
  const html = renderMarkdown('=== [Older syntax]\nBody\n===');
  assert.match(html, /data-orientation="vertical"/);
  assert.match(html, /Older syntax/);
  assert.match(html, /Body/);
});
test('adjacent tab items render as one shared tab group', () => {
  const html = renderMarkdown('|||[One]\nFirst\n|||\n\n|||[Two]\nSecond\n|||');
  assert.equal((html.match(/role="tablist"/g) ?? []).length, 1);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
});
test('renders CommonMark thematic breaks as horizontal rules', () => {
  const html = renderMarkdown('Before the rule.\n\n---\n\nAfter the rule.');
  assert.match(html, /<hr data-docs-raw-divider="true"\s*\/?\s*>/);
  assert.doesNotMatch(html, /<pre>---<\/pre>/);
});
test('renders a labelled code block and image inside an HTML table cell', () => {
  const html = renderMarkdown(
    '<table><tr><th>Code</th><th>UI</th></tr><tr>' +
      '<td><pre data-language="md">Energy is &#36;E = mc^2&#36;.&#10;&#36;&#36;&#10;\\frac{a^2}{b_n}&#10;&#36;&#36;</pre></td>' +
      '<td><p><strong>Step 1:</strong> Choose Math.</p><img src="/example.png" alt="Math menu" /></td>' +
      '</tr></table>',
  );
  assert.match(html, /code-block/);
  assert.match(html, />md</);
  assert.match(html, /Energy is \$E = mc\^2\$\./);
  assert.match(html, /\\frac\{a\^2\}\{b_n\}/);
  assert.match(html, /Step 1:/);
  assert.match(html, /alt="Math menu"/);
  assert.doesNotMatch(html, /DOCSMATH/);
});
test('sanitizes script markup and dangerous links', () => {
  const html = renderMarkdown('===[<script>bad()</script>Safe]\n[bad](javascript:alert(1))\n===');
  assert.doesNotMatch(html, /<script|<a[^>]+javascript:/i);
  assert.match(html, /Safe/);
});
test('renders Docs callout directives as shared rich blocks', () => {
  const html = renderMarkdown(':::warning[Check this]\nReview **the source**.\n:::');
  assert.match(html, /class="callout warning"/);
  assert.match(html, /data-docs-aside="warning"><strong class="title">Check this<\/strong>/);
  assert.match(html, /Review <\/span><span><strong>the source<\/strong>/);
  assert.doesNotMatch(
    renderMarkdown(':::warning[Check this]\nBody.\n:::', { callout: false }),
    /class="callout/,
  );
});
test('renders Nodes as a default Markdown block without a page import', () => {
  const markdown = [
    ':::example[Flow]',
    '',
    'The diagram connects the input to its result.',
    '',
    '<Nodes direction="LR"',
    'nodes={[{"id":"input","type":"origin","data":{"title":"Input"}},{"id":"result","type":"terminator","data":{"title":"Result"}}]}',
    'edges={[{"id":"input-result","source":"input","target":"result"}]}',
    '/>',
    '',
    ':::',
  ].join('\n');
  const value = markdownToDocsValue(markdown);
  const callout = value.find((block) => block._type === 'callout');
  assert.ok(callout);
  const nodes = callout.content.find((block) => block._type === 'nodes');
  assert.ok(nodes);
  assert.equal(nodes.nodes[0].data.title, 'Input');
  assert.equal(nodes.nodes[1].data.title, 'Result');

  const html = renderMarkdown(markdown);
  assert.match(html, /class="callout example"/);
  assert.match(html, /data-docs-editor-block="Nodes"/);
  assert.doesNotMatch(html, /&lt;Nodes|data-docs-code-block="view"/);
});

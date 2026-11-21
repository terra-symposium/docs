/**
 * tests/markdown.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { renderMarkdown } from '../dist/lib/lib/markdown.js';
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
  assert.match(html, /docs-code-block/);
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
  assert.match(html, /docs-callout docs-callout-warning/);
  assert.match(html, /data-docs-aside="warning"><strong class="aside-title">Check this<\/strong>/);
  assert.match(html, /Review <\/span><span><strong>the source<\/strong>/);
  assert.doesNotMatch(
    renderMarkdown(':::warning[Check this]\nBody.\n:::', { callout: false }),
    /docs-callout/,
  );
});

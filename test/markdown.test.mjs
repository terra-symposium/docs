import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown } from '../dist/lib/lib/markdown.js';

test('renders Terra accordion and tab syntax without dropping rich content', () => {
  const source =
    '===[Details]\nA **bold** answer.\n===\n\n|||[First]\n```ts\nconst x = 1;\n```\n|||';
  const html = renderMarkdown(source);
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

test('sanitizes script markup and dangerous links', () => {
  const html = renderMarkdown('===[<script>bad()</script>Safe]\n[bad](javascript:alert(1))\n===');
  assert.doesNotMatch(html, /<script|<a[^>]+javascript:/i);
  assert.match(html, /Safe/);
});

test('renders Docs callout directives as shared rich blocks', () => {
  const html = renderMarkdown(':::warning[Check this]\nReview **the source**.\n:::');
  assert.match(html, /docs-callout docs-callout-warning/);
  assert.match(html, /<strong>Check this<\/strong>/);
  assert.match(html, /Review <\/span><span><strong>the source<\/strong>/);
  assert.doesNotMatch(
    renderMarkdown(':::warning[Check this]\nBody.\n:::', { callout: false }),
    /docs-callout/,
  );
});

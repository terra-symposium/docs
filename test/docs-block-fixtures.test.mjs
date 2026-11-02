import assert from 'node:assert/strict';
import test from 'node:test';
import { docsValueToMarkdown, markdownToDocsValue } from '../dist/lib/lib/markdown-model.js';
import { renderMarkdown } from '../dist/lib/lib/markdown.js';
import { DOCS_BLOCK_TEST_CASES } from './fixtures/docs-block-cases.mjs';

test('data-driven block examples parse and render through the Docs package', () => {
  for (const { name, source, types } of DOCS_BLOCK_TEST_CASES) {
    const value = markdownToDocsValue(source);
    assert.deepEqual(
      value.map((block) => block._type),
      types,
      name,
    );
    const markdown = docsValueToMarkdown(value);
    assert.ok(markdown.trim(), `${name} should serialize to Docs Markdown`);
    assert.doesNotThrow(() => renderMarkdown(markdown), name);
  }
});

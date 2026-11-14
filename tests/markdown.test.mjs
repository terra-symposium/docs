/**
 * test/markdown.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { renderMarkdown } from '../dist/lib/lib/markdown.js';
import { test } from 'node:test';
test('renders Terra accordion and tab syntax without dropping rich content', () => {
	const html = renderMarkdown('===[Details]\nA **bold** answer.\n===\n\n|||[First]\n```ts\nconst x = 1;\n```\n|||');
	assert.match(html, /<details class="terra-docs-accordion"><summary>Details<\/summary>/);
	assert.match(html, /<strong>bold<\/strong>/);
	assert.match(html, /<details class="terra-docs-tab"><summary>First<\/summary>/);
	assert.match(html, /const x = 1/);
});
test('sanitizes script markup and dangerous links', () => {
	const html = renderMarkdown('===[<script>bad()</script>Safe]\n[bad](javascript:alert(1))\n===');
	assert.doesNotMatch(html, /<script|javascript:/i);
	assert.match(html, /Safe/);
});

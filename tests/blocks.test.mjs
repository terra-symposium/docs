/**
 * test/blocks.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';
import { docsValueToMarkdown, markdownToDocsValue } from '../dist/lib/lib/markdown-model.js';
import { enabledDocsBlocks } from '../dist/lib/components/blocks.js';
import { renderMarkdown } from '../dist/lib/lib/markdown.js';

// DATA
import { DOCS_BLOCK_TYPES } from '../dist/lib/components/blocks.js';
test('all reusable rich blocks are enabled by default and can be opted out individually', () => {
	assert.equal(DOCS_BLOCK_TYPES.length, 11);
	assert.equal(enabledDocsBlocks().length, 11);
	assert.equal(enabledDocsBlocks({ embed: false }).includes('embed'), false);
	assert.equal(enabledDocsBlocks({ code: false }).includes('math'), true);
});
test('authoring skill names every registered block and the separate inline math option', () => {
	const documented = readFileSync(new URL('../.agents/skills/docs-authoring/SKILL.md', import.meta.url), 'utf8').match(
		/Its supported types are\s+([\s\S]*?)\. `inlineMath` is a separate option\./,
	)?.[1];
	assert.ok(documented, 'skill has a supported block list');
	assert.deepEqual(
		[...documented.matchAll(/`([^`]+)`/g)].map(match => match[1]),
		[...DOCS_BLOCK_TYPES],
	);
});
test('Markdown keeps existing accordion syntax and unsupported source across conversion', () => {
	const result = docsValueToMarkdown(markdownToDocsValue('## Heading\n\n=== [Item]\nOriginal **content**\n===\n\n<custom-widget value="1"></custom-widget>\n'));
	assert.match(result, /=== \[Item\]\nOriginal \*\*content\*\*\n===/);
	assert.match(result, /<custom-widget value="1"><\/custom-widget>/);
});
test('structured block containers round-trip without losing source fields', () => {
	for (const type of DOCS_BLOCK_TYPES.filter(item => item !== 'accordion' && item !== 'tabs')) {
		const block = { _type: type, _key: 'stable', value: 'example', extra: { nested: true } };
		const restored = markdownToDocsValue(`:::terra-docs ${type}\n${JSON.stringify(block)}\n:::\n`);
		assert.equal(restored.length, 1, type);
		assert.equal(restored[0]._type, type);
		assert.deepEqual(restored[0].extra, block.extra);
		assert.equal(markdownToDocsValue(docsValueToMarkdown(restored))[0].extra.nested, true);
	}
});
test('structured tabs, table, and nodes survive conversion and render as content', () => {
	const cell = text => ({ _type: 'cell', content: [{ _type: 'block', children: [{ _type: 'span', text }] }] });
	const blocks = [
		{
			_type: 'tabs',
			items: [
				{ title: 'pnpm', markdown: 'pnpm install' },
				{ title: 'npm', markdown: 'npm install' },
			],
		},
		{ _type: 'table', rows: [{ cells: [cell('Tool'), cell('Command')] }, { cells: [cell('Quality'), cell('pnpm quality')] }] },
		{
			_type: 'nodes',
			nodes: [
				{ id: 'a', type: 'origin', position: { x: 0, y: 0 }, data: { title: 'Source' } },
				{ id: 'b', type: 'terminal', position: { x: 300, y: 0 }, data: { title: 'Review' } },
			],
			edges: [{ id: 'a-b', source: 'a', target: 'b' }],
			direction: 'LR',
		},
	];
	for (const block of blocks) {
		const source = `:::terra-docs ${block._type}\n${JSON.stringify(block)}\n:::\n`;
		const restored = markdownToDocsValue(source);
		assert.equal(restored[0]._type, block._type);
		const roundTrip = markdownToDocsValue(docsValueToMarkdown(restored))[0];
		assert.equal(roundTrip._type, block._type);
		if (block._type === 'tabs')
			assert.deepEqual(
				roundTrip.items.map(item => item.title),
				['pnpm', 'npm'],
			);
		const html = renderMarkdown(source);
		assert.doesNotMatch(html, /:::terra-docs/);
		if (block._type === 'nodes') {
			assert.equal(roundTrip.nodes[0].data.title, 'Source');
			assert.deepEqual(roundTrip.nodes[1].position, { x: 300, y: 0 });
			assert.deepEqual(roundTrip.edges[0], { id: 'a-b', source: 'a', target: 'b' });
			assert.match(html, /react-flow/);
			// React Flow mounts node labels in the browser; server output is only its shell.
		} else {
			assert.match(html, block._type === 'tabs' ? /pnpm/ : /Quality/);
			if (block._type === 'table') assert.equal(roundTrip.rows[1].cells[0].content[0].children[0].text, 'Quality');
		}
	}
});
test('rich Markdown rendering escapes unsafe content and supports block opt-out', () => {
	const source = ':::terra-docs callout\n{"_type":"callout","title":"Safe","content":"Hello"}\n:::';
	assert.match(renderMarkdown(source), /data-docs-aside="note"/);
	assert.doesNotMatch(renderMarkdown(source, { callout: false }), /data-docs-aside=/);
	assert.doesNotMatch(renderMarkdown(':::terra-docs docImage\n{"_type":"docImage","url":"javascript:alert(1)","alt":"bad"}\n:::'), /src="javascript:/);
});
test('inline math survives visual conversion and renders as math', () => {
	const source = 'An equation $x^2 + 1$ in text.\n';
	const value = markdownToDocsValue(source);
	assert.equal(
		value[0].children.some(child => child._type === 'math'),
		true,
	);
	assert.match(docsValueToMarkdown(value), /\$x\^2 \+ 1\$/);
	assert.match(renderMarkdown(source), /katex/);
	assert.doesNotMatch(renderMarkdown(source, { inlineMath: false }), /katex/);
});
test('Markdown links become visual link annotations and keep their targets', () => {
	const value = markdownToDocsValue('Read [the guide](/product/purpose/) and **[the map](/product/structure/)**.\n');
	assert.equal(value[0].markDefs.length, 2);
	assert.equal(
		value[0].children.some(child => child.text?.includes('](')),
		false,
	);
	assert.match(docsValueToMarkdown(value), /\[the guide\]\(\/product\/purpose\/\)/);
	assert.match(docsValueToMarkdown(value), /\*\*\[the map\]\(\/product\/structure\/\)\*\*/);
});

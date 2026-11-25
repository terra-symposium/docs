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
import { defaultDocsBlock } from '../dist/lib/components/blocks.js';
import { parseDocsQuiz } from '../dist/lib/components/quiz.js';

// DATA
import { DOCS_BLOCK_TYPES } from '../dist/lib/components/blocks.js';
test('all reusable rich blocks are enabled by default and can be opted out individually', () => {
	assert.equal(DOCS_BLOCK_TYPES.length, 12);
	assert.equal(enabledDocsBlocks().length, 12);
	assert.equal(enabledDocsBlocks({ embed: false }).includes('embed'), false);
	assert.equal(enabledDocsBlocks({ code: false }).includes('math'), true);
});
test('quiz blocks have a portable default and validate generated question data', () => {
	assert.deepEqual(defaultDocsBlock('quiz'), { _type: 'quiz' });
	assert.deepEqual(parseDocsQuiz({ title: 'Docs quiz', questions: [{ type: 'multipleChoice', prompt: 'Which?', opts: ['A', 'B'], answer: 'B' }] }), {
		title: 'Docs quiz',
		questions: [{ type: 'multipleChoice', prompt: 'Which?', opts: ['A', 'B'], answer: 'B' }],
	});
	assert.throws(() => parseDocsQuiz({ title: '', questions: [] }), /title and between one and twenty/);
});
test('authoring documentation names every registered block and the separate inline math option', () => {
	const documented = readFileSync(new URL('../docs/1-authoring/authoring.md', import.meta.url), 'utf8').match(/Its supported types are\s+([\s\S]*?)\. `inlineMath` is a separate option\./)?.[1];
	assert.ok(documented, 'documentation has a supported block list');
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
test('fenced Docs directives remain literal and accordion bodies preserve fenced examples', () => {
	const standalone = markdownToDocsValue('```md\n=== [Further detail]\nSupporting explanation.\n===\n:::terra-docs table\n{}\n:::\n```');
	assert.equal(standalone.length, 1);
	assert.equal(standalone[0]._type, 'code');
	assert.match(standalone[0].value, /=== \[Further detail\]/);
	assert.match(standalone[0].value, /:::terra-docs table/);
	assert.doesNotMatch(docsValueToMarkdown(standalone), /TERRAFENCE|TERRADOCSBLOCK/);

	const nested = markdownToDocsValue('=== [Details]\n```md\n===\n```\nMore detail.\n===');
	assert.equal(nested[0]._type, 'accordion');
	assert.match(nested[0].items[0].markdown, /```md\n===\n```/);
	assert.match(docsValueToMarkdown(nested), /```md\n===\n```/);
});
test('local documentation renders quoted emphasis and pipe tables as Docs blocks', () => {
	const value = markdownToDocsValue('> Code explains *how* it works.\n\n| Material | Guidance |\n| --- | --- |\n| Engineering | Explain intent |\n');
	// hygiene-ignore single-use -- Keep the matched block stable for the two independent assertions below.
	const quote = value.find(block => block._type === 'block' && block.style === 'blockquote');
	const table = value.find(block => block._type === 'table');
	assert.ok(quote?.children?.some(child => child.text === 'how' && child.marks?.includes('em')));
	assert.equal(table?.rows?.[0]?.cells?.[0]?.content?.[0]?.children?.[0]?.text, 'Material');
	assert.equal(table?.rows?.[1]?.cells?.[1]?.content?.[0]?.children?.[0]?.text, 'Explain intent');
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
		const src = `:::terra-docs ${block._type}\n${JSON.stringify(block)}\n:::\n`;
		const restored = markdownToDocsValue(src);
		assert.equal(restored[0]._type, block._type);
		const roundTrip = markdownToDocsValue(docsValueToMarkdown(restored))[0];
		assert.equal(roundTrip._type, block._type);
		if (block._type === 'tabs')
			assert.deepEqual(
				roundTrip.items.map(item => item.title),
				['pnpm', 'npm'],
			);
		const html = renderMarkdown(src);
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
	const src = ':::terra-docs callout\n{"_type":"callout","title":"Safe","content":"Hello"}\n:::';
	assert.match(renderMarkdown(src), /data-docs-aside="note"/);
	assert.doesNotMatch(renderMarkdown(src, { callout: false }), /data-docs-aside=/);
	assert.doesNotMatch(renderMarkdown(':::terra-docs docImage\n{"_type":"docImage","url":"javascript:alert(1)","alt":"bad"}\n:::'), /src="javascript:/);
});
test('inline math survives visual conversion and renders as math', () => {
	const src = 'An equation $x^2 + 1$ in text.\n';
	const value = markdownToDocsValue(src);
	assert.equal(
		value[0].children.some(child => child._type === 'math'),
		true,
	);
	assert.match(docsValueToMarkdown(value), /\$x\^2 \+ 1\$/);
	assert.match(renderMarkdown(src), /katex/);
	assert.doesNotMatch(renderMarkdown(src, { inlineMath: false }), /katex/);
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

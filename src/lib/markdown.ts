/**
 * src/lib/markdown.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import sanitizeHtml from 'sanitize-html';
import { createElement } from 'react';
import { enabledDocsBlocks } from '../components/blocks.js';
import { renderToStaticMarkup } from 'react-dom/server';

// COMPONENTS
import { DocsRichBlock } from '../components/blocks.js';
import { Marked } from 'marked';

// TYPES
import type { DocsBlockOptions, RichBlock } from '../components/blocks.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders Markdown and registered Docs blocks into sanitized HTML.
 *
 * @param markdown Markdown or MDX source to render.
 * @param options Block enablement rules for embedded Docs syntax.
 *
 * @return Sanitized HTML string for the rendered document.
 */
export function renderMarkdown(markdown: string, options: DocsBlockOptions = {}): string {
	const rendered: string[] = [];
	const placeholder = (html: string) => {
		rendered.push(html);
		return `TERRADOCSRICHPLACEHOLDER${rendered.length - 1}END`;
	};
	let rich = markdown.replace(/^:::terra-docs ([A-Za-z]+)\s*\n([\s\S]*?)^:::\s*$/gm, (s, t: string, j: string) => {
		try {
			const data = JSON.parse(j) as RichBlock;
			if (!enabledDocsBlocks(options).includes(t as never) || data._type !== t) return placeholder(`<pre>${sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} })}</pre>`);
			return placeholder(renderToStaticMarkup(createElement(DocsRichBlock, { block: data })));
		} catch {
			return placeholder(`<pre>${sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} })}</pre>`);
		}
	});
	rich = rich.replace(/^\$\$\s*\n([\s\S]*?)^\$\$\s*$/gm, (_source, c: string) =>
		options.math === false ? _source : placeholder(renderToStaticMarkup(createElement(DocsRichBlock, { block: { _type: 'math', code: c } }))),
	);
	const parser = new Marked({ gfm: true });
	if (options.inlineMath !== false && options.math !== false)
		parser.use({
			extensions: [
				{
					name: 'terraInlineMath',
					level: 'inline',
					start: s => s.indexOf('$'),
					tokenizer(source) {
						const match = /^\$([^$\n]+)\$/.exec(source);
						return match ? { type: 'terraInlineMath', raw: match[0], text: match[1] } : undefined;
					},
					renderer(token) {
						return placeholder(
							renderToStaticMarkup(
								createElement(DocsRichBlock, {
									block: { _type: 'math', code: token.text, inline: true },
								}),
							),
						);
					},
				},
			],
		});
	let blockNumber = 0;
	rich = rich.replace(/^(===|\|\|\|)\s*\[([^\]\n]+)\]\s*\n([\s\S]*?)^\1\s*$/gm, (_match, d: string, t: string, b: string) => {
		const summary = sanitizeHtml(t, { allowedTags: [], allowedAttributes: {} });
		const content = parser.parse(b, { async: false });
		if (d === '===') return `<details class="terra-docs-accordion"><summary>${summary}</summary>${content}</details>`;
		blockNumber += 1;
		return `<details class="terra-docs-tab" data-tab="${blockNumber}"><summary>${summary}</summary>${content}</details>`;
	});
	return sanitizeHtml(parser.parse(rich, { async: false }), {
		...sanitizeHtml.defaults,
		allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary', 'input', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			a: ['href', 'name', 'target', 'rel', 'id'],
			img: ['src', 'alt', 'title', 'width', 'height'],
			input: ['type', 'checked', 'disabled'],
			'*': ['id', 'class', 'aria-label'],
		},
		allowedSchemes: ['http', 'https', 'mailto'],
	}).replace(/TERRADOCSRICHPLACEHOLDER(\d+)END/g, (_match, i: string) => rendered[Number(i)] ?? '');
}

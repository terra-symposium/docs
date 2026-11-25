/**
 * src/lib/markdown-model.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { enabledDocsBlocks } from '../components/blocks.js';
import { marked } from 'marked';

// TYPES
import type { DocsBlockOptions, RichBlock } from '../components/blocks.js';
import type { DocsValue } from '../components/Docs.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const key = () => crypto.randomUUID();
/** Minimal marked token shape used while converting Markdown into Docs blocks. */
type Token = {
	type: string;
	raw: string;
	text?: string;
	depth?: number;
	lang?: string;
	tokens?: Token[];
	[name: string]: unknown;
};

/** Replaces fenced Markdown while applying line-based Docs directives. */
function shieldCodeFences(src: string) {
	const ranges: { start: number; end: number }[] = [];
	let open: { start: number; character: string; length: number } | undefined;
	let index = 0;
	while (index < src.length) {
		const lineEnd = src.indexOf('\n', index);
		const end = lineEnd === -1 ? src.length : lineEnd + 1;
		const line = src.slice(index, lineEnd === -1 ? end : lineEnd).replace(/\r$/, '');
		const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
		if (open) {
			const closing = line.match(/^ {0,3}(`+|~+)[ \t]*$/);
			if (closing?.[1]?.[0] === open.character && closing[1].length >= open.length) {
				ranges.push({ start: open.start, end });
				open = undefined;
			}
		} else if (marker && !(marker[1]?.startsWith('`') && marker[2]?.includes('`'))) {
			open = { start: index, character: marker[1]![0]!, length: marker[1]!.length };
		}
		index = end;
	}
	if (open) ranges.push({ start: open.start, end: src.length });
	let cursor = 0;
	let shielded = '';
	ranges.forEach(({ start, end }, fenceIndex) => {
		shielded += `${src.slice(cursor, start)}TERRAFENCE${fenceIndex}PLACEHOLDER`;
		cursor = end;
	});
	return {
		source: shielded + src.slice(cursor),
		restore: (value: string) =>
			value.replace(/TERRAFENCE(\d+)PLACEHOLDER/g, (match, number: string) => {
				const range = ranges[Number(number)];
				return range ? src.slice(range.start, range.end) : match;
			}),
	};
}

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param text
 * @param marks
 *
 * @return
 */
function span(text: string, marks: string[] = []) {
	return { _type: 'span', _key: key(), text, marks };
}

/**
 *
 * @param tokens
 * @param markDefs
 *
 * @return
 */
function inline(tokens: Token[] | undefined, markDefs: { _type: 'link'; _key: string; href: string }[]): (ReturnType<typeof span> | { _type: 'math'; _key: string; code: string; inline: true })[] {
	if (!tokens) return [];
	return tokens.flatMap(t => {
		if (t.type === 'strong') return inline(t.tokens, markDefs).map(item => (item._type === 'span' ? { ...item, marks: [...item.marks, 'strong'] } : item));
		if (t.type === 'em') return inline(t.tokens, markDefs).map(item => (item._type === 'span' ? { ...item, marks: [...item.marks, 'em'] } : item));
		if (t.type === 'del') return inline(t.tokens, markDefs).map(item => (item._type === 'span' ? { ...item, marks: [...item.marks, 'strike-through'] } : item));
		if (t.type === 'link') {
			const href = typeof t.href === 'string' ? t.href : '';
			if (!href || !/^(?:https?:\/\/|mailto:|\/|\.\.?\/|#)/i.test(href)) return [span(t.raw)];
			const mark = key();
			markDefs.push({ _type: 'link', _key: mark, href });
			return inline(t.tokens, markDefs).map(item => (item._type === 'span' ? { ...item, marks: [...item.marks, mark] } : item));
		}
		if (t.type === 'text' || t.type === 'escape')
			return (t.text ?? t.raw)
				.split(/(\$[^$\n]+\$)/g)
				.filter(Boolean)
				.map(piece => (/^\$[^$\n]+\$$/.test(piece) ? { _type: 'math', _key: key(), code: piece.slice(1, -1), inline: true } : span(piece)));
		if (t.type === 'codespan') return [span(t.text ?? t.raw, ['code'])];
		return [span(t.raw)];
	});
}

/**
 *
 * @param style
 * @param tokens
 * @param fallback
 *
 * @return
 */
function textBlock(style: string, tokens: Token[] | undefined, fallback: string) {
	const markDefs: { _type: 'link'; _key: string; href: string }[] = [];
	const children = inline(tokens, markDefs);
	return {
		_type: 'block',
		_key: key(),
		style,
		markDefs,
		children: children.length ? children : [span(fallback)],
	};
}

/**
 * Decode Markdown without dropping unsupported syntax; opaque tokens become raw blocks.
 *
 * @param markdown Markdown or MDX source to parse.
 * @param options Block enablement rules for custom Docs syntax.
 *
 * @return Docs Portable Text values representing supported and preserved source.
 */
export function markdownToDocsValue(markdown: string, options: DocsBlockOptions = {}): DocsValue {
	const blocks: RichBlock[] = [];
	const blockFences = shieldCodeFences(markdown);
	let src = blockFences.source.replace(/^:::terra-docs ([A-Za-z]+)\s*\n([\s\S]*?)^:::\s*$/gm, (s, t: string, j: string) => {
		try {
			const data = JSON.parse(j) as RichBlock;
			if (data._type === t && enabledDocsBlocks(options).includes(t as never)) {
				blocks.push({ ...data, _key: data._key ?? key() });
				return `\n\nTERRADOCSBLOCK${blocks.length - 1}PLACEHOLDER\n\n`;
			}
		} catch {
			/* Preserve malformed source. */
		}
		blocks.push({ _type: 'raw', _key: key(), markdown: s });
		return `\n\nTERRADOCSBLOCK${blocks.length - 1}PLACEHOLDER\n\n`;
	});
	src = src.replace(/^<Quiz\s*\/>\s*$/gm, match => {
		if (!enabledDocsBlocks(options).includes('quiz')) return match;
		blocks.push({ _type: 'quiz', _key: key() });
		return `\n\nTERRADOCSBLOCK${blocks.length - 1}PLACEHOLDER\n\n`;
	});
	src = blockFences.restore(src);
	const accordionFences = shieldCodeFences(src);
	src = accordionFences.restore(
		accordionFences.source.replace(/^(===|\|\|\|)\s*\[([^\]\n]+)\]\s*\n([\s\S]*?)^\1\s*$/gm, (_match, d: string, t: string, b: string) => {
			blocks.push({
				_type: d === '===' ? 'accordion' : 'tabs',
				_key: key(),
				items: [{ title: t, markdown: accordionFences.restore(b), content: [] }],
				markdown: accordionFences.restore(_match),
			});
			return `\n\nTERRADOCSBLOCK${blocks.length - 1}PLACEHOLDER\n\n`;
		}),
	);
	const parsed = marked.lexer(src, { gfm: true }) as Token[];
	const result: RichBlock[] = [];
	for (const token of parsed) {
		if (token.type === 'space') continue;
		const marker = token.raw.trim().match(/^TERRADOCSBLOCK(\d+)PLACEHOLDER$/);
		if (marker) {
			const block = blocks[Number(marker[1])];
			if (block) result.push(block);
			continue;
		}
		if (token.type === 'heading') {
			result.push(textBlock(`h${Math.min(6, Math.max(2, token.depth ?? 2))}`, token.tokens, token.text ?? ''));
			continue;
		}
		if (token.type === 'paragraph' && !/\n\s*\n/.test(token.raw)) {
			result.push(textBlock('normal', token.tokens, token.text ?? ''));
			continue;
		}
		if (token.type === 'blockquote') {
			const paragraphs = (token.tokens ?? []).filter(part => part.type === 'paragraph');
			for (const paragraph of paragraphs) result.push(textBlock('blockquote', paragraph.tokens, paragraph.text ?? ''));
			if (!paragraphs.length) result.push(textBlock('blockquote', marked.Lexer.lexInline(token.text ?? '') as Token[], token.text ?? ''));
			continue;
		}
		if (token.type === 'table' && enabledDocsBlocks(options).includes('table')) {
			const cells = (values: unknown) =>
				(Array.isArray(values) ? values : []).map(value => {
					const entry = value as { text?: string; tokens?: Token[] };
					return { _type: 'cell', _key: key(), content: [textBlock('normal', entry.tokens, entry.text ?? '')] };
				});
			result.push({
				_type: 'table',
				_key: key(),
				rows: [token.header, ...(Array.isArray(token.rows) ? token.rows : [])].map(row => ({ _type: 'row', _key: key(), cells: cells(row) })),
				markdown: token.raw,
			});
			continue;
		}
		if (token.type === 'code') {
			result.push({
				_type: 'code',
				_key: key(),
				language: token.lang ?? '',
				value: token.text ?? '',
			});
			continue;
		}
		result.push({ _type: 'raw', _key: key(), markdown: token.raw });
	}
	return result as DocsValue;
}

/**
 * Serialize supported visual blocks and keep every opaque raw token verbatim.
 *
 * @param value Docs Portable Text values to serialize.
 *
 * @return Markdown source that preserves supported formatting and raw blocks.
 */
export function docsValueToMarkdown(value: DocsValue): string {
	return (
		value
			.map(b => {
				const item = b as RichBlock;
				const extra = Object.keys(item).some(name => !['_type', '_key', 'markdown', 'language', 'source', 'value', 'items', 'code', 'inline'].includes(name));
				if (item._type === 'block') {
					const markDefs = new Map(
						(Array.isArray(item.markDefs) ? item.markDefs : [])
							.filter((mark): mark is { _key: string; _type: string; href: string } => typeof mark === 'object' && mark !== null && '_key' in mark && 'href' in mark)
							.map(mark => [mark._key, mark.href]),
					);
					const content = (
						Array.isArray(item.children)
							? (item.children as {
									_type?: string;
									text?: string;
									marks?: string[];
									code?: string;
								}[])
							: []
					)
						.map(child => {
							if (child._type === 'math') return `$${child.code ?? ''}$`;
							let text = child.text ?? '';
							for (const mark of child.marks ?? []) {
								if (mark === 'strong') text = `**${text}**`;
								if (mark === 'em') text = `*${text}*`;
								if (mark === 'strike-through') text = `~~${text}~~`;
								if (mark === 'code') text = `\`${text}\``;
								if (markDefs.has(mark)) text = `[${text}](${markDefs.get(mark)})`;
							}
							return text;
						})
						.join('');
					const style = String(item.style ?? 'normal');
					if (/^h[2-6]$/.test(style)) return `${'#'.repeat(Number(style[1]))} ${content}`;
					if (style === 'blockquote') return `> ${content}`;
					return content;
				}
				if (item._type === 'raw' && !extra) return String(item.markdown ?? '');
				if (item._type === 'code' && !extra) return `\`\`\`${String(item.language ?? '')}\n${String(item.value ?? '')}\n\`\`\``;
				if (item._type === 'accordion' || item._type === 'tabs') {
					// The delimiter syntax represents one item per block. Keep grouped
					// alternatives together in their structured form during a round trip.
					if (Array.isArray(item.items) && item.items.length > 1) return `:::terra-docs ${item._type}\n${JSON.stringify(item)}\n:::`;
					if (item.markdown) return item.markdown;
					const delimiter = item._type === 'accordion' ? '===' : '|||';
					return (Array.isArray(item.items) ? (item.items as { title?: string; markdown?: string }[]) : [])
						.map(entry => `${delimiter}[${entry.title ?? 'Item'}]\n${entry.markdown ?? ''}\n${delimiter}`)
						.join('\n\n');
				}
				return `:::terra-docs ${item._type}\n${JSON.stringify(item)}\n:::`;
			})
			.join('\n\n')
			.replace(/\n{3,}/g, '\n\n')
			.trimEnd() + '\n'
	);
}

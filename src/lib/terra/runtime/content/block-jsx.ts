/**
 * src/lib/terra/runtime/content/block-jsx.ts
 * Converts supported Docs block markers to and from JSX wrappers.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { toCodeJsx } from './markdown.js';

// COMPONENTS
import * as TerraQualityRegex from '../../regex.mjs';

/*//////////////////////////////////////////////////
BLOCK SYNTAX
//////////////////////////////////////////////////*/

/**
 * Registry of the custom accordion and tabs block syntaxes used in docs content.
 *
 * @remarks
 * The registry is intentionally tiny so the parser can stay predictable.
 */
const BLOCKS = [
	{ id: 'accordion', syntax: '===', root: 'AccordionGroup', item: 'AccordionItem', label: 'Accordion' },
	{ id: 'tabs', syntax: '|||', root: 'TabsGroup', item: 'TabsItem', label: 'Tabs' },
] as const;

/**
 * Restores the custom docs JSX wrappers back to the markdown block syntax they came from.
 *
 * @param jsx - Canonical JSX source to restore.
 *
 * @return Markdown where supported docs JSX wrappers have been converted back to block syntax.
 *
 * @remarks
 * This is the inverse of `toBlockJsx` for the supported docs block shapes.
 */
export function fromBlockJsx(jsx: string): string {
	if (!jsx) return '';
	const code = new Map<string, string>();
	let _rs = toCodeJsx(jsx)
		.replace(/<Code\b[\s\S]*?<\/Code>/g, m => {
			const key = `TERRA_CODE_${code.size}`;
			code.set(key, m);
			return key;
		})
		.replace(/^\\?=\\?=\\?=/gm, '===')
		.replace(/^\\?\|\\?\|\\?\|/gm, '|||')
		.replace(/^\\?:\\?:\\?:/gm, ':::')
		.replace(/^(===|\|\|\||\^\^\^|:::)[ \t]*\\?\[(.*?)\\?\]/gm, (_m, p, c) => `${p}[${c.replace(/\\\]/g, ']').replace(/\\\[/g, '[')}]`);
	_rs = _rs
		.replace(TerraQualityRegex.REGEX_XA0_U2002_U2003_U200B_G_REGEX(), ' ')
		.replace(/<DocsMath\b([\s\S]*?)code=(?:\{\s*("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`)\s*\}|(["'])([\s\S]*?)\3)([\s\S]*?)\/>/gi, (_m, p, e, _quote, s, v) => {
			// prettier-ignore
			const parsed = e
					? e.startsWith('`')
						? e.slice(1, -1).replace(TerraQualityRegex.REGEX_G_REGEX_15(), '`').replace(TerraQualityRegex.REGEX_G_REGEX_14(), '$').replace(TerraQualityRegex.REGEX_G_REGEX_13(), '\\')
						: e.startsWith('"') ? JSON.parse(e.replace(TerraQualityRegex.REGEX_N_G_REGEX_3(), '\\n')) : e.slice(1, -1).replace(/\\([`'"])/g, '$1')
					: s;
			return TerraQualityRegex.REGEX_BINLINE_B_I_REGEX().test(p) || TerraQualityRegex.REGEX_BINLINE_B_I_REGEX().test(v) ? `$${parsed}$` : `\n\n$$${parsed}$$\n\n`;
		})
		.replace(TerraQualityRegex.REGEX_S_S_N_G_REGEX(), _m => _m.replace(/\\\{/g, '{').replace(/\\\}/g, '}').replace(/\\</g, '<').replace(/\\>/g, '>'));
	_rs = _rs.replace(/(<\/?(?:AccordionGroup|TabsGroup|AccordionItem|TabsItem)\b[^>]*>)/g, '\n$1\n').replace(TerraQualityRegex.REGEX_N_3_G_REGEX(), '\n\n');
	if (code.size) _rs = _rs.replace(TerraQualityRegex.REGEX_TERRA_CODE_D_G_REGEX(), k => code.get(k) || k);
	const lns = _rs.split('\n');
	const out: string[] = [];
	let icode = false;
	let pad = '';
	for (let i = 0; i < lns.length; i++) {
		const raw = lns[i] || '';
		const t = raw.trimStart();
		if (t.startsWith('```')) {
			icode = !icode;
			if (icode) pad = raw.match(/^[ \t]*/)?.[0] || '';
			out.push(t);
			continue;
		}
		if (icode) {
			out.push(raw.startsWith(pad) ? raw.slice(pad.length) : t);
			continue;
		}
		if (BLOCKS.find(b => t === `<${b.root}>`)) {
			out.push('');
			continue;
		}
		if (BLOCKS.find(b => t === `</${b.root}>`)) {
			out.push('');
			continue;
		}
		if (
			BLOCKS.find(b => {
				const match = t.match(new RegExp(`^<${b.item}\\b[^>]*title="([^"]*)"[^>]*>$`));
				if (!match) return false;
				out.push(`\n\n${b.syntax}[${match[1] || 'Section'}]\n\n`);
				return true;
			})
		)
			continue;
		const itemClose = BLOCKS.find(b => t === `</${b.item}>`);
		if (itemClose) {
			out.push(`\n\n${itemClose.syntax}\n\n`);
			continue;
		}
		if (t.length === 0) {
			out.push('');
			continue;
		}
		if (/^(===|\|\|\||\^\^\^|:::)/.test(t)) {
			out.push(t);
			continue;
		}
		out.push(raw.replace(/^[ \t]{1,8}/, ''));
	}
	return /* prettier-ignore */ out.join('\n').replace(TerraQualityRegex.REGEX_N_3_G_REGEX(), '\n\n').trim() + '\n';
}

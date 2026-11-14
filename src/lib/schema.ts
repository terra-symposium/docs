/**
 * src/lib/schema.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { defineSchema } from '@portabletext/editor';
import { enabledDocsBlocks } from '../components/blocks.js';

// DATA
import { DOCS_BLOCK_FIELDS } from '../components/blocks.js';

// TYPES
import type { DocsBlockOptions } from '../components/blocks.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// terra-quality-ignore single-use -- Keep the exported schema module value available to external consumers; its one local reference does not replace that contract.
export const schema = createDocsSchema();

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Builds the Portable Text schema shared by the editor and formatting toolbar.
 *
 * @param options Flags selecting optional inline math and Docs block types.
 *
 * @return Schema definition accepted by the Portable Text editor.
 */
export function createDocsSchema(options: DocsBlockOptions = {}) {
	return defineSchema({
		styles: [
			{ name: 'normal', title: 'Normal' },
			{ name: 'h2', title: 'Heading 2' },
			{ name: 'h3', title: 'Heading 3' },
			{ name: 'h4', title: 'Heading 4' },
			{ name: 'h5', title: 'Heading 5' },
			{ name: 'h6', title: 'Heading 6' },
			{ name: 'blockquote', title: 'Quote' },
		],
		decorators: [
			{ name: 'strong', title: 'Bold' },
			{ name: 'em', title: 'Italic' },
			{ name: 'underline', title: 'Underline' },
			{ name: 'strike-through', title: 'Strikethrough' },
			{ name: 'code', title: 'Code' },
		],
		annotations: [{ name: 'link', fields: [{ name: 'href', type: 'string' }] }],
		lists: [],
		inlineObjects:
			options.inlineMath === false
				? []
				: [
						{
							name: 'math',
							fields: [
								{ name: 'code', type: 'string' },
								{ name: 'inline', type: 'boolean' },
							],
						},
					],
		blockObjects: enabledDocsBlocks(options).map(n => ({ name: n, fields: DOCS_BLOCK_FIELDS[n] })),
	});
}

/**
 * Accepts web and email links, including relative links, without executable URL schemes.
 *
 * @param value Candidate link value supplied by a Docs document.
 *
 * @return The original link when its protocol is allowed; otherwise `undefined`.
 */
export function safeLink(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value.trim()) return undefined;
	try {
		return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(value, 'https://docs.invalid').protocol) ? value : undefined;
	} catch {
		return undefined;
	}
}

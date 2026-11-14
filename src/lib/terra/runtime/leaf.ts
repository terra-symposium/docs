/**
 * src/lib/terra/runtime/leaf.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { stringifyDocBody } from './content/document-markdown.js';

// TYPES
import type { DocBody } from './types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * Narrows unknown document content to a Portable Text block array.
 *
 * @param value Candidate content from a host document.
 *
 * @return Portable Text body, or an empty array when content is not an array.
 */
export const toPortableBody = (value: unknown): DocBody => (Array.isArray(value) ? (value as DocBody) : []);
// terra-quality-ignore single-use -- Keep body narrowing at this documented boundary before source serialization selects main or content fields.
/**
 * Resolves the current leaf's body from either a direct body or a content object.
 *
 * @param value Current leaf content in host or local form.
 *
 * @return Portable Text body, or an empty array when no body is available.
 */
const currLeafBody = (value: unknown): DocBody => {
	if (Array.isArray(value)) return toPortableBody(value);
	if (value && typeof value === 'object') {
		const item = value as { main?: unknown; content?: unknown };
		return toPortableBody(Array.isArray(item.main) ? item.main : item.content);
	}
	return [];
};
/**
 * Resolves source text for a leaf, serializing structured content when needed.
 *
 * @param value Current leaf source or structured body.
 *
 * @return Markdown source for the leaf.
 */
export const currLeafSrc = (value: unknown): string => (typeof value === 'string' ? value : stringifyDocBody(currLeafBody(value)));

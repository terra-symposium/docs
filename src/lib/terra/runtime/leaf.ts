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
 * Narrows a host value to the ordered block array used by the editor.
 *
 * @param value Parsed content, which may already be a block array or another host shape.
 *
 * @return The original array when present, otherwise an empty document body.
 */
export const toPortableBody = (value: unknown): DocBody =>
  Array.isArray(value) ? (value as DocBody) : [];
/**
 * Produces the editable source for a leaf from Markdown or serialized block content.
 *
 * @param value Current leaf content from the host.
 *
 * @return Original Markdown text or a Markdown serialization of its Portable Text body.
 */
export const currLeafSrc = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : stringifyDocBody(
        toPortableBody(
          value && typeof value === 'object'
            ? Array.isArray((value as { main?: unknown }).main)
              ? (value as { main?: unknown }).main
              : (value as { content?: unknown }).content
            : value,
        ),
      );

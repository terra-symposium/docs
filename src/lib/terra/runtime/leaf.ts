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
 * Accepts Portable Text arrays and maps malformed or absent bodies to an empty document.
 * @param value Value read from the host's leaf content field.
 * @returns Portable Text body, or an empty array for non-array input.
 */
export const toPortableBody = (value: unknown): DocBody =>
  Array.isArray(value) ? (value as DocBody) : [];
/**
 * Reads a leaf's Markdown source or serializes its `main`/`content` Portable Text body.
 * @param value Leaf source or record containing a Portable Text body.
 * @returns Existing Markdown or serialized Portable Text.
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

import { stringifyDocBody } from './content/document-markdown.js';
import type { DocBody } from './types.js';

export const toPortableBody = (value: unknown): DocBody =>
  Array.isArray(value) ? (value as DocBody) : [];
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

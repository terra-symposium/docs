/**
 * src/components/terra/editor/types.ts
 * Shared Content and Portable Text renderer contracts.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// DATA
import { DOCS_BLOCK_SCHEMAS } from '../../../lib/terra/runtime/types.js';

// TYPES
import type { BlockObjectRenderProps } from '@portabletext/editor';
import type { DocsContent } from '../../../lib/terra/runtime/types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Resolves a docs block shape for a supported docs block name. */
export type DocsBlock<
  T extends Extract<keyof typeof DOCS_BLOCK_SCHEMAS, DocsContent[number]['_type']>,
> = Extract<DocsContent[number], { _type: T }>;
/** Props supplied to a read-only renderer for a typed Portable Text block. */
export type PortableTextBlockRendererProps<TBlock> = Pick<
  BlockObjectRenderProps,
  'attributes' | 'children' | 'path' | 'readOnly'
> & { node: TBlock };
/** Props supplied to an editable renderer for a typed Portable Text block. */
export type PortableTextBlockEditorProps<TBlock> = Omit<
  PortableTextBlockRendererProps<TBlock>,
  'readOnly'
>;

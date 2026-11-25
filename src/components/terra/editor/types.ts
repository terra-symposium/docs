/**
 * src/components/terra/editor/types.ts
 */

// @ts-nocheck -- source-preserving extraction; public host contracts are typed in src/host.ts.
/*
 * astro/src/components/editor/types.ts
 * Shared Terra content and Portable Text renderer contracts.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// DATA
import { DOCS_BLOCK_SCHEMAS, PROBLEM_BLOCK_TYPES } from '../../../lib/terra/runtime/types.js';

// TYPES
import type { ArticleContent, DocsContent, ProblemContent } from '../../../lib/terra/runtime/types.js';
import type { BlockObjectRenderProps } from '@portabletext/editor';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Resolves a docs block shape for a supported docs block name. */
export type DocsBlock<T extends Extract<keyof typeof DOCS_BLOCK_SCHEMAS, DocsContent[number]['_type']>> = Extract<DocsContent[number], { _type: T }>;

/** Article inline block shape selected by its Sanity type discriminator. */
type ArticleInline<T extends 'image' | 'video' | 'table' | 'questions' | 'dialogue' | 'definition'> = Extract<
	NonNullable<Extract<ArticleContent[number], { children?: unknown }>['children']>[number],
	{ _type: T }
>;

/** Resolves a problem block shape for a supported problem block name. */
type ProblemBlock<T extends (typeof PROBLEM_BLOCK_TYPES)[number]> = Extract<ProblemContent[number], { _type: T }>;
/** Extracts one problem inline shape by its Sanity `_type` discriminator. */
type ProblemInline<T extends 'definition'> = Extract<ProblemContent[number], { _type: T }>;
/** Props supplied to a read-only renderer for a typed Portable Text block. */
export type PortableTextBlockRendererProps<TBlock> = Pick<BlockObjectRenderProps, 'attributes' | 'children' | 'path' | 'readOnly'> & { node: TBlock };
/** Props supplied to an editable renderer for a typed Portable Text block. */
export type PortableTextBlockEditorProps<TBlock> = Omit<PortableTextBlockRendererProps<TBlock>, 'readOnly'>;

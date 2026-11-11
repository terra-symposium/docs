/**
 * src/lib/block-types.ts
 * Portable block contracts shared by the Markdown parser and React renderer.
 */

export const DOCS_BLOCK_TYPES = [
  'accordion',
  'tabs',
  'table',
  'callout',
  'code',
  'docImage',
  'embed',
  'math',
  'nodes',
  'quiz',
  'raw',
  'tsDocs',
] as const;
/** Every structured Docs block type, including groups that remain Markdown-authored. */
export type DocsBlockType = (typeof DOCS_BLOCK_TYPES)[number];
/** Structured editor blocks; tabs and accordions are authored only as Markdown syntax. */
export type DocsEditorBlockType = Exclude<DocsBlockType, 'accordion' | 'tabs'>;
/** Per-block switches controlling which optional renderers an embedding host enables. */
export type DocsBlockOptions = Partial<Record<DocsBlockType | 'inlineMath', boolean>>;
/** Open record shape used while converting host blocks to and from Portable Text. */
export type RichBlock = { _type: string; _key?: string; markdown?: string; [key: string]: unknown };
/**
 * Returns enabled editor block types while excluding Markdown-only tabs and accordions.
 * @param options Per-block switches supplied by the embedding host.
 * @returns Enabled structured block types in their canonical registration order.
 */
export function enabledDocsBlocks(options: DocsBlockOptions = {}): DocsEditorBlockType[] {
  // Groups are parsed Markdown syntax, not structured editor blocks.
  return DOCS_BLOCK_TYPES.filter(
    (t) => t !== 'accordion' && t !== 'tabs' && options[t] !== false,
  ) as DocsEditorBlockType[];
}

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
/** Discriminator union for every serialized block understood by Docs. */
export type DocsBlockType = (typeof DOCS_BLOCK_TYPES)[number];
/** Structured editor blocks; tabs and accordions are authored only as Markdown syntax. */
export type DocsEditorBlockType = Exclude<DocsBlockType, 'accordion' | 'tabs'>;

/** Per-block switches used by renderers to keep unsupported source intact but hidden. */
export type DocsBlockOptions = Partial<Record<DocsBlockType | 'inlineMath', boolean>>;

/** Open serialized block shape shared by the Markdown parser and component renderer. */
export type RichBlock = { _type: string; _key?: string; markdown?: string; [key: string]: unknown };

/**
 * Lists enabled structured editor blocks, excluding groups authored as Markdown delimiters.
 *
 * @param options Per-block visibility switches; omitted entries stay enabled.
 *
 * @return Enabled editor block types in the package's canonical order.
 */
export function enabledDocsBlocks(options: DocsBlockOptions = {}): DocsEditorBlockType[] {
  // Groups are parsed Markdown syntax, not structured editor blocks.
  return DOCS_BLOCK_TYPES.filter(
    (t) => t !== 'accordion' && t !== 'tabs' && options[t] !== false,
  ) as DocsEditorBlockType[];
}

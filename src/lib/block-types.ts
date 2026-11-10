/** Portable block contracts shared by the Markdown parser and React renderer. */
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
export type DocsBlockType = (typeof DOCS_BLOCK_TYPES)[number];
/** Structured editor blocks; tabs and accordions are authored only as Markdown syntax. */
export type DocsEditorBlockType = Exclude<DocsBlockType, 'accordion' | 'tabs'>;
export type DocsBlockOptions = Partial<Record<DocsBlockType | 'inlineMath', boolean>>;
export type RichBlock = { _type: string; _key?: string; markdown?: string; [key: string]: unknown };
export function enabledDocsBlocks(options: DocsBlockOptions = {}): DocsEditorBlockType[] {
  // Groups are parsed Markdown syntax, not structured editor blocks.
  return DOCS_BLOCK_TYPES.filter(
    (type) => type !== 'accordion' && type !== 'tabs' && options[type] !== false,
  ) as DocsEditorBlockType[];
}

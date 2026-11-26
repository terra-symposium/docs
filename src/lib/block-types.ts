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
/**
 * Portable Text types accepted by the loader, including legacy groups normalized to Markdown.
 */
export type DocsBlockType = (typeof DOCS_BLOCK_TYPES)[number];
/**
 * Structured editor blocks; tabs and accordions are authored only as Markdown syntax.
 */
export type DocsEditorBlockType = Exclude<DocsBlockType, 'accordion' | 'tabs'>;
/**
 * Per-block switches controlling which optional renderers an embedding host enables.
 */
export type DocsBlockOptions = Partial<Record<DocsBlockType | 'inlineMath', boolean>> & {
  /**
   * TSDoc-generated reference entries used by the Blocks authoring page.
   */
  blockGuidanceEntries?: Record<string, unknown>;
};

/** Reports Markdown or HTML headings deeper than H3, outside code and comments. */
export function markdownHeadingDepthIssues(markdown: string): number[] {
  const issues: number[] = [];
  const source = markdown.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ''));
  let fence: { character: string; length: number } | undefined;
  source.split(/\r?\n/).forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      const character = marker[0]!;
      if (fence) {
        if (fence.character === character && marker.length >= fence.length) fence = undefined;
      } else fence = { character, length: marker.length };
      return;
    }
    if (fence) return;
    const prose = line.replace(/(`+)(.*?)\1/g, '');
    if (/^\s*#{4,6}\s+/.test(prose) || /<\/?h[4-6]\b[^>]*>/i.test(prose)) issues.push(index + 1);
  });
  return issues;
}
/**
 * Open record shape used while converting host blocks to and from Portable Text.
 */
export type RichBlock = { _type: string; _key?: string; markdown?: string; [key: string]: unknown };
/**
 * Returns enabled editor block types while excluding Markdown-only tabs and accordions.
 *
 * @param options Per-block switches supplied by the embedding host.
 *
 * @returns Enabled structured block types in their canonical registration order.
 */
export function enabledDocsBlocks(options: DocsBlockOptions = {}): DocsEditorBlockType[] {
  // Groups are parsed Markdown syntax, not structured editor blocks.
  return DOCS_BLOCK_TYPES.filter(
    (t) => t !== 'accordion' && t !== 'tabs' && options[t] !== false,
  ) as DocsEditorBlockType[];
}

/**
 * src/lib/local-markdown.ts
 */
/* Build a downloadable Markdown leaf from edits made in a local Docs workspace. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { parseDocument } from 'yaml';
import * as TerraQualityRegex from './terra/regex.mjs';

/**
 * Separate repository metadata from the body shown in the editor.
 *
 * @param src - Original Markdown source, optionally beginning with YAML frontmatter.
 *
 * @returns The unchanged frontmatter and editable body.
 */
export function splitMarkdownSource(src: string): { frontmatter: string; body: string } {
  const match = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)(?:\r?\n)?/.exec(src);
  return match
    ? { frontmatter: match[1]!, body: src.slice(match[0].length) }
    : { frontmatter: '', body: src };
}

/**
 * Preserve authored metadata while applying title and description edits.
 *
 * @param input - Original source, edited fields, and their initial values.
 *
 * @returns The complete Markdown source with updated metadata when necessary.
 */
export function editedMarkdownSource(input: {
  original: string;
  body: string;
  title: string;
  description?: string;
  initialTitle: string;
  initialDescription?: string;
}): string {
  const { frontmatter } = splitMarkdownSource(input.original);
  const titleChanged = input.title !== input.initialTitle;
  const descChanged = (input.description ?? '') !== (input.initialDescription ?? '');
  let header = frontmatter;
  if (titleChanged || descChanged) {
    const doc = parseDocument(
      frontmatter ? frontmatter.replace(/^---\r?\n|\r?\n---\r?\n$/g, '') : '',
    );
    if (doc.errors.length) throw new Error('The original Markdown frontmatter is invalid.');
    if (titleChanged) doc.set('title', input.title);
    if (descChanged) doc.set('description', input.description ?? '');
    header = `---\n${doc.toString().trimEnd()}\n---\n`;
  }
  return `${header}${header ? '\n' : ''}${input.body.trimEnd()}\n`;
}

/**
 * Use the source filename so the downloaded leaf can replace the repository file.
 *
 * @param srcPath - Repository path or URL of the original leaf.
 *
 * @returns A Markdown filename suitable for the downloaded file.
 */
export function markdownDownloadName(srcPath: string): string {
  const name =
    srcPath
      .split(/[\\/#?]/)
      .filter(Boolean)
      .at(-1) || 'index.md';
  return /\.mdx?$/i.test(name) ? name : `${name}.md`;
}

/**
 * Resolve relative images against the copied assets in a generated Docs site.
 *
 * @param markdown - Markdown body containing image references.
 * @param srcPath - Path of the leaf relative to the Docs root.
 * @param base - URL base path of the generated site.
 *
 * @returns Markdown with local image references rewritten to published asset URLs.
 */
export function siteImageUrls(markdown: string, srcPath: string, base = '/'): string {
  let fence: { character: string; length: number } | null = null;
  const srcUrl = new URL(
    srcPath.replace(TerraQualityRegex.REGEX_DOCS_REGEX_2(), ''),
    'https://docs.local/',
  );
  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      if (marker) {
        if (!fence) fence = { character: marker[0]!, length: marker.length };
        else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
        return line;
      }
      if (fence) return line;
      const rewrite = (match: string, opener: string, tgt: string, closer: string) => {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(tgt)) return match;
        return `${opener}${base}_docs/assets/${new URL(tgt, srcUrl).pathname.slice(1)}${closer}`;
      };
      if (/<img\b/i.test(line))
        return line.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi, rewrite);
      if (/^\s*\|/.test(line)) {
        const cells = line.split('|');
        const uiCell = cells.length - 2;
        if (uiCell >= 0)
          cells[uiCell] = cells[uiCell]!.replace(/(!\[[^\]]*\]\()([^\s)]+)([^)]*\))/g, rewrite);
        return cells.join('|');
      }
      return line.replace(/^(\s*!\[[^\]]*\]\()([^\s)]+)([^)]*\))/, rewrite);
    })
    .join('\n');
}

/**
 * Trigger the browser's native file download for an edited Markdown leaf.
 *
 * @param filename - Name offered to the browser for the download.
 * @param src - Complete Markdown source to download.
 */
export function downloadMarkdownFile(filename: string, src: string): void {
  const url = URL.createObjectURL(new Blob([src], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Build a downloadable Markdown leaf from edits made in a local Docs workspace. */

import { parseDocument } from 'yaml';

/** Separate repository metadata from the body shown in the editor. */
export function splitMarkdownSource(source: string): { frontmatter: string; body: string } {
  const match = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)(?:\r?\n)?/.exec(source);
  return match
    ? { frontmatter: match[1]!, body: source.slice(match[0].length) }
    : { frontmatter: '', body: source };
}

/** Preserve authored metadata while applying title and description edits. */
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
  const descriptionChanged = (input.description ?? '') !== (input.initialDescription ?? '');
  let header = frontmatter;
  if (titleChanged || descriptionChanged) {
    const document = parseDocument(
      frontmatter ? frontmatter.replace(/^---\r?\n|\r?\n---\r?\n$/g, '') : '',
    );
    if (document.errors.length) throw new Error('The original Markdown frontmatter is invalid.');
    if (titleChanged) document.set('title', input.title);
    if (descriptionChanged) document.set('description', input.description ?? '');
    header = `---\n${document.toString().trimEnd()}\n---\n`;
  }
  return `${header}${header ? '\n' : ''}${input.body.trimEnd()}\n`;
}

/** Use the source filename so the downloaded leaf can replace the repository file. */
export function markdownDownloadName(sourcePath: string): string {
  const name =
    sourcePath
      .split(/[\\/#?]/)
      .filter(Boolean)
      .at(-1) || 'index.md';
  return /\.mdx?$/i.test(name) ? name : `${name}.md`;
}

/** Resolve relative images against the copied assets in a generated Docs site. */
export function siteImageUrls(markdown: string, sourcePath: string, base = '/'): string {
  let fence: { character: string; length: number } | null = null;
  const relativeFile = sourcePath.replace(/^\/?docs\//, '');
  const sourceUrl = new URL(relativeFile, 'https://docs.local/');
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
      const image = /(!\[[^\]]*\]\()([^\s)]+)([^)]*\))/g;
      const rewrite = (match: string, opener: string, target: string, closer: string) => {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(target)) return match;
        const assetPath = new URL(target, sourceUrl).pathname.slice(1);
        return `${opener}${base}_docs/assets/${assetPath}${closer}`;
      };
      if (/<img\b/i.test(line))
        return line.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi, rewrite);
      if (/^\s*\|/.test(line)) {
        const cells = line.split('|');
        const uiCell = cells.length - 2;
        if (uiCell >= 0) cells[uiCell] = cells[uiCell]!.replace(image, rewrite);
        return cells.join('|');
      }
      return line.replace(/^(\s*!\[[^\]]*\]\()([^\s)]+)([^)]*\))/, rewrite);
    })
    .join('\n');
}

/** Trigger the browser's native file download for an edited Markdown leaf. */
export function downloadMarkdownFile(filename: string, source: string): void {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

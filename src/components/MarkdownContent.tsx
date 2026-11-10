import { markdownToDocsValue } from '../lib/markdown-model.js';
import type { DocsBlockOptions } from '../lib/block-types.js';
import { DocsRichBlock, type RichBlock } from './blocks.js';
import type { JSX } from 'react';

/** React Markdown renderer shared by the site, nested blocks, and editor preview. */
export function MarkdownContent({
  markdown,
  options,
}: {
  markdown: string;
  options?: DocsBlockOptions;
}): JSX.Element {
  return (
    <>
      {markdownToDocsValue(markdown, options).map((block, i) => (
        <DocsRichBlock key={block._key ?? i} block={block as RichBlock} />
      ))}
    </>
  );
}

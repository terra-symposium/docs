import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownContent } from '../components/MarkdownContent.js';
import type { DocsBlockOptions } from './block-types.js';

/** Server-render Markdown through the same React components used by live Docs pages. */
export function renderMarkdown(markdown: string, options: DocsBlockOptions = {}): string {
  return renderToStaticMarkup(createElement(MarkdownContent, { markdown, options }));
}

/**
 * src/lib/markdown.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// COMPONENTS
import { DocsMarkdown } from '../components/MarkdownContent.js';

// TYPES
import type { DocsBlockOptions } from './block-types.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Server-renders Markdown through the same React renderer used by live Docs pages.
 *
 * @param markdown - Markdown source whose blocks should use the shared Docs renderer.
 * @param options - Optional block renderers and display options for those components.
 *
 * @return Static HTML produced by the same React tree used by live Docs pages.
 */
export function renderMarkdown(markdown: string, options: DocsBlockOptions = {}): string {
  return renderToStaticMarkup(createElement(DocsMarkdown, { markdown, options }));
}

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
 * Returns static HTML for integrations that cannot mount React; interactive pages should render `DocsMarkdown`.
 *
 * @param markdown Markdown source to parse and render.
 * @param options Optional block switches passed through to the shared Markdown renderer.
 *
 * @return Static HTML produced by the same Docs components used by interactive pages.
 */
export function renderMarkdown(markdown: string, options: DocsBlockOptions = {}): string {
  return renderToStaticMarkup(createElement(DocsMarkdown, { markdown, options }));
}

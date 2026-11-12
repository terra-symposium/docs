/**
 * src/components/terra/editor/docs/_Raw.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { CodeBlock } from './_CodeBlock.js';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { DocsBlock } from '../types.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Keeps unrecognized Markdown visible verbatim while turning horizontal-rule syntax into a divider.
 *
 * @param block Raw Markdown string rendered as a horizontal rule or a source-preserving code block.
 *
 * @return A divider for Markdown rules, otherwise a source-preserving Markdown code block.
 */
export function Raw({
  block,
}: {
  block: /** Sanity Portable Text raw markup block fields. */ DocsBlock<'raw'>;
}): JSX.Element {
  const markdown = block.markdown ?? '';
  return (
    <ErrorBoundary name="Raw">
      {/^(?:\*(?:[\t ]*\*){2,}|-(?:[\t ]*-){2,}|_(?:[\t ]*_){2,})[\t ]*$/.test(
        markdown.replace(/\r\n?/g, '\n').trim(),
      ) ? (
        <hr
          className="my-16 h-px w-full border-0 bg-primary-6 print:hidden"
          data-docs-raw-divider
        />
      ) : (
        <CodeBlock docsSource code={markdown} language="mdx" tone="view" />
      )}
    </ErrorBoundary>
  );
}
Object.assign(Raw, { displayName: 'DocsRawMarkup' });

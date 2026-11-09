// @ts-nocheck -- source-preserving extraction; public host contracts are typed in src/host.ts.
/**
 * astro/src/components/editor/docs/_Raw.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { CodeBlock } from './_CodeBlock.js';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { DocsBlock } from '../types.js';

/**
 * Renders the raw component.
 *
 * @param props - Raw block props containing the authored markup.
 *
 * @return Rendered raw documentation content.
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

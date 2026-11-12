/**
 * src/components/terra/editor/docs/_Raw.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import * as TerraQualityRegex from '../../../../lib/terra/regex.mjs';
import { CodeBlock } from './_CodeBlock.js';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { JSX } from 'react';
import type { DocsBlock } from '../types.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders authored raw Markdown source as a Docs code preview, or as a divider when it is only a rule.
 *
 * @param block Raw Portable Text block whose `markdown` field contains the authored source.
 *
 * @returns The raw code preview or the horizontal divider represented by the source.
 */
export function Raw({
  block,
}: {
  block: /** Sanity Portable Text raw markup block fields. */ DocsBlock<'raw'>;
}): JSX.Element {
  const markdown = typeof block.markdown === 'string' ? block.markdown : '';
  return (
    <ErrorBoundary name="Raw">
      {TerraQualityRegex.REGEX_T_2_T_2_T_2_T_REGEX().test(
        markdown.replace(TerraQualityRegex.REGEX_R_N_G_REGEX_2(), '\n').trim(),
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

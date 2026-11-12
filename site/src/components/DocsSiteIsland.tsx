/**
 * site/src/components/DocsSiteIsland.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { ErrorBoundary } from '@terra-symposium/standards-error-boundaries/react';
import { DocsStaticWorkspace } from '../../../dist/lib/components/StaticWorkspace.js';
import { DocsSiteSearch } from './DocsSiteSearch.js';

// TYPES
import type { ComponentProps } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const DOCS_SITE_COMPONENTS = {
  Workspace: DocsStaticWorkspace,
  Search: DocsSiteSearch,
};

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Keeps Docs workspace and search rendering failures inside a visible, recoverable page boundary.
 *
 * @param searchBase Base URL used to fetch the generated search index.
 * @param workspaceProps Props forwarded to the static documentation workspace.
 *
 * @return The lazy Docs workspace and search dialog inside a recoverable error boundary.
 */
export function DocsSiteIsland({
  searchBase = '/',
  ...workspaceProps
}: ComponentProps<typeof DOCS_SITE_COMPONENTS.Workspace> & {
  searchBase?: string;
}) {
  return (
    <ErrorBoundary
      name="Docs site"
      onError={(e, r) => console.error(`[${r.name}]`, e, r.componentStack)}
      fallback={() => (
        <main
          aria-labelledby="docs-site-error-title"
          className="mx-auto my-12 max-w-2xl p-6"
          role="alert"
        >
          <h1 id="docs-site-error-title">Documentation could not load</h1>
          <p>
            The Docs interface encountered a rendering error. The rest of this page remains
            available.
          </p>
          <button onClick={() => window.location.reload()} type="button">
            Reload Docs
          </button>
        </main>
      )}
    >
      <DOCS_SITE_COMPONENTS.Workspace {...workspaceProps} />
      <DOCS_SITE_COMPONENTS.Search base={searchBase} />
    </ErrorBoundary>
  );
}

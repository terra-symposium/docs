/**
 * site/src/components/DocsSiteIsland.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import React from 'react';
import { ErrorBoundary } from '@terra-symposium/standards-error-boundaries/react';

// TYPES
import type { ComponentProps } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const { lazy, Suspense } = React;
const DocsStaticWorkspace = lazy(() =>
  import('../../../dist/lib/components/StaticWorkspace.js').then(({ DocsStaticWorkspace }) => ({
    default: DocsStaticWorkspace,
  })),
);
const DocsSiteSearch = lazy(() =>
  import('./DocsSiteSearch.js').then(({ DocsSiteSearch }) => ({ default: DocsSiteSearch })),
);
type Props = ComponentProps<typeof DocsStaticWorkspace> & { searchBase?: string };

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Keeps Docs workspace and search rendering failures inside a visible, recoverable page boundary.
 *
 * @param props Workspace data and the base path used for search-index requests.
 *
 * @return The lazy Docs workspace and search dialog inside a recoverable error boundary.
 */
export function DocsSiteIsland({ searchBase = '/', ...workspaceProps }: Props) {
  return (
    <ErrorBoundary
      name="Docs site"
      onError={(error, report) => console.error(`[${report.name}]`, error, report.componentStack)}
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
      <Suspense
        fallback={
          <p aria-live="polite" role="status">
            Loading documentation…
          </p>
        }
      >
        <DocsStaticWorkspace {...workspaceProps} />
        <DocsSiteSearch base={searchBase} />
      </Suspense>
    </ErrorBoundary>
  );
}

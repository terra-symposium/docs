/**
 * src/components/StrictLocalWorkspaceHarness.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useState } from 'react';

// COMPONENTS
import { DocsLocalWorkspace } from './LocalDocsWorkspace.js';
import { StrictMode } from 'react';

// TYPES
import type { DocsLocalWorkspaceProps } from './LocalDocsWorkspace.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Exercise the local host adapter under the same React StrictMode as consumers.
 *
 * @return A fixture-backed local workspace or a diagnostic message when no fixture was supplied.
 */
export default function StrictLocalWorkspaceHarness(): JSX.Element {
  const [fixture] = useState(() =>
    typeof window === 'undefined' ? undefined : window.__docsLocalWorkspaceFixture,
  );
  const quizHarness = typeof window === 'undefined' ? undefined : window.__docsQuizHarness;
  const quiz =
    fixture?.quiz ??
    (quizHarness
      ? {
          ...(quizHarness.toolbar !== undefined ? { toolbar: quizHarness.toolbar } : {}),
          generate: async (i: unknown) => {
            document.documentElement.dataset.quizInput = JSON.stringify(i);
            if (quizHarness.failure) throw new Error(quizHarness.failure);
            return quizHarness.response;
          },
        }
      : undefined);
  return (
    <StrictMode>
      {fixture ? (
        <DocsLocalWorkspace {...fixture} {...(quiz ? { quiz } : {})} />
      ) : (
        <main>Local Docs workspace fixture not provided.</main>
      )}
    </StrictMode>
  );
}
declare global {
  /** Browser-only fixture contract installed by the local-workspace test harness. */
  interface Window {
    __docsLocalWorkspaceFixture?: DocsLocalWorkspaceProps;
    __docsQuizHarness?: {
      failure?: string;
      response?: unknown;
      toolbar?: boolean;
    };
  }
}

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
 * @returns The supplied local fixture rendered through the Docs workspace under StrictMode.
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
  /**
   * Browser fixture fields used to provide local workspace and quiz test data.
   */
  interface Window {
    __docsLocalWorkspaceFixture?: DocsLocalWorkspaceProps;
    __docsQuizHarness?: {
      failure?: string;
      response?: unknown;
      toolbar?: boolean;
    };
  }
}

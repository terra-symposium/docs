import { StrictMode, useState } from 'react';
import { DocsLocalWorkspace } from './LocalDocsWorkspace.js';
import type { DocsLocalWorkspaceProps } from './LocalDocsWorkspace.js';
import type { JSX } from 'react';

declare global {
	/** Browser fixtures that configure the strict-mode workspace harness. */
	interface Window {
		__docsLocalWorkspaceFixture?: DocsLocalWorkspaceProps;
		__docsQuizHarness?: {
			failure?: string;
			response?: unknown;
			toolbar?: boolean;
		};
	}
}

/** Exercise the local host adapter under the same React StrictMode as consumers.
 * @returns The configured local workspace or a message that its fixture is missing.
 */
export default function StrictLocalWorkspaceHarness(): JSX.Element {
	const [fixture] = useState(() => (typeof window === 'undefined' ? undefined : window.__docsLocalWorkspaceFixture));
	const quizHarness = typeof window === 'undefined' ? undefined : window.__docsQuizHarness;
	const quiz =
		fixture?.quiz ??
		(quizHarness
			? {
					...(quizHarness.toolbar !== undefined ? { toolbar: quizHarness.toolbar } : {}),
					generate: async (input: unknown) => {
						document.documentElement.dataset.quizInput = JSON.stringify(input);
						if (quizHarness.failure) throw new Error(quizHarness.failure);
						return quizHarness.response;
					},
				}
			: undefined);

	return <StrictMode>{fixture ? <DocsLocalWorkspace {...fixture} {...(quiz ? { quiz } : {})} /> : <main>Local Docs workspace fixture not provided.</main>}</StrictMode>;
}

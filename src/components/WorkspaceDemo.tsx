/**
 * src/components/WorkspaceDemo.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors } from '@terra-symposium/styling';
import { createWorkspaceDemoHost, createWorkspaceDemoSeed, readWorkspaceDemoState, routedWorkspaceTree } from './workspace-demo-fixture.js';
import { useEffect, useMemo, useState } from 'react';

// COMPONENTS
import { DocsLocalWorkspace, TerraDocsWorkspace } from '@terra-symposium/docs';

// DATA
import { WORKSPACE_DEMO_PATH } from './workspace-demo-fixture.js';

// TYPES
import type { CSSProperties, JSX } from 'react';
import type { DocsHostTreeNode } from '../lib/host.js';
import type { WorkspaceDemoState } from './workspace-demo-fixture.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param nodes
 *
 * @return
 */
function withLocalRoute(nodes: DocsHostTreeNode[]): DocsHostTreeNode[] {
	return nodes.map(n => ({
		...n,
		...(n.type === 'leaf' ? { url: '/workspace-readonly/' } : {}),
		...(n.children ? { children: withLocalRoute(n.children) } : {}),
	}));
}

/**
 *
 * @return
 */
function currentLocation(): string {
	if (typeof window === 'undefined') return WORKSPACE_DEMO_PATH;
	return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * Shows an editable workspace demo backed by a browser-persisted fixture.
 *
 * @param readOnly Whether the demo should disable mutations.
 * @param hue Base hue used to style the workspace.
 *
 * @return Workspace demo route and editor surface.
 */
export default function WorkspaceDemo({ readOnly = false, hue = 145 }: { readOnly?: boolean; hue?: number | null } = {}): JSX.Element {
	const [state, setState] = useState<WorkspaceDemoState>(() => createWorkspaceDemoSeed());
	const [location, setLocation] = useState(WORKSPACE_DEMO_PATH);
	useEffect(() => {
		const syncFixture = (): void => {
			setState(readWorkspaceDemoState());
			setLocation(currentLocation());
		};
		const syncLocation = (event: Event): void => {
			const detail = (event as CustomEvent<{ pathname?: unknown; url?: unknown }>).detail;
			setLocation(typeof detail?.pathname === 'string' ? detail.pathname : typeof detail?.url === 'string' ? detail.url : currentLocation());
			setState(readWorkspaceDemoState());
		};
		syncFixture();
		window.addEventListener('terra-docs-fixture-updated', syncFixture);
		window.addEventListener('popstate', syncFixture);
		document.addEventListener('docs:navigate', syncLocation);
		return () => {
			window.removeEventListener('terra-docs-fixture-updated', syncFixture);
			window.removeEventListener('popstate', syncFixture);
			document.removeEventListener('docs:navigate', syncLocation);
		};
	}, []);
	const selectedDocument =
		state.documents[
			((): string => {
				try {
					const requested = new URL(location, 'http://localhost').searchParams.get('leaf');
					if (requested && state.documents[requested]) return requested;
				} catch {
					// The seed leaf is the stable fallback for malformed demo routes.
				}
				return state.documents.salesphere ? 'salesphere' : (Object.keys(state.documents)[0] ?? '');
			})()
		] ?? state.documents.salesphere;
	// terra-quality-ignore single-use -- Memoize the demo host at a stable hook position so editor consumers retain its identity.
	const host = useMemo(() => createWorkspaceDemoHost(readOnly), [readOnly]);
	const [primary, secondary] = colors(hue);
	if (!selectedDocument) return <div className='min-h-svh' />;
	const localPage = {
		id: 'salesphere',
		path: selectedDocument.path,
		pathname: '/workspace-readonly/',
		title: selectedDocument.title,
		description: 'A page level description for the Salesphere overview.',
		updatedAt: selectedDocument.updatedAt,
		markdown:
			'# Salesphere\n\nSalesphere helps sales professionals choose a useful next step in a customer relationship and understand why it matters.\n\n## Start with the product\n\nRead [Salesphere’s purpose](/product/purpose/) for the larger aim.',
		attachments: selectedDocument.attachments,
	};
	return (
		<div
			className='workspace-demo-theme min-h-svh bg-primary-1 text-primary-12'
			style={
				{
					...Object.fromEntries(primary.light.map((r, i) => [`--primary-${i + 1}`, r])),
					...Object.fromEntries(secondary.light.map((r, i) => [`--secondary-${i + 1}`, r])),
					'--background': primary.light[0],
					'--ring': primary.light[7],
				} as CSSProperties
			}
		>
			{readOnly ? (
				<DocsLocalWorkspace
					tree={withLocalRoute(routedWorkspaceTree(state, true))}
					pages={[localPage]}
					pathname={localPage.pathname}
					title='Salesphere Docs'
					description='Product and engineering documentation.'
					rootPath='/workspace-readonly/'
					homePath={localPage.pathname}
				/>
			) : (
				<TerraDocsWorkspace
					tree={routedWorkspaceTree(state, false)}
					host={host}
					pathname={location}
					permission='write'
					path={selectedDocument.path}
					title={selectedDocument.title}
					description={selectedDocument.description}
					contributors={selectedDocument.contributors}
					updatedAt={selectedDocument.updatedAt}
					content={selectedDocument.content}
					source={selectedDocument.source}
				/>
			)}
		</div>
	);
}

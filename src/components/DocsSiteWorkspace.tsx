import { DocsLocalWorkspace } from '@terra-symposium/docs-site/local-workspace';
import type { DocsLocalWorkspaceProps } from '@terra-symposium/docs-site/local-workspace';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';

/**
 * Keeps the published workspace's route prop aligned with its client-side navigation.
 * Astro supplies the route at render time, while Docs changes routes without a page reload.
 *
 * @param pathname Initial route supplied by the site.
 * @param workspaceProps Remaining workspace configuration supplied by the site.
 * @returns The workspace with its route synchronized to browser navigation.
 */
export function DocsSiteWorkspace({ pathname, ...workspaceProps }: DocsLocalWorkspaceProps): JSX.Element {
	const [currentPath, setPathname] = useState(pathname);
	useEffect(() => {
		const syncPath = () => setPathname(`${window.location.pathname}${window.location.search}${window.location.hash}`);
		syncPath();
		document.addEventListener('docs:navigate', syncPath);
		window.addEventListener('popstate', syncPath);
		window.addEventListener('hashchange', syncPath);
		return () => {
			document.removeEventListener('docs:navigate', syncPath);
			window.removeEventListener('popstate', syncPath);
			window.removeEventListener('hashchange', syncPath);
		};
	}, [pathname]);
	return <DocsLocalWorkspace {...workspaceProps} pathname={currentPath} />;
}

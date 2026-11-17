import { DocsLocalWorkspace } from '@terra-symposium/docs-site/local-workspace';
import type { DocsLocalWorkspaceProps } from '@terra-symposium/docs-site/local-workspace';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';

/**
 * Keeps the published workspace's route prop aligned with its client-side navigation.
 * Astro supplies the route at render time, while Docs changes routes without a page reload.
 */
export function DocsSiteWorkspace(props: DocsLocalWorkspaceProps): JSX.Element {
	const [pathname, setPathname] = useState(props.pathname);
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
	}, [props.pathname]);
	return <DocsLocalWorkspace {...props} pathname={pathname} />;
}

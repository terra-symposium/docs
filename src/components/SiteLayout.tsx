/**
 * src/components/SiteLayout.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { DocsStaticWorkspace } from './StaticWorkspace.js';

// TYPES
import type { DocsAttachment, DocsSection } from '../lib/workspace-types.js';
import type { DocsNavNode } from './navigation.js';
import type { JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Compatibility adapter for static React sites.
 *
 * All navigation, page chrome, modes, and document rendering are delegated to
 * the same TerraDocsWorkspace used by the local and remote host adapters.
 *
 * @param title Site name displayed by the workspace.
 * @param homeHref Link target for the home navigation action.
 * @param description Optional description for the site.
 * @param pageTitle Optional title for the current page.
 * @param nodes Navigation nodes used to build page sections when supplied.
 * @param currentPath Current page URL used to select the active page.
 * @param hue Base hue used to derive the workspace theme.
 * @param children Optional host-rendered page content.
 * @param sections Pre-grouped navigation sections.
 * @param attachments Attachments associated with the current page.
 * @param rootPath Optional path used as the home document fallback.
 * @param markdown Markdown source used when structured content is absent.
 * @param content Structured Docs content for the current page.
 *
 * @return A static Terra Docs workspace element.
 */
export function DocsSiteLayout({
	title,
	homeHref = '/',
	description,
	pageTitle,
	nodes,
	currentPath,
	hue = 145,
	children,
	sections,
	attachments = [],
	rootPath,
	markdown,
	content,
}: {
	title: string;
	homeHref?: string;
	description?: string;
	pageTitle?: string;
	nodes: DocsNavNode[];
	currentPath: string;
	hue?: number | null;
	children?: ReactNode;
	sections?: DocsSection[];
	attachments?: DocsAttachment[];
	rootPath?: string;
	markdown?: string;
	content?: unknown;
}): JSX.Element {
	return (
		<DocsStaticWorkspace
			title={title}
			homeHref={homeHref}
			{...(description ? { description } : {})}
			{...(pageTitle ? { pageTitle } : {})}
			hue={hue}
			nodes={nodes}
			{...(sections ? { sections } : {})}
			currentPath={currentPath}
			{...(rootPath ? { rootPath } : {})}
			{...(markdown !== undefined ? { markdown } : {})}
			{...(content !== undefined ? { content } : {})}
			attachments={attachments}
			{...(children !== undefined ? { renderContent: children } : {})}
		/>
	);
}

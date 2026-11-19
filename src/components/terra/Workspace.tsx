/**
 * src/components/terra/Workspace.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { configureDocsHost } from '../../lib/host-runtime.js';

// COMPONENTS
import Scaffold from './pages/docs/_main.js';

// TYPES
import type { JSX } from 'react';
import type { TerraDocsWorkspaceProps } from '../../lib/host.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * The source-preserving shared Docs workspace used by host route adapters.
 *
 * @param host Host adapter that supplies routes, permissions, and document actions.
 * @param customBlocks Optional host-provided Portable Text block renderers.
 * @param tree Navigation tree displayed by the workspace.
 * @param pathname Current route used to select the active document.
 * @param permission Current user's permission for Docs actions.
 * @param userData Signed-in user information shown by the navigation.
 * @param title Site or document title displayed by the workspace.
 * @param path Optional document path.
 * @param desc Optional document description.
 * @param contributors Contributor names associated with the document.
 * @param updatedAt Document update timestamp.
 * @param src Markdown source for the document.
 * @param content Structured document body.
 * @param renderContent Optional host-rendered view content.
 * @param standalone Whether the workspace runs without the remote host shell.
 * @param full Whether the workspace fills the available page area.
 * @param mode Initial view or editing mode.
 *
 * @return Shared Docs workspace element.
 */
export function TerraDocsWorkspace({
	host,
	customBlocks,
	tree,
	pathname,
	permission,
	userData,
	title,
	path,
	description: desc,
	contributors,
	updatedAt,
	source: src,
	content,
	renderContent,
	standalone,
	full,
	mode,
}: TerraDocsWorkspaceProps): JSX.Element {
	configureDocsHost(host, customBlocks);
	return (
		<Scaffold
			tree={tree as any}
			pathname={pathname}
			permission={permission}
			userData={userData ?? null}
			title={title}
			{...(path ? { path } : {})}
			{...(desc ? { description: desc } : {})}
			{...(contributors ? { contributors } : {})}
			{...(updatedAt ? { updatedAt } : {})}
			{...(src ? { source: src } : {})}
			{...(content !== undefined ? { content: content as any } : {})}
			{...(renderContent !== undefined ? { viewContent: renderContent } : {})}
			{...(standalone !== undefined ? { standalone } : {})}
			{...(full !== undefined ? { full } : {})}
			{...(mode ? { mode } : {})}
		/>
	);
}

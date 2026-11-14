/**
 * src/components/LocalDocsWorkspace.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors } from '@terra-symposium/styling';
import { markdownToDocsValue } from '../lib/markdown-model.js';
import { useMemo } from 'react';

// COMPONENTS
import { TerraDocsWorkspace } from './terra/Workspace.js';

// TYPES
import type { CSSProperties, JSX } from 'react';
import type { DocsActionOperation, DocsActionResult, DocsCustomBlock, DocsHostAdapter, DocsHostAttachment, DocsHostTreeNode } from '../lib/host.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const SHARED_REGEX = /[?#]/;

/** A local page supplied by a repository or static site build. */
export type DocsLocalPage = {
	id: string;
	path: string;
	pathname: string;
	title: string;
	markdown: string;
	description?: string;
	contributors?: string[];
	updatedAt?: string;
	attachments?: DocsHostAttachment[];
};

/** Static page, route, theme, and navigation inputs for a local Docs workspace. */
export type DocsLocalWorkspaceProps = {
	tree: DocsHostTreeNode[];
	pages: DocsLocalPage[];
	pathname: string;
	title: string;
	description?: string;
	hue?: number | null;
	rootPath?: string;
	homePath?: string;
	customBlocks?: DocsCustomBlock[];
};
function norm(value: string, base = 'http://docs.local'): string {
	try {
		const url = new URL(value, base);
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return value;
	}
}
function findPage(pages: DocsLocalPage[], value: unknown): DocsLocalPage | undefined {
	if (typeof value !== 'string' || !value) return undefined;
	const route = norm(value);
	const pathOnly = norm(value).split(SHARED_REGEX, 1)[0];
	let hashId = '';
	try {
		const hash = new URL(value, 'http://docs.local').hash.slice(1);
		hashId = hash ? decodeURIComponent(hash) : '';
	} catch {
		// Invalid URLs and escapes do not select a page by hash.
	}
	return pages.find(p => p.id === value || p.id === hashId || p.path === value || norm(p.pathname) === route || norm(p.pathname).split(SHARED_REGEX, 1)[0] === pathOnly);
}
function findTreeNode(nodes: DocsHostTreeNode[], id: string, ancestors: DocsHostTreeNode[] = []): { node: DocsHostTreeNode; ancestors: DocsHostTreeNode[] } | undefined {
	for (const node of nodes) {
		if (node.origName === id) return { node, ancestors };
		const found = node.children ? findTreeNode(node.children, id, [...ancestors, node]) : undefined;
		if (found) return found;
	}
	return undefined;
}
function firstLeaf(nodes: DocsHostTreeNode[]): DocsHostTreeNode | undefined {
	for (const node of nodes) {
		if (node.type === 'leaf') return node;
		const found = firstLeaf(node.children ?? []);
		if (found) return found;
	}
	return undefined;
}

/**
 * Renders repository-owned Markdown in the original Terra Docs workspace.
 * This adapter has no write operations, account dependency, or server requirement.
 *
 * @param tree Navigation tree displayed by the workspace.
 * @param pages Markdown pages available to the local workspace.
 * @param pathname Current URL used to select the active page.
 * @param title Site title displayed in the workspace chrome.
 * @param description Optional site description.
 * @param hue Base hue used to derive the workspace theme.
 * @param rootPath Fallback route used for the home document.
 * @param homePath Optional route used by the home link.
 * @param customBlocks Optional host-defined Portable Text block renderers.
 *
 * @return Read-only Terra Docs workspace element.
 */
export function DocsLocalWorkspace({ tree, pages, pathname, title, description, hue = 145, rootPath = '/', homePath, customBlocks }: DocsLocalWorkspaceProps): JSX.Element {
	const page = findPage(pages, pathname) ?? pages[0];
	const content = useMemo(() => (page ? markdownToDocsValue(page.markdown) : []), [page]);
	const [primary, secondary] = colors(hue);

	// terra-quality-ignore single-use -- Keep the host memo at this hook position so its adapter identity survives renders.
	const host = useMemo<DocsHostAdapter>(() => {
		const aPage = (): DocsLocalPage | undefined => (typeof window === 'undefined' ? page : (findPage(pages, `${window.location.pathname}${window.location.search}${window.location.hash}`) ?? page));
		const resolvePage = (input: unknown): DocsLocalPage | undefined => {
			if (!input || typeof input !== 'object') return undefined;
			const value = input as Record<string, unknown>;
			const direct = findPage(pages, value.path) ?? findPage(pages, value.pathname) ?? findPage(pages, value.id);
			if (direct) return direct;
			const requested = [value.path, value.pathname, value.id].find(candidate => typeof candidate === 'string' && candidate.length > 0);
			if (typeof requested !== 'string') return aPage();
			const basename = requested.split(SHARED_REGEX, 1)[0]?.split('/').filter(Boolean).at(-1);
			const a = aPage();
			if (basename && a?.path.split('/').at(-1) === basename) return a;
			const matches = pages.filter(candidate => candidate.path.split('/').at(-1) === basename || candidate.id === basename);
			return matches.length === 1 ? matches[0] : undefined;
		};
		return {
			capabilities: {
				read: true,
				write: false,
				reorder: false,
				attachments: false,
				export: true,
				history: false,
				publish: false,
			},
			rootPath,
			...(homePath ? { homePath } : {}),
			siteTitle: title,
			...(description ? { siteDescription: description } : {}),
			assetUrl: () => undefined,
			resolveRoute(value) {
				const resolved = findPage(pages, value) ?? pages[0];
				const branches = (resolved ? findTreeNode(tree, resolved.id) : undefined)?.ancestors.filter(node => node.type === 'branch') ?? [];
				return {
					sectionId: branches[0]?.origName ?? tree[0]?.origName ?? 'index',
					...(branches[1] ? { groupId: branches[1].origName } : {}),
					...(resolved ? { leafId: resolved.id } : {}),
					targetId: resolved?.id ?? tree[0]?.origName ?? 'index',
					pathname: resolved?.pathname ?? norm(value),
				};
			},
			buildRoute(sectionId, groupId, leafId) {
				const leaf = leafId ? findTreeNode(tree, leafId)?.node : undefined;
				if (leaf?.url) return leaf.url;
				return firstLeaf((groupId ? findTreeNode(tree, groupId)?.node : undefined)?.children ?? findTreeNode(tree, sectionId)?.node?.children ?? tree)?.url ?? rootPath;
			},
			routePath(path) {
				return findPage(pages, path)?.pathname ?? rootPath;
			},
			async invoke<T = unknown>(op: DocsActionOperation, input?: unknown): Promise<DocsActionResult<T>> {
				const args = (input ?? {}) as Record<string, unknown>;
				if (op === 'read.doc.list') return { data: tree as T };
				if (op === 'read.doc.get') {
					const document = resolvePage(args);
					return {
						data: (document
							? {
									...document,
									source: document.markdown,
									content: markdownToDocsValue(document.markdown),
								}
							: null) as T,
					};
				}
				if (op === 'read.doc.attachments') {
					return {
						data: ((resolvePage(args) ?? aPage())?.attachments ?? []).map(attachment => ({
							...attachment,
							title: attachment.name,
							isMd: false,
						})) as T,
					};
				}
				if (op === 'read.source.body') return { data: markdownToDocsValue(String(args.source ?? '')) as T };
				if (op === 'read.util.pathname') return { data: String(args.path ?? pathname) as T };
				if (op === 'read.util.node') {
					const document = resolvePage(args);
					return {
						data: (document ? { origName: document.id, title: document.title, path: document.path } : null) as T,
					};
				}
				if (op === 'read.tsdocs') return { data: { scopes: [] } as T };
				if (op === 'read.asset.get') {
					const response = await fetch(String(args.path ?? args.id ?? ''));
					if (!response.ok) return { error: new Error(`Unable to read local attachment (${response.status}).`) };
					return { data: (await response.arrayBuffer()) as T };
				}
				return { data: null as T };
			},
		} satisfies DocsHostAdapter;
	}, [description, homePath, pages, pathname, rootPath, title, tree]);
	return (
		<div
			style={
				{
					...Object.fromEntries(primary.light.map((v, i) => ['--primary-' + (i + 1), v])),
					...Object.fromEntries(secondary.light.map((v, i) => ['--secondary-' + (i + 1), v])),
					'--background': primary.light[0],
					'--ring': primary.light[7],
				} as CSSProperties
			}
		>
			<TerraDocsWorkspace
				host={host}
				tree={tree}
				pathname={pathname}
				permission='read'
				title={page?.title ?? title}
				{...(page?.path ? { path: page.path } : {})}
				{...(page?.description ? { description: page.description } : {})}
				{...(page?.contributors ? { contributors: page.contributors } : {})}
				{...(page?.updatedAt ? { updatedAt: page.updatedAt } : {})}
				{...(page ? { source: page.markdown, content } : { content })}
				{...(customBlocks ? { customBlocks } : {})}
			/>
		</div>
	);
}

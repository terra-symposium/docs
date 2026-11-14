/**
 * src/components/StaticWorkspace.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors } from '@terra-symposium/styling';
import { markdownToDocsValue } from '../lib/markdown-model.js';

// COMPONENTS
import { TerraDocsWorkspace } from './terra/Workspace.js';

// TYPES
import type { CSSProperties, JSX, ReactNode } from 'react';
import type { DocsAttachment, DocsLeaf, DocsSection } from '../lib/workspace-types.js';
import type { DocsHostAdapter, DocsHostAttachment, DocsHostTreeNode } from '../lib/host.js';
import type { DocsNavNode } from './navigation.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const SHARED_REGEX = /\/$/;
const G_REGEX = () => /^\/+|\/+$/g;

const slug = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'index';
const routeKey = (value: string): string => {
	try {
		const url = new URL(value, 'http://terra-docs.local');
		return `${url.pathname.replace(SHARED_REGEX, '') || '/'}${url.hash}`;
	} catch {
		return value;
	}
};
const storageKey = (value: string): string => {
	try {
		const url = new URL(value, 'http://terra-docs.local');
		return (url.pathname.replace(G_REGEX(), '') || 'index.mdx') + url.hash;
	} catch {
		return value.replace(G_REGEX(), '') || 'index.mdx';
	}
};
const toLeaf = (node: DocsNavNode): DocsLeaf | null =>
	node.href
		? {
				...(node.id ? { id: node.id } : {}),
				...(node.path ? { path: node.path } : {}),
				title: node.title,
				href: node.href,
				...(node.description ? { description: node.description } : {}),
				...(node.updatedAt ? { updatedAt: node.updatedAt } : {}),
				...(node.attachments ? { attachments: node.attachments } : {}),
			}
		: null;

/**
 * Adapts a host's local Markdown pages to the original, read-only Terra Docs workspace.
 *
 * @param title Name of the Docs site shown in the workspace chrome.
 * @param homeHref Link target for the home navigation action.
 * @param description Optional site description shown by the workspace.
 * @param pageTitle Optional title for the currently selected page.
 * @param hue Base color hue used to derive the workspace theme.
 * @param nodes Flat or nested navigation nodes used when sections are omitted.
 * @param sections Pre-grouped navigation sections for the workspace.
 * @param currentPath Current page URL used to select its content and navigation state.
 * @param rootPath Fallback path used for the home document.
 * @param markdown Markdown source used when structured content is not provided.
 * @param content Structured Docs content for the selected page.
 * @param attachments Attachments shown with the selected page when it has none of its own.
 * @param updatedAt Last update timestamp supplied for the selected page.
 * @param renderContent Optional host-rendered content displayed in the workspace.
 *
 * @return A read-only Terra Docs workspace element.
 */
export function DocsStaticWorkspace({
	title,
	homeHref = '/',
	description,
	pageTitle,
	hue = 145,
	nodes = [],
	sections,
	currentPath,
	rootPath = '/',
	markdown = '',
	content,
	attachments = [],
	updatedAt,
	renderContent,
}: {
	title: string;
	homeHref?: string;
	description?: string;
	pageTitle?: string;
	hue?: number | null;
	nodes?: DocsNavNode[];
	sections?: DocsSection[];
	currentPath: string;
	rootPath?: string;
	markdown?: string;
	content?: unknown;
	attachments?: DocsAttachment[];
	updatedAt?: string;
	renderContent?: ReactNode;
}): JSX.Element {
	const workspaceSections: DocsSection[] =
		sections ??
		nodes.map(s => {
			const children = s.children ?? [];
			return {
				...(s.id ? { id: s.id } : {}),
				...(s.path ? { path: s.path } : {}),
				title: s.title,
				groups: children.some(node => Boolean(node.children?.length))
					? children.map(group => ({
							...(group.id ? { id: group.id } : {}),
							...(group.path ? { path: group.path } : {}),
							title: group.title,
							leaves: (group.children ?? []).map(toLeaf).filter((leaf): leaf is DocsLeaf => leaf !== null),
						}))
					: [
							{
								title: s.title,
								leaves: (children.length ? children : [s]).map(toLeaf).filter((leaf): leaf is DocsLeaf => leaf !== null),
							},
						],
			};
		});
	const [accent, neutral] = colors(hue);
	const currentKey = routeKey(currentPath);
	const allLeaves = workspaceSections.flatMap((s, v) =>
		s.groups.flatMap((group, groupIndex) =>
			group.leaves.map((leaf, leafIndex) => ({
				section: s,
				group,
				leaf,
				sectionIndex: v,
				groupIndex,
				leafIndex,
			})),
		),
	);
	const a = allLeaves.find(i => routeKey(i.leaf.href) === currentKey) ?? allLeaves.find(i => routeKey(i.leaf.href) === routeKey(rootPath)) ?? allLeaves[0];
	const docContent = Array.isArray(content) ? content : markdownToDocsValue(markdown);
	const tree: DocsHostTreeNode[] = workspaceSections.map(s => {
		const sectionId = s.id ?? slug(s.title);
		return {
			type: 'branch',
			origName: sectionId,
			title: s.title,
			path: s.path ?? sectionId,
			url: s.groups[0]?.leaves[0]?.href ?? rootPath,
			permission: 'read',
			children: s.groups.map(group => {
				const groupKey = `${sectionId}/${group.id ?? slug(group.title)}`;
				return {
					type: 'branch',
					origName: group.id ?? groupKey,
					title: group.title,
					path: group.path ?? groupKey,
					permission: 'read',
					children: group.leaves.map(leaf => ({
						type: 'leaf',
						origName: leaf.id ?? `${groupKey}/${slug(leaf.title)}`,
						title: leaf.title,
						path: leaf.path ?? storageKey(leaf.href),
						url: leaf.href,
						permission: 'read',
						...(leaf.description ? { description: leaf.description } : {}),
						...(leaf.updatedAt ? { updatedAt: leaf.updatedAt } : {}),
					})),
				};
			}),
		};
	});
	// terra-quality-ignore single-use -- Snapshot attachments during render so later host reads use this render's document data.
	const hostAttachments: DocsHostAttachment[] = (a?.leaf.attachments ?? attachments).map((i, v) => ({
		id: String(v),
		name: i.title,
		path: i.href,
		...(i.type ? { type: i.type } : {}),
		...(i.size !== undefined ? { size: i.size } : {}),
	}));
	return (
		<div
			style={
				{
					...Object.fromEntries(accent.light.map((v, i) => [`--primary-${i + 1}`, v])),
					...Object.fromEntries(neutral.light.map((v, i) => [`--secondary-${i + 1}`, v])),
					'--background': accent.light[0],
					'--ring': accent.light[7],
				} as CSSProperties
			}
		>
			<TerraDocsWorkspace
				host={
					{
						capabilities: {
							read: true,
							write: false,
							reorder: false,
							attachments: false,
							export: false,
							history: false,
							publish: false,
						},
						rootPath,
						homePath: homeHref,
						siteTitle: title,
						...(description ? { siteDescription: description } : {}),
						buildRoute(sectionId, groupId, leafId) {
							return (
								allLeaves.find(
									i =>
										(i.section.id ?? slug(i.section.title)) === sectionId &&
										(groupId === undefined || (i.group.id ?? slug(i.group.title)) === groupId) &&
										(leafId === undefined || (i.leaf.id ?? slug(i.leaf.title)) === leafId),
								)?.leaf.href ?? rootPath
							);
						},
						resolveRoute(value) {
							const match = allLeaves.find(i => routeKey(i.leaf.href) === routeKey(value)) ?? a;
							return {
								sectionId: match?.section.id ?? slug(match?.section.title ?? 'index'),
								groupId: match?.group.id ?? slug(match?.group.title ?? 'index'),
								leafId: match?.leaf.id ?? slug(match?.leaf.title ?? 'index'),
								targetId: match?.leaf.id ?? slug(match?.leaf.title ?? 'index'),
								pathname: match?.leaf.href ?? rootPath,
							};
						},
						routePath(path) {
							if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('/')) return path;
							return `${rootPath.replace(SHARED_REGEX, '')}/${path}`;
						},
						async invoke<T = unknown>(op: import('../lib/host.js').DocsActionOperation, input?: unknown): Promise<{ data?: T; error?: unknown }> {
							let data: unknown;
							if (op === 'read.doc.list') {
								const request = input as { type?: string; path?: string } | undefined;
								if (request?.type === 'nav') data = tree;
								else if (request?.type === 'folderEntries') {
									const folder = (request.path ?? '').replace(G_REGEX(), '');
									data = allLeaves.filter(i => !folder || (i.leaf.path ?? i.leaf.href).replace(/^\/+/, '').startsWith(`${folder}/`)).map(i => i.leaf.path ?? i.leaf.href);
								} else data = [];
							} else if (op === 'read.doc.get') {
								const selected =
									(() => {
										const path = (input as { path?: string } | undefined)?.path;
										if (!path) return a?.leaf;
										const requestedRoute = routeKey(path);
										const requestedStoragePath = storageKey(path);
										return allLeaves.find(i => routeKey(i.leaf.href) === requestedRoute || storageKey(i.leaf.path ?? i.leaf.href) === requestedStoragePath)?.leaf;
									})() ?? a?.leaf;
								if (selected && typeof window !== 'undefined' && routeKey(selected.href) !== routeKey(currentPath)) {
									window.location.assign(selected.href);
								}
								data = selected
									? {
											path: selected.path ?? selected.href,
											pathname: selected.href,
											title: selected.title,
											description: selected.description,
											updatedAt: selected.updatedAt ?? updatedAt,
											source: markdown,
											content: docContent,
										}
									: null;
							} else if (op === 'read.doc.attachments') {
								data = hostAttachments;
							} else if (op === 'read.util.pathname') {
								data = currentPath;
							} else if (op === 'read.util.node') {
								data = {
									title: a?.leaf.title ?? pageTitle ?? title,
									origName: slug(a?.leaf.title ?? pageTitle ?? title),
								};
							} else if (op === 'read.tsdocs') {
								data = { scopes: [] };
							} else if (op === 'read.asset.get') {
								data = new ArrayBuffer(0);
							} else {
								return { error: new Error(`The local Docs provider does not implement ${op}.`) };
							}
							return { data: data as T };
						},
					} satisfies DocsHostAdapter
				}
				tree={tree}
				pathname={currentPath}
				permission='read'
				path={a?.leaf.path ?? a?.leaf.href ?? currentPath}
				title={pageTitle ?? a?.leaf.title ?? title}
				{...(a?.leaf.description ? { description: a.leaf.description } : {})}
				{...((a?.leaf.updatedAt ?? updatedAt) ? { updatedAt: a?.leaf.updatedAt ?? updatedAt } : {})}
				source={markdown}
				content={docContent}
				{...(renderContent !== undefined ? { renderContent } : {})}
			/>
		</div>
	);
}

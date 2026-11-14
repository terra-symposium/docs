/**
 * src/components/workspace-demo-fixture.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { docsValueToMarkdown, markdownToDocsValue } from '../lib/markdown-model.js';

// TYPES
import type { DocVer } from '../lib/terra/runtime/types.js';
import type { DocsActionOperation, DocsActionResult, DocsHostAdapter, DocsHostAttachment, DocsHostTreeNode } from '../lib/host.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const G_REGEX = () => /^\/+|\/+$/g;
const MD_MDX_I_REGEX = /\.(?:md|mdx)$/i;
const WORKSPACE_DEMO_STORAGE_KEY = 'terra-docs-workspace-demo-v1';
export const WORKSPACE_DEMO_PATH = '/workspace-demo/';

/** Local browser fixture attachment including its owning document and bytes. */
type WorkspaceDemoAsset = DocsHostAttachment & { bytes: number[]; docId: string };

/** Document record persisted by the standalone workspace demo. */
type WorkspaceDemoDocument = {
	id: string;
	path: string;
	pathname: string;
	title: string;
	description: string;
	contributors: string[];
	updatedAt: string;
	content: unknown[];
	source: string;
	attachments: DocsHostAttachment[];
	versions: DocVer[];
};

/** Versioned tree, documents, and attachments stored by the demo fixture. */
export type WorkspaceDemoState = {
	schema: 1;
	tree: DocsHostTreeNode[];
	documents: Record<string, WorkspaceDemoDocument>;
	assets: Record<string, WorkspaceDemoAsset>;
};
// terra-quality-ignore single-use -- Keep this module-level seed content shared across createWorkspaceDemoSeed calls to preserve fixture reference identity.
const initialContent: unknown[] = [
	{
		_key: 'intro',
		_type: 'block',
		style: 'normal',
		markDefs: [],
		children: [
			{
				_key: 'intro-text',
				_type: 'span',
				marks: [],
				text: 'Salesphere helps sales professionals choose a useful next step in a customer relationship and understand why it matters. This site connects that product intent to the current implementation.',
			},
		],
	},
	{
		_key: 'start-heading',
		_type: 'block',
		style: 'h2',
		markDefs: [],
		children: [{ _key: 'heading-text', _type: 'span', marks: [], text: 'Start with the product' }],
	},
	{
		_key: 'product-copy',
		_type: 'block',
		style: 'normal',
		markDefs: [
			{ _key: 'purpose', _type: 'link', href: '/product/purpose/' },
			{ _key: 'map', _type: 'link', href: '/product/structure/' },
		],
		children: [
			{ _key: 'read', _type: 'span', marks: [], text: 'Read ' },
			{ _key: 'purpose-text', _type: 'span', marks: ['purpose'], text: 'Salesphere’s purpose' },
			{ _key: 'then', _type: 'span', marks: [], text: ' for the larger aim, then use the ' },
			{ _key: 'map-text', _type: 'span', marks: ['map'], text: 'product map' },
			{
				_key: 'rest',
				_type: 'span',
				marks: [],
				text: ' to see how principles, intelligence, work surfaces, reflection, and platform capabilities fit together.',
			},
		],
	},
	{
		_key: 'implementation-heading',
		_type: 'block',
		style: 'h2',
		markDefs: [],
		children: [{ _key: 'implementation-title', _type: 'span', marks: [], text: 'Find the implementation' }],
	},
	{
		_key: 'runtime',
		_type: 'block',
		style: 'normal',
		markDefs: [],
		children: [
			{
				_key: 'runtime-copy',
				_type: 'span',
				marks: [],
				text: 'Runtime system map follows a request through the Astro app.',
			},
		],
	},
];
// terra-quality-ignore single-use -- Keep this module-level seed tree shared across createWorkspaceDemoSeed calls to preserve fixture reference identity.
const initialTree: DocsHostTreeNode[] = [
	{
		type: 'branch',
		origName: 'overview',
		title: 'Overview',
		path: 'overview',
		hue: 145,
		children: [
			{
				type: 'branch',
				origName: 'start-here',
				title: 'Start here',
				path: 'overview/start-here',
				children: [
					{
						type: 'leaf',
						origName: 'salesphere',
						title: 'Salesphere',
						path: 'overview/start-here/salesphere.mdx',
					},
					{
						type: 'leaf',
						origName: 'runtime-map',
						title: 'Runtime map',
						path: 'overview/start-here/runtime-map.mdx',
					},
				],
			},
		],
	},
	{
		type: 'branch',
		origName: 'configure',
		title: 'Configure',
		path: 'configure',
		hue: 210,
		children: [
			{
				type: 'branch',
				origName: 'providers',
				title: 'Storage providers',
				path: 'configure/providers',
				children: [
					{
						type: 'leaf',
						origName: 'local-files',
						title: 'Local files',
						path: 'configure/providers/local-files.mdx',
					},
				],
			},
		],
	},
];
function makeDocument(id: string, path: string, title: string, description: string, content: unknown[]): WorkspaceDemoDocument {
	return {
		id,
		path,
		pathname: buildWorkspaceRoute('overview', 'start-here', id),
		title,
		description,
		contributors: ['Kai'],
		updatedAt: 'Oct 24, 2026',
		content,
		source: docsValueToMarkdown(content as never),
		attachments: [],
		versions: [],
	};
}

/**
 * Creates the initial Salesphere fixture tree, pages, and sample attachment.
 *
 * @return Seed state used when browser storage is empty or invalid.
 */
export function createWorkspaceDemoSeed(): WorkspaceDemoState {
	const salesphere = makeDocument('salesphere', 'overview/start-here/salesphere.mdx', 'Salesphere', '', initialContent);
	salesphere.attachments.push({
		id: 'overview-brief',
		name: 'Product brief.pdf',
		path: '/assets/product-brief.pdf',
		type: 'application/pdf',
		size: 328_512,
	});
	return {
		schema: 1,
		tree: initialTree,
		documents: {
			salesphere,
			'runtime-map': makeDocument(
				'runtime-map',
				'overview/start-here/runtime-map.mdx',
				'Runtime map',
				'Follow a request through the application.',
				markdownToDocsValue('# Runtime map\n\nThe request enters through the Astro application.'),
			),
			'local-files': makeDocument(
				'local-files',
				'configure/providers/local-files.mdx',
				'Local files',
				'Use repository files as the source of truth.',
				markdownToDocsValue('# Local files\n\nA local provider reads repository-backed pages.'),
			),
		},
		assets: {
			'/assets/product-brief.pdf': {
				id: 'overview-brief',
				name: 'Product brief.pdf',
				path: '/assets/product-brief.pdf',
				type: 'application/pdf',
				size: 22,
				docId: 'salesphere',
				bytes: [37, 80, 68, 70, 45, 49, 46, 55, 10, 37, 68, 79, 67, 83, 10],
			},
		},
	};
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Loads and validates the demo state from local storage, falling back to the seed.
 *
 * @return Valid persisted state or a fresh seed state.
 */
export function readWorkspaceDemoState(): WorkspaceDemoState {
	const seed = createWorkspaceDemoSeed();
	if (typeof window === 'undefined') return seed;
	try {
		const raw = window.localStorage.getItem(WORKSPACE_DEMO_STORAGE_KEY);
		if (!raw) {
			writeWorkspaceDemoState(seed);
			return seed;
		}
		const value = JSON.parse(raw) as Partial<WorkspaceDemoState>;
		if (value.schema !== 1 || !Array.isArray(value.tree) || !value.documents || typeof value.documents !== 'object' || !value.assets || typeof value.assets !== 'object') {
			writeWorkspaceDemoState(seed);
			return seed;
		}
		return value as WorkspaceDemoState;
	} catch {
		writeWorkspaceDemoState(seed);
		return seed;
	}
}

/**
 * Persists demo state and notifies mounted views that the fixture changed.
 *
 * @param state State to serialize in browser storage.
 *
 * @return Nothing.
 */
function writeWorkspaceDemoState(state: WorkspaceDemoState): void {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(WORKSPACE_DEMO_STORAGE_KEY, JSON.stringify(state));
	window.dispatchEvent(new CustomEvent('terra-docs-fixture-updated'));
}

/**
 * Builds a query-based route for a demo section, group, or document.
 *
 * @param sectionId Optional section identifier.
 * @param groupId Optional group identifier within the section.
 * @param leafId Optional document identifier within the group.
 *
 * @return Demo route containing the requested identifiers.
 */
function buildWorkspaceRoute(sectionId?: string, groupId?: string, leafId?: string): string {
	if (!sectionId) return WORKSPACE_DEMO_PATH;
	const query = new URLSearchParams({ section: sectionId });
	if (groupId) query.set('group', groupId);
	if (leafId) query.set('leaf', leafId);
	return `${WORKSPACE_DEMO_PATH}?${query.toString()}`;
}
function findNode(nodes: DocsHostTreeNode[], id: string, ancestors: DocsHostTreeNode[] = []): { node: DocsHostTreeNode; ancestors: DocsHostTreeNode[] } | undefined {
	for (const node of nodes) {
		if (node.origName === id || node.path === id) return { node, ancestors };
		const child = node.children ? findNode(node.children, id, [...ancestors, node]) : undefined;
		if (child) return child;
	}
	return undefined;
}
function withRoutes(nodes: DocsHostTreeNode[], readOnly: boolean, sectionId?: string, groupId?: string): DocsHostTreeNode[] {
	return nodes.map(n => {
		if (n.type === 'branch') {
			const nSection = sectionId ?? n.origName;
			return {
				...n,
				permission: readOnly ? 'read' : 'write',
				url: sectionId ? buildWorkspaceRoute(nSection, n.origName) : buildWorkspaceRoute(nSection),
				children: withRoutes(n.children ?? [], readOnly, nSection, sectionId ? n.origName : undefined),
			};
		}
		return {
			...n,
			permission: readOnly ? 'read' : 'write',
			url: buildWorkspaceRoute(sectionId, groupId, n.origName),
		};
	});
}
function findDocument(state: WorkspaceDemoState, value: unknown): WorkspaceDemoDocument | undefined {
	if (typeof value !== 'string' || !value) return undefined;
	const c = value.split(/[?#]/, 1)[0]?.replace(G_REGEX(), '') ?? value;
	const leafName = c.split('/').at(-1)?.replace(MD_MDX_I_REGEX, '') ?? c;
	return Object.values(state.documents).find(
		d => d.id === value || d.path === value || d.pathname === value || d.path.replace(MD_MDX_I_REGEX, '') === c || d.id === leafName || d.path.endsWith(`/${leafName}.mdx`),
	);
}
function slug(value: string): string {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'untitled'
	);
}
function uniqueId(state: WorkspaceDemoState, proposed: string): string {
	let candidate = slug(proposed);
	let index = 2;
	while (state.documents[candidate] || findNode(state.tree, candidate)) {
		candidate = `${slug(proposed)}-${index}`;
		index += 1;
	}
	return candidate;
}
function withCurrentRoutes(state: WorkspaceDemoState, readOnly: boolean): DocsHostTreeNode[] {
	return withRoutes(state.tree, readOnly);
}
function sectionForLeaf(state: WorkspaceDemoState, leafId: string): { sectionId: string; groupId?: string } {
	const branches = (findNode(state.tree, leafId)?.ancestors ?? []).filter(n => n.type === 'branch');
	return {
		sectionId: branches[0]?.origName ?? state.tree[0]?.origName ?? 'overview',
		...(branches[1] ? { groupId: branches[1].origName } : {}),
	};
}
function removeNodeById(nodes: DocsHostTreeNode[], id: string): boolean {
	const index = nodes.findIndex(n => n.origName === id || n.path === id);
	if (index >= 0) {
		nodes.splice(index, 1);
		return true;
	}
	for (const node of nodes) {
		if (node.children && removeNodeById(node.children, id)) return true;
	}
	return false;
}
function updateNodeById(nodes: DocsHostTreeNode[], id: string, update: (node: DocsHostTreeNode) => DocsHostTreeNode): boolean {
	for (let index = 0; index < nodes.length; index += 1) {
		const node = nodes[index];
		if (!node) continue;
		if (node.origName === id || node.path === id) {
			nodes[index] = update(node);
			return true;
		}
		if (node.children && updateNodeById(node.children, id, update)) return true;
	}
	return false;
}
function removeDocumentsForNode(state: WorkspaceDemoState, node: DocsHostTreeNode): void {
	if (node.type === 'leaf') {
		delete state.documents[node.origName];
		return;
	}
	for (const child of node.children ?? []) removeDocumentsForNode(state, child);
}
// terra-quality-ignore single-use -- Keep the exported createWorkspaceDemoHost callable API available to external consumers; its one local reference does not replace that contract.
/**
 * Creates a Docs host adapter backed by the local demo fixture.
 *
 * @param readOnly Whether the adapter should disable fixture mutations.
 *
 * @return Host adapter implementing demo navigation, documents, and attachments.
 */
export function createWorkspaceDemoHost(readOnly = false): DocsHostAdapter {
	return {
		capabilities: {
			read: true,
			write: !readOnly,
			reorder: !readOnly,
			attachments: !readOnly,
			export: true,
			history: !readOnly,
			publish: false,
		},
		rootPath: WORKSPACE_DEMO_PATH,
		homePath: WORKSPACE_DEMO_PATH,
		siteTitle: 'Salesphere Docs',
		siteDescription: 'Product and engineering documentation.',
		assetUrl: () => undefined,
		resolveRoute(value) {
			const url = new URL(value, 'http://localhost');
			const state = readWorkspaceDemoState();
			const requestedLeaf = url.searchParams.get('leaf');
			const requestedSection = url.searchParams.get('section');
			const requestedGroup = url.searchParams.get('group');
			const firstLeaf = (node: DocsHostTreeNode | undefined): WorkspaceDemoDocument | undefined => {
				if (!node) return undefined;
				if (node.type === 'leaf') return state.documents[node.origName];
				for (const child of node.children ?? []) {
					const found = firstLeaf(child);
					if (found) return found;
				}
				return undefined;
			};
			const document =
				(requestedLeaf ? findDocument(state, requestedLeaf) : undefined) ??
				firstLeaf(requestedGroup ? findNode(state.tree, requestedGroup)?.node : requestedSection ? findNode(state.tree, requestedSection)?.node : undefined) ??
				state.documents.salesphere ??
				Object.values(state.documents)[0];
			const position = document ? sectionForLeaf(state, document.id) : { sectionId: 'overview' };
			const sectionId = position.sectionId;
			const groupId = position.groupId;
			const leafId = document?.id;
			return {
				sectionId,
				...(groupId ? { groupId } : {}),
				...(leafId ? { leafId } : {}),
				targetId: leafId ?? groupId ?? sectionId,
				pathname: `${url.pathname}${url.search}${url.hash}`,
			};
		},
		buildRoute: buildWorkspaceRoute,
		routePath(value) {
			const state = readWorkspaceDemoState();
			const requested = value.replace(G_REGEX(), '');
			const document = findDocument(state, requested) ?? findDocument(state, requested.split('/').at(-1));
			if (document) {
				const { sectionId, groupId } = sectionForLeaf(state, document.id);
				return buildWorkspaceRoute(sectionId, groupId, document.id);
			}
			const branch = findNode(state.tree, requested)?.node;
			if (branch?.type === 'branch') {
				const parent = findNode(state.tree, branch.origName)?.ancestors.filter(n => n.type === 'branch') ?? [];
				return parent.length > 0 ? buildWorkspaceRoute(parent[0]?.origName, branch.origName) : buildWorkspaceRoute(branch.origName);
			}
			return WORKSPACE_DEMO_PATH;
		},
		isDevelopmentOrigin: o => /^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?$/u.test(o),
		async invoke<T = unknown>(op: DocsActionOperation, input?: unknown): Promise<DocsActionResult<T>> {
			if (typeof window !== 'undefined') {
				const browserWindow = window as Window & {
					__terraDocsActionCalls?: Array<{ operation: string; input?: unknown }>;
				};
				browserWindow.__terraDocsActionCalls ??= [];
				browserWindow.__terraDocsActionCalls.push({ operation: op, input: clone(input) });
			}
			const request = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
			const state = readWorkspaceDemoState();
			let data: unknown = null;
			let changed = false;
			if (op === 'read.doc.list') data = request.type === 'nav' ? withCurrentRoutes(state, readOnly) : [];
			else if (op === 'read.doc.get') {
				data = clone(findDocument(state, request.path ?? request.id) ?? null);
			} else if (op === 'read.doc.attachments') {
				data = clone(findDocument(state, request.path)?.attachments ?? []);
			} else if (op === 'read.asset.get') {
				data = new Uint8Array(state.assets[String(request.path ?? '')]?.bytes ?? []).buffer;
			} else if (op === 'read.doc.resolvePath') {
				const title = typeof request.title === 'string' ? request.title : 'Untitled';
				const parent = typeof request.path === 'string' ? request.path.replace(G_REGEX(), '') : '';
				const base = parent ? `${parent}/` : '';
				let path = `${base}${slug(title)}.mdx`;
				let suffix = 2;
				while (findDocument(state, path)) {
					path = `${base}${slug(title)}-${suffix}.mdx`;
					suffix += 1;
				}
				data = { path, dir: parent || '.' };
			} else if (op === 'read.util.pathname') {
				data = findDocument(state, request.path)?.pathname ?? WORKSPACE_DEMO_PATH;
			} else if (op === 'read.util.node') {
				if (request.op === 'name') data = slug(String(request.val ?? 'untitled'));
				else {
					const found = findNode(state.tree, String(request.val ?? request.path ?? ''))?.node;
					data = found ? { title: found.title, origName: found.origName, type: found.type } : {};
				}
			} else if (op === 'read.source.body') {
				data = markdownToDocsValue(typeof request.source === 'string' ? request.source : '');
			} else if (op === 'read.tsdocs') {
				data = { docs: [], scopes: [] };
			} else if (op === 'write.doc.createSection') {
				const title = String(request.title ?? 'Untitled Section');
				const sectionId = uniqueId(state, title);
				const groupId = `${sectionId}-general`;
				const leafId = `${sectionId}-untitled`;
				const sectionPath = slug(title);
				const group: DocsHostTreeNode = {
					type: 'branch',
					origName: groupId,
					title: 'General',
					path: `${sectionPath}/general`,
					children: [],
				};
				const newDocument = makeDocument(leafId, `${sectionPath}/general/untitled.mdx`, 'Untitled', '', []);
				newDocument.pathname = buildWorkspaceRoute(sectionId, groupId, leafId);
				state.tree.push({
					type: 'branch',
					origName: sectionId,
					title,
					path: sectionPath,
					hue: 165,
					firstLeafUrl: buildWorkspaceRoute(sectionId, groupId, leafId),
					children: [group],
				});
				state.documents[leafId] = newDocument;
				group.children?.push({
					type: 'leaf',
					origName: leafId,
					title: 'Untitled',
					path: newDocument.path,
					permission: readOnly ? 'read' : 'write',
				});
				data = { _id: sectionId, title };
				changed = true;
			} else if (op === 'write.doc.createGroup') {
				const title = String(request.title ?? 'Untitled Group');
				const groupId = uniqueId(state, title);
				const sectionId = String(request.sectionId ?? 'overview');
				const section = findNode(state.tree, sectionId)?.node;
				if (section?.type === 'branch') {
					section.children ??= [];
					section.children.push({
						type: 'branch',
						origName: groupId,
						title,
						path: `${String(section.path ?? sectionId)}/${groupId}`,
						children: [],
					});
					data = { _id: groupId, title };
					changed = true;
				}
			} else if (op === 'write.doc.editor' && typeof request.path === 'string' && findNode(state.tree, request.path)?.node.type === 'branch') {
				const branch = findNode(state.tree, String(request.path))?.node;
				if (branch) {
					branch.title = String(request.title ?? branch.title ?? branch.origName);
					data = { _id: branch.origName, title: branch.title };
					changed = true;
				}
			} else if (op === 'write.doc.editor' || op === 'write.doc.save') {
				const path = String(request.path ?? 'overview/start-here/untitled.mdx');
				const existing = findDocument(state, path);
				const rawId = path.split('/').at(-1)?.replace(MD_MDX_I_REGEX, '') ?? 'untitled';
				const id = existing?.id ?? uniqueId(state, rawId);
				const source = typeof request.source === 'string' ? request.source : undefined;
				const content = Array.isArray(request.content) ? clone(request.content) : source !== undefined ? markdownToDocsValue(source) : clone(existing?.content ?? []);
				if (op === 'write.doc.save' && existing) {
					existing.versions.unshift({
						contentJson: JSON.stringify(existing.content),
						body: clone(existing.content) as never,
						description: existing.description,
						title: existing.title,
						savedAt: new Date().toISOString(),
					});
				}
				const newDocument: WorkspaceDemoDocument = {
					...(existing ?? makeDocument(id, path, String(request.title ?? rawId), '', content)),
					id,
					path,
					title: typeof request.title === 'string' ? request.title : (existing?.title ?? rawId),
					description: typeof request.description === 'string' ? request.description : (existing?.description ?? ''),
					content,
					source: source ?? docsValueToMarkdown(content as never),
					updatedAt: new Date().toISOString(),
				};
				const newPosition = (existing ? sectionForLeaf(state, existing.id) : undefined) ?? { sectionId: 'overview', groupId: 'start-here' };
				newDocument.pathname = buildWorkspaceRoute(newPosition.sectionId, newPosition.groupId, id);
				state.documents[id] = newDocument;
				if (!existing) {
					const node: DocsHostTreeNode = {
						type: 'leaf',
						origName: newDocument.id,
						title: newDocument.title,
						description: newDocument.description,
						path: newDocument.path,
						permission: 'write',
					};
					const parent = findNode(state.tree, String(request.parentId ?? 'start-here'))?.node;
					if (parent?.type === 'branch') {
						parent.children ??= [];
						if (!parent.children.some(c => c.type === 'leaf' && c.origName === newDocument.id)) parent.children.push(node);
					} else {
						const group = state.tree[0]?.children?.find(c => c.type === 'branch');
						if (group) group.children = [...(group.children ?? []), node];
					}
				}
				updateNodeById(state.tree, existing?.id ?? id, n => ({
					...n,
					origName: id,
					path,
					title: newDocument.title,
					description: newDocument.description,
				}));
				data = clone(newDocument);
				changed = true;
			} else if (op === 'write.doc.retitle') {
				const id = String(request.id ?? '');
				const title = String(request.title ?? 'Untitled');
				const document = findDocument(state, id);
				if (document) {
					document.title = title;
					document.updatedAt = new Date().toISOString();
				}
				updateNodeById(state.tree, id, n => ({ ...n, title }));
				changed = true;
			} else if (op === 'write.doc.hue') {
				updateNodeById(state.tree, String(request.id ?? ''), n => ({ ...n, hue: Number(request.hue) }));
				changed = true;
			} else if (op === 'write.doc.reorder') {
				const field = request.field === 'leaves' ? 'leaf' : 'branch';
				const parent = findNode(state.tree, typeof request.id === 'string' ? request.id : '')?.node;
				if (parent?.type === 'branch') {
					const reorderable = parent.children?.filter(n => n.type === field) ?? [];
					const ordered = (Array.isArray(request.items) ? request.items : [])
						.map(i => (i && typeof i === 'object' && '_ref' in i && typeof i._ref === 'string' ? i._ref : ''))
						.filter(Boolean)
						.map(r => reorderable.find(node => node.origName === r || node.path === r))
						.filter((n): n is DocsHostTreeNode => Boolean(n));
					const orderedIds = new Set(ordered.map(n => n.origName));
					parent.children = [...ordered, ...reorderable.filter(n => !orderedIds.has(n.origName)), ...(parent.children?.filter(n => n.type !== field) ?? [])];
				}
				changed = true;
			} else if (op === 'write.doc.rm') {
				const path = String(request.path ?? '');
				const document = findDocument(state, path);
				if (document) {
					delete state.documents[document.id];
					for (const [assetPath, asset] of Object.entries(state.assets)) {
						if (asset.docId === document.id) delete state.assets[assetPath];
					}
					removeNodeById(state.tree, document.id);
				} else {
					let found = findNode(state.tree, path);
					if (!found && path.includes('?')) {
						const route = new URL(path, 'http://localhost');
						const routeNodeId = route.searchParams.get('group') ?? route.searchParams.get('section');
						if (routeNodeId) found = findNode(state.tree, routeNodeId);
					}
					if (found) {
						removeDocumentsForNode(state, found.node);
						removeNodeById(state.tree, found.node.origName);
					}
				}
				data = null;
				changed = true;
			} else if (op === 'write.doc.commit') {
				const currentPath = String(request.cur ?? '');
				const nPath = String(request.next ?? currentPath);
				const document = findDocument(state, currentPath);
				if (document) {
					const priorId = document.id;
					const nId = nPath.split('/').at(-1)?.replace(MD_MDX_I_REGEX, '') ?? priorId;
					delete state.documents[priorId];
					document.id = nId;
					document.path = nPath;
					if (typeof request.title === 'string') document.title = request.title;
					if (typeof request.source === 'string') {
						document.source = request.source;
						document.content = markdownToDocsValue(request.source);
					}
					state.documents[nId] = document;
					const position = sectionForLeaf(state, priorId);
					document.pathname = buildWorkspaceRoute(position.sectionId, position.groupId, nId);
					updateNodeById(state.tree, priorId, n => ({
						...n,
						origName: nId,
						path: nPath,
						title: document.title,
					}));
					data = clone(document);
					changed = true;
				}
			} else if (op === 'write.doc.versions.get') {
				data = clone(findDocument(state, request.path)?.versions ?? []);
			} else if (op === 'write.asset.upload') {
				const form = input instanceof FormData ? input : null;
				const uploaded = form?.get('file');
				const file = uploaded instanceof Blob ? uploaded : null;
				if (file) {
					const fileName = uploaded instanceof File ? uploaded.name : 'attachment.bin';
					const id = `attachment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
					const path = `/assets/${id}/${fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
					// terra-quality-ignore single-use -- Resolve the owning document before awaiting file bytes so concurrent fixture updates cannot change attachment ownership.
					const doc = findDocument(state, String(form?.get('path') ?? ''));
					const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
					const asset: WorkspaceDemoAsset = {
						id,
						name: fileName,
						path,
						type: file.type || 'application/octet-stream',
						size: file.size,
						bytes,
						docId: doc?.id ?? 'salesphere',
					};
					state.assets[path] = asset;
					const owner = state.documents[asset.docId];
					if (owner)
						owner.attachments.push({
							id,
							name: fileName,
							path,
							type: asset.type || 'application/octet-stream',
							size: asset.size ?? bytes.length,
						} satisfies DocsHostAttachment);
					data = { path, name: fileName, compressedSize: bytes.length };
					changed = true;
				}
			} else if (op === 'write.attachment.rm') {
				const document = findDocument(state, request.docPath);
				const attachmentId = String(request.attachmentKey ?? '');
				const attachment = document?.attachments.find(i => i.id === attachmentId);
				if (document) document.attachments = document.attachments.filter(i => i.id !== attachmentId);
				if (attachment) delete state.assets[attachment.path];
				changed = true;
			} else if (op === 'write.attachment.rename') {
				const attachmentId = String(request.attachmentKey ?? '');
				const title = String(request.name ?? request.title ?? 'attachment');
				const attachment = findDocument(state, request.docPath)?.attachments.find(i => i.id === attachmentId);
				if (attachment) attachment.name = title;
				const asset = attachment ? state.assets[attachment.path] : undefined;
				if (asset) asset.name = title;
				changed = true;
			} else if (op === 'write.asset.delete') {
				const path = String(request.url ?? request.path ?? '');
				const asset = state.assets[path];
				if (asset) {
					delete state.assets[path];
					const owner = state.documents[asset.docId];
					if (owner) owner.attachments = owner.attachments.filter(i => i.id !== asset.id);
				}
				changed = true;
			}
			if (changed) writeWorkspaceDemoState(state);
			return { data: data as T };
		},
	};
}

/**
 * Adds demo route URLs and permission state to the fixture navigation tree.
 *
 * @param state Current workspace fixture state.
 * @param readOnly Whether generated nodes should expose read-only permissions.
 *
 * @return Tree nodes with routes and effective permissions applied.
 */
export function routedWorkspaceTree(state: WorkspaceDemoState, readOnly: boolean): DocsHostTreeNode[] {
	return withCurrentRoutes(state, readOnly);
}

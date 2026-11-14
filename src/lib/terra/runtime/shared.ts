/**
 * src/lib/terra/runtime/shared.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { getDocsHostAdapter } from '../../host-runtime.js';

// TYPES
import type { Tree } from './types.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const SHARED_REGEX = /^\/+/;
const SHARED_CLASS_2_3 = /\/+$/;
export const FILES = { index: /^(?:\/|^)index\.(?:md|mdx)$/i, markdown: /\.(?:md|mdx)$/i } as const;
export const REORDER = {
	active: 'bg-primary-3 text-primary-12 ring-1 ring-primary-7',
	after: 'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary-9',
	before: 'before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:rounded-full before:bg-primary-9',
	handle: 'size-6 shrink-0 cursor-grab transition-opacity focus-visible:opacity-100 active:cursor-grabbing',
} as const;
export const IMAGE_TYPES: Record<string, string> = { 'image/avif': '.avif', 'image/gif': '.gif', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/svg+xml': '.svg', 'image/webp': '.webp' };
export const MIME: Record<string, string> = { ...IMAGE_TYPES, '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/markdown', '.json': 'application/json', '.zip': 'application/zip' };
export const TESTIMONIALS_EXPORT = '';
/**
 * Returns the Docs root path configured by the host, or `/docs` by default.
 *
 * @return Configured Docs root route.
 */
export function docsRootPath(): string {
	return getDocsHostAdapter()?.rootPath ?? '/docs';
}
/**
 * Builds a Docs route through the host adapter or the default root path.
 *
 * @param path Route suffix to append to the Docs root.
 *
 * @return Absolute Docs route.
 */
export function docsPath(path = ''): string {
	const host = getDocsHostAdapter();
	if (host?.routePath) return host.routePath(path);
	const root = docsRootPath().replace(SHARED_CLASS_2_3, '');
	const clean = path.replace(SHARED_REGEX, '');
	if (!clean) return root || '/';
	if (root && (path === root || path.startsWith(`${root}/`))) return path;
	return `${root}/${clean}`;
}
/**
 * Checks whether a pathname belongs to the configured Docs root.
 *
 * @param path Pathname to test.
 *
 * @return Whether the path is the root or a descendant of it.
 */
export function isDocsPath(path: string): boolean {
	const root = docsRootPath().replace(SHARED_CLASS_2_3, '') || '/';
	return root === '/' ? path.startsWith('/') : path === root || path.startsWith(`${root}/`);
}
/**
 * Collects paths from all document leaves in a navigation tree.
 *
 * @param nodes Navigation nodes to traverse.
 *
 * @return Paths associated with leaf nodes.
 */
export function toPaths(nodes: Tree[]): string[] {
	return Array.isArray(nodes) ? nodes.flatMap(n => (n.type === 'leaf' ? (n.path ? [n.path] : []) : toPaths(n.children ?? []))) : [];
}
/**
 * Checks whether a string is an API or HTTP endpoint URL.
 *
 * @param value Candidate endpoint string.
 *
 * @return Whether the value begins with an API path or HTTP scheme.
 */
export function isEndpointVal(value: string): boolean {
	return /^(?:\/api\/|https?:\/\/)/i.test(value.trim());
}
/**
 * Removes leading underscores from a navigation title.
 *
 * @param title Display title to clean.
 *
 * @return Title without leading underscores.
 */
export function toNodeLabel(title: string): string {
	return title?.replace(/^_+/, '') ?? '';
}
/**
 * Returns the parent directory portion of a slash-delimited path.
 *
 * @param path Path to inspect.
 *
 * @return Parent directory or `.` when the path has no directory.
 */
export function dirname(path: string): string {
	const value = path.replace(SHARED_CLASS_2_3, '');
	const index = value.lastIndexOf('/');
	return index < 0 ? '.' : value.slice(0, index) || '/';
}
/**
 * Returns the final path segment, optionally removing a known extension.
 *
 * @param path File or route path to inspect.
 * @param ext Optional suffix to remove from the basename.
 *
 * @return Final path segment without the requested suffix.
 */
export function bName(path: string, ext?: string): string {
	let name = path.replace(SHARED_CLASS_2_3, '').split('/').pop() || '';
	if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
	return name;
}
/**
 * Trims a title, treating a missing title as an empty string.
 *
 * @param title Optional title to trim.
 *
 * @return Trimmed title or an empty string.
 */
export const cTitle = (title?: string): string => (title || '').trim();
// terra-quality-ignore single-use -- Keep the exported toPascal module value available to external consumers; its one local reference does not replace that contract.
/**
 * Converts a hyphenated or underscored label to PascalCase.
 *
 * @param value Label to convert.
 *
 * @return PascalCase identifier.
 */
export const toPascal = (value: string): string => value.replace(/(^|[-_\s])([a-z])/g, (_m, _p, c: string) => c.toUpperCase()).replace(/[-_\s]/g, '');
/**
 * Builds a section, group, and leaf route using host routing when available.
 *
 * @param sectionId Section identifier.
 * @param groupId Optional group identifier within the section.
 * @param leafId Optional document identifier within the group.
 *
 * @return Route to the requested document or the root section.
 */
export function buildRoute(sectionId: string, groupId?: string, leafId?: string): string {
	const hostBuilder = getDocsHostAdapter()?.buildRoute;
	if (hostBuilder) return hostBuilder(sectionId, groupId, leafId);
	return sectionId && sectionId !== 'index' ? docsPath(`${sectionId}${groupId ? `/${groupId}` : ''}${leafId ? `/${leafId}` : ''}`) : docsRootPath();
}
/**
 * Resolves a URL into its Docs section, group, leaf, and canonical path.
 *
 * @param value URL or pathname to resolve.
 *
 * @return Parsed identifiers and the canonical pathname.
 */
export function parseRoute(value: string): { sectionId: string; groupId?: string; leafId?: string; targetId: string; pathname: string } {
	const hostResolver = getDocsHostAdapter()?.resolveRoute;
	if (hostResolver) return hostResolver(value);
	try {
		const root = docsRootPath().replace(SHARED_CLASS_2_3, '') || '/';
		const pathname = new URL(value, 'http://localhost').pathname;
		const parts = (root === '/' ? pathname.replace(/^\//, '') : pathname === root ? '' : pathname.startsWith(`${root}/`) ? pathname.slice(root.length + 1) : pathname.replace(SHARED_REGEX, ''))
			.replace(/\/$/, '')
			.split('/')
			.filter(Boolean)
			.map(p =>
				p
					.replace(/\.draft$/i, '')
					.replace(/index\.(?:html|htm)$/i, '')
					.replace(/\.(?:html|htm)$/i, ''),
			);
		const sectionId = parts[0] || 'index';
		const groupId = parts.length > 2 ? parts[1] : undefined;
		const leafId = parts.length > 1 ? parts[parts.length > 2 ? 2 : 1] : undefined;
		return { sectionId, ...(groupId ? { groupId } : {}), ...(leafId ? { leafId } : {}), targetId: leafId || groupId || sectionId, pathname: buildRoute(sectionId, groupId, leafId) };
	} catch {
		return { sectionId: 'index', targetId: 'index', pathname: docsRootPath() };
	}
}

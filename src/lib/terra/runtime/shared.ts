/**
 * src/lib/terra/runtime/shared.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { getDocsHostAdapter } from '../../host-runtime.js';

// COMPONENTS
import * as TerraQualityRegex from '../regex.mjs';

// TYPES
import type { Tree } from './types.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const SHARED_REGEX = /^\/+/;
export const REORDER = {
  active: 'bg-primary-3 text-primary-12 ring-1 ring-primary-7',
  after:
    'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary-9',
  before:
    'before:absolute before:inset-x-2 before:top-0 before:h-0.5 before:rounded-full before:bg-primary-9',
  handle:
    'size-6 shrink-0 cursor-grab transition-opacity focus-visible:opacity-100 active:cursor-grabbing',
} as const;
export const IMAGE_TYPES: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};
export const MIME: Record<string, string> = {
  ...IMAGE_TYPES,
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.zip': 'application/zip',
};
export const TESTIMONIALS_EXPORT = '';
/**
 * Returns the root route for this Docs host.
 *
 * @return Host-configured root path or the `/docs` fallback.
 */
export function docsRootPath(): string {
  return getDocsHostAdapter()?.rootPath ?? '/docs';
}
/**
 * Removes trailing slash runs from a Docs or repository path.
 *
 * @param path Path to normalize.
 *
 * @return The path without trailing slashes.
 */
export function trimTrailingSlashes(path: string): string {
  return path.replace(TerraQualityRegex.REGEX_PATTERN_REGEX_7(), '');
}
/**
 * Builds a Docs route through the host adapter or the default root path.
 *
 * @param path Optional path beneath the Docs root.
 *
 * @return A route that contains the root exactly once.
 */
export function docsPath(path = ''): string {
  const host = getDocsHostAdapter();
  if (host?.routePath) return host.routePath(path);
  const root = trimTrailingSlashes(docsRootPath());
  const c = path.replace(SHARED_REGEX, '');
  if (!c) return root || '/';
  if (root && (path === root || path.startsWith(`${root}/`))) return path;
  return `${root}/${c}`;
}
/**
 * Checks whether a pathname belongs to the active Docs route tree.
 *
 * @param path Browser pathname or host route to check.
 *
 * @return Whether the path is the Docs root or a descendant route.
 */
export function isDocsPath(path: string): boolean {
  const root = trimTrailingSlashes(docsRootPath()) || '/';
  return root === '/' ? path.startsWith('/') : path === root || path.startsWith(`${root}/`);
}
/**
 * Collects leaf routes from a nested section and group tree.
 *
 * @param nodes Navigation nodes to traverse.
 *
 * @return Paths for leaves with a defined path, in tree order.
 */
export function toPaths(nodes: Tree[]): string[] {
  return Array.isArray(nodes)
    ? nodes.flatMap((n) =>
        n.type === 'leaf' ? (n.path ? [n.path] : []) : toPaths(n.children ?? []),
      )
    : [];
}
/**
 * Recognizes API paths and absolute HTTP(S) URLs used by node content.
 *
 * @param value Candidate endpoint value.
 *
 * @return Whether the trimmed value begins with `/api/`, `http://`, or `https://`.
 */
export function isEndpointVal(value: string): boolean {
  return /^(?:\/api\/|https?:\/\/)/i.test(value.trim());
}
/**
 * Removes leading underscores from a navigation title for display.
 *
 * @param title Source title from a Docs tree node.
 *
 * @return Display label with leading underscores omitted.
 */
export function toNodeLabel(title: string): string {
  return title?.replace(/^_+/, '') ?? '';
}
/**
 * Returns the parent path while preserving the root for top-level paths.
 *
 * @param path Path whose containing directory is needed.
 *
 * @return Parent pathname or `.` when the input has no directory separator.
 */
export function dirname(path: string): string {
  const value = trimTrailingSlashes(path);
  const index = value.lastIndexOf('/');
  return index < 0 ? '.' : value.slice(0, index) || '/';
}
/**
 * Extracts the final path segment and optionally removes its known extension.
 *
 * @param path Path or URL-like pathname.
 * @param ext Exact extension suffix to strip when present.
 *
 * @return Final path segment without the requested suffix.
 */
export function bName(path: string, ext?: string): string {
  let name = trimTrailingSlashes(path).split('/').pop() || '';
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}
/**
 * Trims whitespace around an optional section title.
 *
 * @param title Title text to normalize.
 *
 * @return Trimmed title or an empty string when no title was supplied.
 */
export const cTitle = (title?: string): string => (title || '').trim();
/**
 * Builds a route through the host adapter or the default section/group/leaf scheme.
 *
 * @param sectionId Section identifier, with `index` representing the root.
 * @param groupId Optional group identifier within the section.
 * @param leafId Optional leaf identifier within the group or section.
 *
 * @return The host's canonical route for those identifiers.
 */
export function buildRoute(sectionId: string, groupId?: string, leafId?: string): string {
  const hostBuilder = getDocsHostAdapter()?.buildRoute;
  if (hostBuilder) return hostBuilder(sectionId, groupId, leafId);
  return sectionId && sectionId !== 'index'
    ? docsPath(`${sectionId}${groupId ? `/${groupId}` : ''}${leafId ? `/${leafId}` : ''}`)
    : docsRootPath();
}
/**
 * Resolves a URL or pathname to Docs navigation identifiers.
 *
 * @param value Route or URL entered by the caller.
 *
 * @return Section, optional group and leaf, target id, and canonical pathname.
 */
export function parseRoute(value: string): {
  sectionId: string;
  groupId?: string;
  leafId?: string;
  targetId: string;
  pathname: string;
} {
  const hostResolver = getDocsHostAdapter()?.resolveRoute;
  if (hostResolver) return hostResolver(value);
  try {
    const root = trimTrailingSlashes(docsRootPath()) || '/';
    const pathname = new URL(value, 'http://localhost').pathname;
    const parts = (
      root === '/'
        ? pathname.replace(/^\//, '')
        : pathname === root
          ? ''
          : pathname.startsWith(`${root}/`)
            ? pathname.slice(root.length + 1)
            : pathname.replace(SHARED_REGEX, '')
    )
      .replace(TerraQualityRegex.REGEX_PATTERN_REGEX_3(), '')
      .split('/')
      .filter(Boolean)
      .map((p) =>
        p
          .replace(/\.draft$/i, '')
          .replace(/index\.(?:html|htm)$/i, '')
          .replace(/\.(?:html|htm)$/i, ''),
      );
    const sectionId = parts[0] || 'index';
    const groupId = parts.length > 2 ? parts[1] : undefined;
    const leafId = parts.length > 1 ? parts[parts.length > 2 ? 2 : 1] : undefined;
    return {
      sectionId,
      ...(groupId ? { groupId } : {}),
      ...(leafId ? { leafId } : {}),
      targetId: leafId || groupId || sectionId,
      pathname: buildRoute(sectionId, groupId, leafId),
    };
  } catch {
    return { sectionId: 'index', targetId: 'index', pathname: docsRootPath() };
  }
}

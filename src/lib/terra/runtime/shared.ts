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
 * Returns the active host's Docs root, defaulting to the original Terra route.
 * @returns The configured root pathname.
 */
export function docsRootPath(): string {
  return getDocsHostAdapter()?.rootPath ?? '/docs';
}
/**
 * Removes trailing slashes from a Docs path.
 *
 * @param path - Path whose trailing separators should be removed.
 *
 * @returns The path without trailing slashes, or an empty string for slash-only input.
 */
export function trimTrailingSlashes(path: string): string {
  return path.replace(/\/+$/, '');
}
/**
 * Joins a relative path to the host Docs root without duplicating an existing root prefix.
 * @param path Relative path or already rooted host route.
 * @returns The route joined to the active host's Docs root.
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
 * Checks whether a pathname belongs to the active host's Docs root.
 * @param path Browser pathname to check.
 * @returns Whether the path equals or descends from the configured root.
 */
export function isDocsPath(path: string): boolean {
  const root = trimTrailingSlashes(docsRootPath()) || '/';
  return root === '/' ? path.startsWith('/') : path === root || path.startsWith(`${root}/`);
}
/**
 * Collects leaf paths from a nested navigation tree while ignoring branches without paths.
 * @param nodes Navigation nodes to traverse.
 * @returns Paths of leaves, in tree order.
 */
export function toPaths(nodes: Tree[]): string[] {
  return Array.isArray(nodes)
    ? nodes.flatMap((n) =>
        n.type === 'leaf' ? (n.path ? [n.path] : []) : toPaths(n.children ?? []),
      )
    : [];
}
/**
 * Recognizes API and absolute web URLs that should remain external to Docs routing.
 * @param value Candidate endpoint string.
 * @returns Whether it begins with `/api/`, `http://`, or `https://`.
 */
export function isEndpointVal(value: string): boolean {
  return /^(?:\/api\/|https?:\/\/)/i.test(value.trim());
}
/**
 * Removes the leading underscore convention used to hide internal labels from navigation.
 * @param title Navigation title that may use the internal-name prefix.
 * @returns Title without leading underscores, or an empty string for a missing title.
 */
export function toNodeLabel(title: string): string {
  return title?.replace(/^_+/, '') ?? '';
}
/**
 * Returns the parent directory portion of a slash-separated repository path.
 * @param path Repository-relative or absolute path.
 * @returns Parent path, `.` for a bare filename, or `/` for a root child.
 */
export function dirname(path: string): string {
  const value = trimTrailingSlashes(path);
  const index = value.lastIndexOf('/');
  return index < 0 ? '.' : value.slice(0, index) || '/';
}
/**
 * Returns the last path segment and optionally removes its known file extension.
 * @param path Repository or URL path.
 * @param ext Known suffix to remove only when it ends the basename.
 * @returns Basename without the optional matching suffix.
 */
export function bName(path: string, ext?: string): string {
  let name = trimTrailingSlashes(path).split('/').pop() || '';
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}
/**
 * Trims whitespace from a host-provided title, using an empty string when no title exists.
 * @param title Optional title supplied by the host.
 * @returns Trimmed title or an empty string.
 */
export const cTitle = (title?: string): string => (title || '').trim();
/**
 * Builds a host-aware route from section, group, and leaf identifiers.
 * @param sectionId Section identifier, or `index` for the Docs root.
 * @param groupId Optional nested group identifier.
 * @param leafId Optional leaf identifier.
 * @returns Route supplied by the host or assembled beneath the configured root.
 */
export function buildRoute(sectionId: string, groupId?: string, leafId?: string): string {
  const hostBuilder = getDocsHostAdapter()?.buildRoute;
  if (hostBuilder) return hostBuilder(sectionId, groupId, leafId);
  return sectionId && sectionId !== 'index'
    ? docsPath(`${sectionId}${groupId ? `/${groupId}` : ''}${leafId ? `/${leafId}` : ''}`)
    : docsRootPath();
}
/**
 * Parses a Docs URL into its section/group/leaf IDs, delegating to the host when available.
 * @param value URL or pathname selected in the browser.
 * @returns Resolved identifiers and the canonical pathname.
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

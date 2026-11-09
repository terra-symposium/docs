import type { Tree } from './types.js';
import { getDocsHostAdapter } from '../../host-runtime.js';
import * as TerraQualityRegex from '../regex.mjs';
/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/
const SHARED_REGEX = /^\/+/;
const SHARED_CLASS_2 = /\/+$/;

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
export function docsRootPath(): string {
  return getDocsHostAdapter()?.rootPath ?? '/docs';
}
export function docsPath(path = ''): string {
  const host = getDocsHostAdapter();
  if (host?.routePath) return host.routePath(path);
  const root = docsRootPath().replace(SHARED_CLASS_2, '');
  const c = path.replace(SHARED_REGEX, '');
  if (!c) return root || '/';
  if (root && (path === root || path.startsWith(`${root}/`))) return path;
  return `${root}/${c}`;
}
export function isDocsPath(path: string): boolean {
  const root = docsRootPath().replace(SHARED_CLASS_2, '') || '/';
  return root === '/' ? path.startsWith('/') : path === root || path.startsWith(`${root}/`);
}
export function toPaths(nodes: Tree[]): string[] {
  return Array.isArray(nodes)
    ? nodes.flatMap((node) =>
        node.type === 'leaf' ? (node.path ? [node.path] : []) : toPaths(node.children ?? []),
      )
    : [];
}
export function isEndpointVal(value: string): boolean {
  return /^(?:\/api\/|https?:\/\/)/i.test(value.trim());
}
export function toNodeLabel(title: string): string {
  return title?.replace(/^_+/, '') ?? '';
}
export function dirname(path: string): string {
  const value = path.replace(SHARED_CLASS_2, '');
  const index = value.lastIndexOf('/');
  return index < 0 ? '.' : value.slice(0, index) || '/';
}
export function bName(path: string, ext?: string): string {
  let name = path.replace(SHARED_CLASS_2, '').split('/').pop() || '';
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}
export const cTitle = (title?: string): string => (title || '').trim();
export function buildRoute(sectionId: string, groupId?: string, leafId?: string): string {
  const hostBuilder = getDocsHostAdapter()?.buildRoute;
  if (hostBuilder) return hostBuilder(sectionId, groupId, leafId);
  return sectionId && sectionId !== 'index'
    ? docsPath(`${sectionId}${groupId ? `/${groupId}` : ''}${leafId ? `/${leafId}` : ''}`)
    : docsRootPath();
}
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
    const root = docsRootPath().replace(SHARED_CLASS_2, '') || '/';
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
      .map((part) =>
        part
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

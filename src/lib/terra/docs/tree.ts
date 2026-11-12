/**
 * src/lib/terra/docs/tree.ts
 * Canonical path and identity helpers for the Docs navigation tree.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { docsRootPath, parseRoute } from '../runtime/shared.js';

// COMPONENTS
import * as TerraQualityRegex from '../regex.mjs';

// TYPES
import type { Branch, Tree as TreeType } from '../runtime/types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * Parses a Docs route, treating an empty pathname as the configured Docs root.
 *
 * @param pathname Browser pathname to parse, or an empty string for the configured root.
 *
 * @return The normalized Docs route segments.
 */
export const parseDocsRoute = (pathname: string): ReturnType<typeof parseRoute> =>
  parseRoute(pathname || docsRootPath());
/**
 * Converts a display name to a lowercase route segment, replacing non-alphanumeric runs with hyphens.
 *
 * @param name Display name used to construct the route segment.
 *
 * @return Lowercase route text with each non-alphanumeric run replaced by a hyphen.
 */
export const sanitizeName = (name: string): string =>
  name.replace(TerraQualityRegex.REGEX_A_Z0_9_GI_REGEX(), '-').toLowerCase();
/**
 * Checks whether a path points to an `index.md` or `index.mdx` page.
 *
 * @param path - Docs-relative or absolute path to inspect.
 *
 * @return `true` when the path ends with a supported index-file name.
 */
export const isIndexFile = (path: string): boolean =>
  TerraQualityRegex.REGEX_INDEX_MD_MDX_I_REGEX().test(path || '');
/**
 * Returns a node's stored source identity, using a generated fallback for unnamed nodes.
 *
 * @param node Navigation node whose original source name identifies it.
 *
 * @return The original name for a branch or leaf, or a generated key for other node types.
 */
export const getStableKey = (node: TreeType): string => {
  if (node.type === 'branch') return node.origName;
  if (node.type === 'leaf') return node.origName;
  return Math.random().toString();
};
/**
 * Keeps a deeper existing route when the next route is only a suffix of it.
 *
 * @param curr - Current route whose deeper branch should be preserved when it matches.
 * @param n - Newly requested route to compare with the current route.
 *
 * @return The current route when it extends the new route by complete segments; otherwise the new route.
 */
export const keepDeepPath = (curr: string, n: string): string => {
  // prettier-ignore
  const cur = curr.replace(TerraQualityRegex.REGEX_DOCS_REGEX(), '').replace(TerraQualityRegex.REGEX_PATTERN_REGEX_3(), '').split('/').filter(Boolean);
  // prettier-ignore
  const nxt = n.replace(TerraQualityRegex.REGEX_DOCS_REGEX(), '').replace(TerraQualityRegex.REGEX_PATTERN_REGEX_3(), '').split('/').filter(Boolean);
  if (!nxt.length) return n;
  if (cur.length > nxt.length && cur.slice(cur.length - nxt.length).join('/') === nxt.join('/'))
    return curr;
  return n;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Collects every source node identifier and leaf path once, in navigation-tree order.
 *
 * @param nodes - Root nodes from which the identifiers should be collected.
 *
 * @return Unique original names and leaf paths in depth-first order.
 */
export function extractAllNodeIds(nodes: TreeType[]): string[] {
  const ids: string[] = [];
  const pending = [...nodes].reverse();
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.origName) ids.push(node.origName);
    if (node.type === 'leaf' && node.path) ids.push(node.path);
    if (node.type === 'branch' && node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child) pending.push(child);
      }
    }
  }
  return [...new Set(ids)];
}

/**
 * Returns the children at the branch addressed by a slash-separated path.
 *
 * @param nodes - Root nodes of the Docs navigation tree.
 * @param targetPath - Original-name path of the branch whose children are requested.
 *
 * @return Matching siblings, or an empty list when any path segment is absent.
 */
export function getSiblings(nodes: TreeType[], targetPath: string): TreeType[] {
  if (!targetPath || targetPath === '.') return nodes;
  let current = nodes;
  for (const segment of targetPath.split('/')) {
    const branch = current.find((n): n is Branch => n.type === 'branch' && n.origName === segment);
    if (!branch?.children) return [];
    current = branch.children;
  }
  return current;
}

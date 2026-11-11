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
 * Parses a host route into the section, group, and leaf IDs used by Docs navigation.
 * @param pathname Browser pathname or URL from the host.
 * @returns Parsed route IDs and canonical pathname.
 */
export const parseDocsRoute = (pathname: string): ReturnType<typeof parseRoute> =>
  parseRoute(pathname || docsRootPath());
/**
 * Converts a path segment to a lowercase Docs node name using hyphens for unsupported characters.
 * @param name Source segment from a folder or page title.
 * @returns Sanitized lowercase node name.
 */
export const sanitizeName = (name: string): string =>
  name.replace(TerraQualityRegex.REGEX_A_Z0_9_GI_REGEX(), '-').toLowerCase();
/**
 * Checks whether a Docs path names an index page.
 *
 * @param path - Docs path to normalize into a route-safe identifier.
 *
 * @return Whether the path ends in `index.md` or `index.mdx`.
 */
export const isIndexFile = (path: string): boolean =>
  TerraQualityRegex.REGEX_INDEX_MD_MDX_I_REGEX().test(path || '');
/**
 * Returns the original name used to identify a branch or leaf in the Docs tree.
 * @param node Branch or leaf whose stable ID is requested.
 * @returns Its original name, or a fallback random key for an unknown node type.
 */
export const getStableKey = (node: TreeType): string => {
  if (node.type === 'branch') return node.origName;
  if (node.type === 'leaf') return node.origName;
  return Math.random().toString();
};
/**
 * Keeps the current deeper route when a shorter parent route is proposed.
 * @param curr Current route whose nested suffix may need to be retained.
 * @param n Proposed route from a parent-level navigation update.
 * @returns The current route when it is a deeper form of `n`; otherwise the proposed route.
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
 * Collects each node's identifier and leaf path once, preserving navigation order.
 * @param nodes Root nodes to traverse recursively.
 * @return Unique identifiers and leaf paths in depth-first order.
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
 * Resolves a branch path to the list of nodes that share its parent.
 * @param nodes Root navigation list.
 * @param targetPath Slash-separated branch IDs leading to the requested sibling list.
 * @return Siblings below the path, the root list for an empty path, or an empty list if a branch is missing.
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

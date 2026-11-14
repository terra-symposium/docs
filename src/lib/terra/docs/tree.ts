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
 * Parses a Docs pathname using the configured root and host route adapter.
 *
 * @param pathname Pathname to resolve.
 *
 * @return Parsed section, group, leaf, and canonical route details.
 */
export const parseDocsRoute = (pathname: string): ReturnType<typeof parseRoute> => parseRoute(pathname || docsRootPath());
/**
 * Converts a document name to a lowercase path-safe slug.
 *
 * @param name Name to normalize.
 *
 * @return Normalized slug.
 */
export const sanitizeName = (name: string): string => name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
/**
 * Checks whether a Docs path points to a Markdown index file.
 *
 * @param path - Docs path to normalize into a route-safe identifier.
 *
 * @return Whether the path ends in `index.md` or `index.mdx`.
 */
export const isIndexFile = (path: string): boolean => TerraQualityRegex.REGEX_INDEX_MD_MDX_I_REGEX().test(path || '');
/**
 * Returns the stable navigation key for a tree node.
 *
 * @param node Branch or leaf whose key is requested.
 *
 * @return Original node name used as its key.
 */
export const getStableKey = (node: TreeType): string => {
	if (node.type === 'branch') return node.origName;
	if (node.type === 'leaf') return node.origName;
	return Math.random().toString();
};
/**
 * Keeps the current nested path when the next route only names its parent.
 *
 * @param curr Current route path.
 * @param n Proposed next route path.
 *
 * @return Current path when it preserves a deeper suffix; otherwise the next path.
 */
export const keepDeepPath = (curr: string, n: string): string => {
	// prettier-ignore
	const cur = curr.replace(TerraQualityRegex.REGEX_DOCS_REGEX(), '').replace(TerraQualityRegex.REGEX_PATTERN_REGEX_3(), '').split('/').filter(Boolean);
	// prettier-ignore
	const nxt = n.replace(TerraQualityRegex.REGEX_DOCS_REGEX(), '').replace(TerraQualityRegex.REGEX_PATTERN_REGEX_3(), '').split('/').filter(Boolean);
	if (!nxt.length) return n;
	if (cur.length > nxt.length && cur.slice(cur.length - nxt.length).join('/') === nxt.join('/')) return curr;
	return n;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Collects unique node names and leaf paths from a navigation subtree.
 *
 * @param nodes Root nodes to traverse.
 *
 * @return Unique original names and document paths in traversal order.
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
 * Resolves a branch path and returns its immediate children.
 *
 * @param nodes Root tree nodes.
 * @param targetPath Slash-delimited branch path to resolve.
 *
 * @return Immediate child nodes, or an empty array when the branch is missing.
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

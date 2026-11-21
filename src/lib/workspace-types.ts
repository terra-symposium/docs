/**
 * src/lib/workspace-types.ts
 * Navigation data accepted by the React convenience adapter for static Docs sites.
 */

/**
 * A downloadable or linked resource shown with a Docs leaf.
 */
export type DocsAttachment = { title: string; href: string; type?: string; size?: number };

/**
 * A document and its metadata within a static Docs branch.
 */
export type DocsLeaf = {
  id?: string;
  path?: string;
  title: string;
  href: string;
  description?: string;
  updatedAt?: string;
  attachments?: DocsAttachment[];
  hue?: number | null;
};

/**
 * A set of sibling leaves that share one title and optional accent color.
 */
export type DocsBranch = {
  title: string;
  id?: string;
  path?: string;
  hue?: number | null;
  leaves: DocsLeaf[];
};

/**
 * Top-level navigation tree containing titled branches of leaves.
 */
export type DocsTree = {
  title: string;
  id?: string;
  path?: string;
  hue?: number | null;
  branches: DocsBranch[];
};

/**
 * Legacy name for a navigation branch, accepted for existing host data. @deprecated Use DocsBranch.
 */
export type DocsGroup = DocsBranch;

/**
 * Legacy name for a navigation tree, accepted for existing host data. @deprecated Use DocsTree with `branches`.
 */
export type DocsSection = Omit<DocsTree, 'branches'> & { groups: DocsGroup[] };

/**
 * src/lib/workspace-types.ts
 * Navigation data accepted by the React convenience adapter for static Docs sites.
 */

/** A downloadable or linked resource shown with a Docs leaf. */
export type DocsAttachment = { title: string; href: string; type?: string; size?: number };

/** A leaf page and its metadata within a static Docs navigation group. */
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

/** A set of sibling pages that share one title and optional accent color. */
export type DocsGroup = {
  title: string;
  id?: string;
  path?: string;
  hue?: number | null;
  leaves: DocsLeaf[];
};

/** Top-level navigation section containing titled groups of leaf pages. */
export type DocsSection = {
  title: string;
  id?: string;
  path?: string;
  hue?: number | null;
  groups: DocsGroup[];
};

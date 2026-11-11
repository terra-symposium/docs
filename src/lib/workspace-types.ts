/**
 * src/lib/workspace-types.ts
 * Navigation data accepted by the React convenience adapter for static Docs sites.
 */

/** A link or downloadable file associated with a static Docs page. */
export type DocsAttachment = { title: string; href: string; type?: string; size?: number };
/** One leaf page in static Docs navigation. */
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
/** A titled group of related pages in static Docs navigation. */
export type DocsGroup = {
  title: string;
  id?: string;
  path?: string;
  hue?: number | null;
  leaves: DocsLeaf[];
};
/** A top-level section containing page groups in static Docs navigation. */
export type DocsSection = {
  title: string;
  id?: string;
  path?: string;
  hue?: number | null;
  groups: DocsGroup[];
};

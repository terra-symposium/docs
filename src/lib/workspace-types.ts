/**
 * src/lib/workspace-types.ts
 * Attachment link accepted by the static Docs site adapter.
 */

/** File attachment exposed by the static Docs site adapter. */
export type DocsAttachment = { title: string; href: string; type?: string; size?: number };
/** Static navigation leaf and page metadata accepted by the adapter. */
export type DocsLeaf = { id?: string; path?: string; title: string; href: string; description?: string; updatedAt?: string; attachments?: DocsAttachment[] };
/** Group of static Docs pages nested under a section. */
export type DocsGroup = { title: string; id?: string; path?: string; leaves: DocsLeaf[] };
/** Top-level static navigation section containing page groups. */
export type DocsSection = { title: string; id?: string; path?: string; groups: DocsGroup[] };

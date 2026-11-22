/**
 * src/lib/host.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { ComponentType, ReactNode } from 'react';
import type { DocsBlockOptions } from '../components/blocks.js';
import type { DocsQuizConfig } from '../components/quiz.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * The portable tree-node shape used by the original Docs workspace.
 */
export type DocsHostTreeNode = {
  type: 'branch' | 'leaf';
  origName: string;
  title?: string;
  /**
   * Explicit accent for this node; descendants inherit the nearest defined hue.
   */
  hue?: number | null;
  url?: string;
  path?: string;
  permission?: 'read' | 'write';
  children?: DocsHostTreeNode[];
  [key: string]: unknown;
};
/**
 * A portable document value handed to the workspace by its storage adapter.
 */
export type DocsHostDocument = {
  id?: string;
  path?: string;
  pathname?: string;
  title: string;
  description?: string;
  content?: unknown[] | string;
  source?: string;
  contributors?: string[];
  updatedAt?: string;
  [key: string]: unknown;
};
/**
 * The subset of the signed-in account the shared navigation can display.
 */
export type DocsHostUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  [key: string]: unknown;
};
/**
 * Portable attachment metadata. The host resolves and authorizes its URL.
 */
export type DocsHostAttachment = {
  id?: string;
  name: string;
  path: string;
  type?: string;
  size?: number;
  [key: string]: unknown;
};
/**
 * Capability flags control which mutating controls the shared UI displays.
 */
export type DocsHostCapabilities = {
  read?: boolean;
  write?: boolean;
  /**
   * Permit sidebar mutations separately from editing the current document.
   */
  navigationWrite?: boolean;
  reorder?: boolean;
  attachments?: boolean;
  export?: boolean;
  history?: boolean;
  publish?: boolean;
};
/**
 * Legacy host operation names grouped by the read/write permission they require.
 */
export type DocsActionOperation =
  | `read.${'asset' | 'doc' | 'external' | 'source' | 'util'}.${string}`
  | `read.${'tsdocs'}`
  | `write.${'asset' | 'attachment' | 'doc'}.${string}`;
/**
 * Result envelope returned by a legacy host operation.
 */
export type DocsActionResult<T = unknown> = { data?: T; error?: unknown };
/**
 * Route match produced by resolving a browser pathname against the host tree.
 */
export type DocsResolvedRoute =
  | {
      treeId: string;
      branchId?: string;
      leafId?: string;
      targetId: string;
      pathname: string;
    }
  | {
      /**
       * Legacy top-level navigation ID. @deprecated Use treeId.
       */
      sectionId: string;
      /**
       * Legacy branch ID. @deprecated Use branchId.
       */
      groupId?: string;
      leafId?: string;
      targetId: string;
      pathname: string;
    };
/**
 * Type contract for the stable host operations used by the shared UI.
 */
export type DocsHostOperationContracts = {
  'read.doc.list': {
    input: { type: 'nav'; pathname: string; full?: boolean };
    output: DocsHostTreeNode[];
  };
  'read.doc.get': { input: { id?: string; pathname?: string }; output: DocsHostDocument | null };
  'read.doc.attachments': {
    input: { path: string } | { paths: string[] };
    output: DocsHostAttachment[] | Record<string, DocsHostAttachment[]>;
  };
  'write.doc.save': {
    input: {
      path: string;
      title: string;
      description?: string;
      content?: unknown[];
      source?: string;
    };
    output: DocsHostDocument;
  };
  'write.doc.reorder': {
    input: { path: string; parent: string; order: number; type?: 'leaf' | 'branch' };
    output: DocsHostTreeNode[] | null;
  };
  'write.doc.retargetSources': {
    input: { sourceIds: string[]; targetId: string };
    output: boolean;
  };
  'write.doc.rm': {
    input: { path: string; type: 'doc' | 'folder'; assets?: boolean };
    output: null;
  };
};
/**
 * Host boundary for storage, authorization, URLs, and mutations.
 */
export type DocsHostAdapter = {
  capabilities: DocsHostCapabilities;
  /**
   * Whether this host must load each document as its own browser page.
   */
  navigationMode?: 'client' | 'document';
  /**
   * Legacy action bridge for host-specific operations outside the stable contract.
   *
   * @param op Permission-scoped operation name understood by the host.
   * @param input Operation-specific payload; omitted when the operation takes no data.
   *
   * @return Host result containing operation data or an error.
   */
  invoke<T = unknown>(op: DocsActionOperation, input?: unknown): Promise<DocsActionResult<T>>;
  /**
   * Load a host-owned draft when an editor enters Edit mode.
   */
  loadDraft?: (path: string) => Promise<DocsHostDocument | null>;
  /**
   * Publish the current saved draft from the shared toolbar when supported by the host.
   */
  publishDraft?: (path: string) => Promise<void>;
  assetUrl?: (assetId: string, width?: number) => string | undefined;
  resolveRoute?: (pathname: string) => DocsResolvedRoute;
  buildRoute?: (treeId: string, branchId?: string, leafId?: string) => string;
  /**
   * Base path for a host's Docs application (`/docs` for Terra, `/` for local instances).
   */
  rootPath?: string;
  /**
   * Resolve a repository or content path into a browser route.
   */
  routePath?: (path: string) => string;
  /**
   * Route back to the host's Docs root from its brand link.
   */
  homePath?: string;
  isDevelopmentOrigin?: (origin: string) => boolean;
  /**
   * Label used in the shared sidebar and document title.
   */
  siteTitle?: string;
  /**
   * Supporting text shown beneath the site title in the shared sidebar.
   */
  siteDescription?: string;
  /**
   * Optional shared hue for hosts whose Docs surface needs its own palette.
   */
  hue?: number | null;
};
/**
 * A host-specific rich block renderer. Generic blocks live in @terra-symposium/docs.
 *
 * @docsId custom-blocks
 * @docsUseWhen Add a page-specific React component or host-registered rich block when built-in Docs blocks do not express the needed view.
 * @docsConstraint A repository leaf is Markdown-only in `.md`; use `.mdx` only when that leaf imports a React component.
 * @docsConstraint Page-local MDX components and host-wide `DocsCustomBlock` registrations are different extension paths.
 * @docsConstraint Every registered custom block needs a stable `name` and a `component` or `render` implementation.
 * @docsConstraint Keep the existing `SiteMarkdownPage.astro` route and `DocsSiteLayout` shell; do not wrap a page in a second Docs layout.
 * @docsDo Keep a page-specific TSX component and its example data beside the `.mdx` leaf that owns them.
 * @docsDo Import and render the component where its explanation belongs in the reading path.
 * @docsDo Keep title and description in frontmatter and use ordinary headings for the page table of contents.
 * @docsDo Register reusable host-level blocks through `DocsWorkspace.customBlocks` and document their props.
 * @docsDo Keep nested routes under their parent path so the parent remains active in navigation.
 * @docsDont Do not add custom markup or styles before checking shared components and variants in `@terra-symposium/styling/ui`.
 * @docsDont Do not add page-specific CSS when shared variants and layout utilities fit.
 * @docsDont Do not render generated APIs as custom signature cards; use shared tables.
 * @docsDont Do not change the Docs shell to work around a missing MDX component; trace the shared MDX rendering path.
 * @docsTip Prefer `DataTable`, `Card`, `Button`, and `ButtonLink` when they fit the content.
 * @docsTip Keep components data-driven when they accept rows or columns, and reuse existing form and display controls.
 * @docsTip Build the site and inspect the direct route, component output, generated table of contents, sidebar selection, and sibling leaves.
 * @docsTip Check the browser console for MDX, React, and hydration errors.
 * @docsRenderKind custom
 * @docsSyntax
 * import StatusPanel from './_components';
 *
 * <StatusPanel status="ready" />
 * @docsRenderedExample
 * Release build passed. The component presents a short status at the point where readers need it.
 * @docsInsertionStep Choose the extension scope: use a page-local component for one leaf or a registered custom block for a host-wide reusable block.
 * @docsInsertionStep For one leaf, create a sibling `.tsx` component, import it from the `.mdx` leaf, and render it beside its explanation.
 * @docsInsertionStep For host-wide reuse, implement a `DocsCustomBlock` with a stable `name` and `component` or `render`, then register it in `DocsWorkspace.customBlocks`.
 * @docsInsertionStep Reuse shared UI variants and data-driven controls before adding custom markup or styles.
 * @docsInsertionStep Build Docs and inspect the direct route, generated table of contents, sidebar selection, sibling leaves, and browser console.
 */
export type DocsCustomBlock = {
  name: string;
  label?: string;
  component?: ComponentType<Record<string, unknown>>;
  render?: (props: Record<string, unknown>) => ReactNode;
  path?: string;
  clipboardValue?: string;
  exportValue?: string;
  [key: string]: unknown;
};
/**
 * Root inputs required to mount the original Docs workspace.
 */
export type DocsWorkspaceProps = {
  host: DocsHostAdapter;
  tree: DocsHostTreeNode[];
  pathname: string;
  permission: 'read' | 'write';
  path?: string;
  title: string;
  description?: string;
  contributors?: string[];
  updatedAt?: string;
  userData?: DocsHostUser | null;
  source?: string;
  content?: unknown;
  /**
   * Optional static React content slot rendered inside the canonical View surface.
   */
  renderContent?: ReactNode;
  /**
   * Static site pages are already rendered and do not need editor transition guards.
   */
  staticContent?: boolean;
  /**
   * Optional host-owned React content rendered before the document body in View mode.
   */
  beforeContent?: ReactNode;
  /**
   * Optional host-owned React content appended after the canonical View surface.
   */
  afterContent?: ReactNode;
  standalone?: boolean;
  full?: boolean;
  mode?: 'view' | 'edit' | 'attachments';
  /**
   * Disable selected shared rich blocks while keeping their stored source intact.
   */
  blocks?: DocsBlockOptions;
  customBlocks?: DocsCustomBlock[];
  /**
   * Optional ephemeral quiz flow. Hosts own the server-side generation endpoint and credentials.
   */
  quiz?: DocsQuizConfig;
};

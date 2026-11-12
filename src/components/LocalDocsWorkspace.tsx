/**
 * src/components/LocalDocsWorkspace.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { markdownToDocsValue } from '../lib/markdown-model.js';
import { useEffect, useMemo, useState } from 'react';

// COMPONENTS
import * as TerraQualityRegex from '../lib/terra/regex.mjs';
import { DocsWorkspace } from './terra/Workspace.js';
import { DocsMarkdown } from './MarkdownContent.js';

// TYPES
import type {
  DocsActionOperation,
  DocsActionResult,
  DocsCustomBlock,
  DocsHostAdapter,
  DocsHostAttachment,
  DocsHostTreeNode,
} from '../lib/host.js';
import type { DocsBlockOptions } from './blocks.js';
import type { DocsQuizConfig } from './quiz.js';
import type { JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** A local page supplied by a repository or static site build. */
export type DocsLocalPage = {
  id: string;
  path: string;
  pathname: string;
  title: string;
  markdown: string;
  description?: string;
  contributors?: string[];
  updatedAt?: string;
  attachments?: DocsHostAttachment[];
};
/** Read-only workspace settings and page data supplied by the consuming repository. */
export type DocsLocalWorkspaceProps = {
  tree: DocsHostTreeNode[];
  pages: DocsLocalPage[];
  pathname: string;
  title: string;
  description?: string;
  /** Optional host-owned content rendered before the page body in View mode. */
  beforeContent?: ReactNode;
  hue?: number | null;
  rootPath?: string;
  homePath?: string;
  afterContent?: ReactNode;
  customBlocks?: DocsCustomBlock[];
  blocks?: DocsBlockOptions;
  /** Optional quiz UI and server-backed generation callback. */
  quiz?: DocsQuizConfig;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Normalizes a local URL to its pathname and fragment for page matching.
 *
 * @param value - Candidate URL or route, including an optional query and fragment.
 * @param base - Base URL used to resolve relative candidate routes.
 * @returns The normalized pathname and fragment, or the original value if URL parsing fails.
 */
function norm(value: string, base = 'http://docs.local'): string {
  try {
    const url = new URL(value, base);
    // Mode and other host query parameters describe the surface, not the page.
    return `${url.pathname}${url.hash}`;
  } catch {
    return value;
  }
}

/**
 * Decodes a fragment identifier from a page route or browser URL.
 * @param value Route-like input supplied by the host or browser location.
 * @returns The decoded fragment, or an empty string when the input has no valid fragment.
 */
function routeId(value: string): string {
  try {
    const hash = new URL(value, 'http://docs.local').hash.slice(1);
    return hash ? decodeURIComponent(hash) : '';
  } catch {
    return '';
  }
}

/**
 * Finds the local page matching a host route, page ID, or source path.
 *
 * Hash-addressed IDs take precedence over shared paths; a root page is used as
 * fallback only for the unfragmented root route.
 *
 * @param pages - Local pages available to the workspace.
 * @param value - Candidate page ID, source path, pathname, or URL.
 * @returns The best matching page, or `undefined` when no route matches.
 */
export function findDocsLocalPage(
  pages: DocsLocalPage[],
  value: unknown,
): DocsLocalPage | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const route = norm(value);
  const pathOnly = route.split('#', 1)[0];
  const id = routeId(value);

  // Hash-addressed pages must win before a shared pathname such as `/`.
  if (id) {
    const byId = pages.find((p) => p.id === id);
    if (byId) return byId;
  }
  const exactRoute = pages.find((p) => norm(p.pathname) === route);
  if (exactRoute) return exactRoute;
  const direct = pages.find((p) => p.id === value || p.path === value);
  if (direct) return direct;

  // A root page is the fallback for `/` only. It must not shadow `/` + #leaf.
  if (pathOnly === '/' && !id) {
    return pages.find((p) => norm(p.pathname) === '/');
  }
  return pages.find((p) => norm(p.pathname).split('#', 1)[0] === pathOnly);
}

/**
 * Searches the navigation tree and records the branch path to a matching node.
 *
 * @param nodes - Sibling navigation nodes to search recursively.
 * @param id - Original node name to match.
 * @param ancestors - Branch path already traversed before this sibling list.
 * @returns The matching node and its ancestors, or `undefined` when absent.
 */
function findTreeNode(
  nodes: DocsHostTreeNode[],
  id: string,
  ancestors: DocsHostTreeNode[] = [],
): { node: DocsHostTreeNode; ancestors: DocsHostTreeNode[] } | undefined {
  for (const node of nodes) {
    if (node.origName === id) return { node, ancestors };
    const found = node.children ? findTreeNode(node.children, id, [...ancestors, node]) : undefined;
    if (found) return found;
  }
  return undefined;
}

/**
 * Finds a leaf by ID and retains its parent chain for section and group routing.
 *
 * @param nodes - Sibling nodes to search in navigation order.
 * @param id - Page ID stored in a leaf's `origName` field.
 * @param ancestors - Branch path already traversed before this sibling list.
 * @returns The matching leaf and its parent chain, or `undefined` when absent.
 */
function findTreeLeaf(
  nodes: DocsHostTreeNode[],
  id: string,
  ancestors: DocsHostTreeNode[] = [],
): { node: DocsHostTreeNode; ancestors: DocsHostTreeNode[] } | undefined {
  for (const node of nodes) {
    if (node.type === 'leaf' && node.origName === id) return { node, ancestors };
    const found = node.children ? findTreeLeaf(node.children, id, [...ancestors, node]) : undefined;
    if (found) return found;
  }
  return undefined;
}

/**
 * Selects the first leaf nested beneath the supplied navigation nodes.
 *
 * @param nodes - Navigation nodes in their displayed order.
 * @returns The first descendant leaf or `undefined` when the branch is empty.
 */
function firstLeaf(nodes: DocsHostTreeNode[]): DocsHostTreeNode | undefined {
  for (const node of nodes) {
    if (node.type === 'leaf') return node;
    const found = firstLeaf(node.children ?? []);
    if (found) return found;
  }
  return undefined;
}

/**
 * Renders repository-owned Markdown with the original Docs workspace.
 * This adapter has no write operations, account dependency, or server requirement.
 *
 * @param workspaceOptions - Read-only workspace settings and local page records.
 * @param workspaceOptions.tree - Navigation hierarchy rendered by the workspace sidebar.
 * @param workspaceOptions.pages - Local page records available for route and document lookups.
 * @param workspaceOptions.pathname - Current route used to select the initial page.
 * @param workspaceOptions.title - Site title shown by the workspace shell.
 * @param workspaceOptions.description - Optional site description shown by the workspace shell.
 * @param workspaceOptions.beforeContent - Optional host content rendered before the page body.
 * @param workspaceOptions.hue - Optional theme hue; defaults to the Docs palette hue.
 * @param workspaceOptions.rootPath - Base route used when a page has no explicit route.
 * @param workspaceOptions.homePath - Optional home route for the workspace brand link.
 * @param workspaceOptions.afterContent - Optional host content rendered after the page body.
 * @param workspaceOptions.customBlocks - Optional host-defined blocks available to the renderer.
 * @param workspaceOptions.blocks - Optional switches for built-in Docs blocks.
 * @param workspaceOptions.quiz - Optional host configuration for the ephemeral quiz interface.
 * @returns A read-only Docs workspace backed by local page data.
 */
export function DocsLocalWorkspace(workspaceOptions: DocsLocalWorkspaceProps): JSX.Element {
  const {
    tree,
    pages,
    pathname,
    title,
    description,
    beforeContent,
    hue = 145,
    rootPath = '/',
    homePath,
    afterContent,
    customBlocks,
    blocks,
    quiz,
  } = workspaceOptions;
  const [aPath, setActivePath] = useState(pathname);
  useEffect(() => setActivePath(pathname), [pathname]);
  useEffect(() => {
    /**
     * Keeps the selected page aligned with Docs navigation and browser history changes.
     * @param event Optional navigation event carrying an explicit pathname or URL.
     */
    const updatePath = (event?: Event): void => {
      const detail = (event as CustomEvent<{ pathname?: unknown; url?: unknown }> | undefined)
        ?.detail;
      setActivePath(
        [detail?.pathname, detail?.url].find(
          (value): value is string => typeof value === 'string' && value.length > 0,
        ) ?? `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
    };
    document.addEventListener('docs:navigate', updatePath);
    window.addEventListener('popstate', updatePath);
    window.addEventListener('hashchange', updatePath);
    return () => {
      document.removeEventListener('docs:navigate', updatePath);
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('hashchange', updatePath);
    };
  }, []);
  const page = findDocsLocalPage(pages, aPath) ?? pages[0];
  const content = useMemo(
    () => (page ? markdownToDocsValue(page.markdown, blocks) : []),
    [blocks, page],
  );
  return (
    <DocsWorkspace
      host={useMemo<DocsHostAdapter>(() => {
        /**
         * Resolves the page represented by the current browser location.
         * @returns The matching local page, or the parent-selected page during server rendering.
         */
        const aPage = (): DocsLocalPage | undefined =>
          typeof window === 'undefined'
            ? page
            : (findDocsLocalPage(
                pages,
                `${window.location.pathname}${window.location.search}${window.location.hash}`,
              ) ?? page);
        /**
         * Resolves action arguments to a local Markdown page without guessing ambiguous basenames.
         * @param input Read action fields that may contain a page ID, source path, or pathname.
         * @returns The exact page or unique basename match, otherwise `undefined`.
         */
        const resolvePage = (input: unknown): DocsLocalPage | undefined => {
          if (!input || typeof input !== 'object') return undefined;
          const value = input as Record<string, unknown>;
          const direct =
            findDocsLocalPage(pages, value.id) ??
            findDocsLocalPage(pages, value.path) ??
            findDocsLocalPage(pages, value.pathname) ??
            findDocsLocalPage(pages, value.origName);
          if (direct) return direct;
          const requested = [value.path, value.pathname, value.id].find(
            (candidate) => typeof candidate === 'string' && candidate.length > 0,
          );
          if (typeof requested !== 'string') return aPage();
          const basename = requested
            .split(TerraQualityRegex.REGEX_PATTERN_REGEX_4(), 1)[0]
            ?.split('/')
            .filter(Boolean)
            .at(-1);
          const a = aPage();
          if (basename && a?.path.split('/').at(-1) === basename) return a;
          const matches = pages.filter(
            (candidate) =>
              candidate.path.split('/').at(-1) === basename || candidate.id === basename,
          );
          return matches.length === 1 ? matches[0] : undefined;
        };
        return {
          capabilities: {
            read: true,
            write: false,
            reorder: false,
            attachments: false,
            export: true,
            history: false,
            publish: false,
          },
          rootPath,
          ...(homePath ? { homePath } : {}),
          hue,
          siteTitle: title,
          ...(description ? { siteDescription: description } : {}),
          assetUrl: () => undefined,
          /**
           * Resolves the active local page and its section/group IDs for workspace navigation.
           * @param value URL, route, or page ID reported by the local host.
           * @returns Route identifiers and canonical pathname for the best matching page.
           */
          resolveRoute(value) {
            const resolved = findDocsLocalPage(pages, value) ?? pages[0];
            // Leaf IDs may intentionally match their section IDs (for example a
            // Standards `skills` section containing the `skills` landing leaf).
            // Resolve the leaf explicitly so a branch collision cannot redirect
            // the selected section to the first section in the TOC.
            const branches =
              (resolved ? findTreeLeaf(tree, resolved.id) : undefined)?.ancestors.filter(
                (node) => node.type === 'branch',
              ) ?? [];
            return {
              sectionId: branches[0]?.origName ?? tree[0]?.origName ?? 'index',
              ...(branches[1] ? { groupId: branches[1].origName } : {}),
              ...(resolved ? { leafId: resolved.id } : {}),
              targetId: resolved?.id ?? tree[0]?.origName ?? 'index',
              pathname: resolved?.pathname ?? norm(value),
            };
          },
          /**
           * Builds a local URL for a selected leaf, falling back to the first page in its branch.
           * @param sectionId Selected section ID.
           * @param groupId Optional selected group ID.
           * @param leafId Optional selected page ID.
           * @returns The selected page URL or the configured workspace root.
           */
          buildRoute(sectionId, groupId, leafId) {
            const leaf = leafId ? findTreeNode(tree, leafId)?.node : undefined;
            if (leaf?.url) return leaf.url;
            return ((groupChildren, sectionChildren) =>
              firstLeaf(groupChildren ?? sectionChildren ?? tree)?.url ?? rootPath)(
              groupId ? findTreeNode(tree, groupId)?.node.children : undefined,
              findTreeNode(tree, sectionId)?.node.children,
            );
          },
          /**
           * Resolves a page URL to its local path, falling back to the workspace root.
           * @param path - URL or ID supplied by a workspace navigation action.
           * @returns The matched page pathname or the configured root route.
           */
          routePath(path) {
            return findDocsLocalPage(pages, path)?.pathname ?? rootPath;
          },
          /**
           * Serves supported local reads from the page index and rejects write operations.
           * @param op Requested Docs host operation.
           * @param input Optional operation fields identifying a page or attachment.
           * @returns The local action result or a capability error for unsupported operations.
           */
          async invoke<T = unknown>(
            op: DocsActionOperation,
            input?: unknown,
          ): Promise<DocsActionResult<T>> {
            const args = (input ?? {}) as Record<string, unknown>;
            if (op === 'read.doc.list') return { data: tree as T };
            if (op === 'read.doc.get') {
              /**
               * Returns the selected local page with both Markdown and parsed content.
               * @returns The resolved page with source and parsed blocks, or `null` if missing.
               */
              const readDocument = (): unknown => {
                const document = resolvePage(args);
                return document
                  ? {
                      ...document,
                      source: document.markdown,
                      content: markdownToDocsValue(document.markdown),
                    }
                  : null;
              };
              return {
                data: readDocument() as T,
              };
            }
            if (op === 'read.doc.attachments') {
              /** Resolves local attachment metadata into the legacy Docs UI shape. */
              const attachmentsForPath = (path?: string): DocsHostAttachment[] =>
                ((resolvePage(path ? { path } : args) ?? aPage())?.attachments ?? []).map(
                  (attachment) => ({
                    ...attachment,
                    title: attachment.name,
                    isMd: false,
                  }),
                );
              if (Array.isArray(args.paths)) {
                return {
                  data: Object.fromEntries(
                    args.paths
                      .filter((path): path is string => typeof path === 'string')
                      .map((path) => [path, attachmentsForPath(path)]),
                  ) as T,
                };
              }
              return {
                data: attachmentsForPath(
                  typeof args.path === 'string' ? args.path : undefined,
                ) as T,
              };
            }
            if (op === 'read.source.body')
              return { data: markdownToDocsValue(String(args.source ?? '')) as T };
            if (op === 'read.util.pathname') return { data: String(args.path ?? pathname) as T };
            if (op === 'read.util.node') {
              const document = resolvePage(args);
              return {
                data: (document
                  ? {
                      origName: document.id,
                      title: document.title,
                      path: document.path,
                    }
                  : null) as T,
              };
            }
            if (op === 'read.tsdocs') return { data: { scopes: [] } as T };
            if (op === 'read.asset.get') {
              const response = await fetch(String(args.path ?? args.id ?? ''));
              if (!response.ok)
                return {
                  error: new Error(`Unable to read local attachment (${response.status}).`),
                };
              return { data: (await response.arrayBuffer()) as T };
            }
            return { data: null as T };
          },
        };
      }, [description, homePath, hue, page, pages, pathname, rootPath, title, tree])}
      tree={tree}
      pathname={pathname}
      permission="read"
      staticContent
      title={page?.title ?? title}
      {...(page?.path ? { path: page.path } : {})}
      {...(page?.description ? { description: page.description } : {})}
      {...(page?.contributors ? { contributors: page.contributors } : {})}
      {...(page?.updatedAt ? { updatedAt: page.updatedAt } : {})}
      {...(page ? { source: page.markdown, content } : { content })}
      {...(page && !customBlocks
        ? { renderContent: <DocsMarkdown markdown={page.markdown} options={blocks} /> }
        : {})}
      {...(beforeContent !== undefined ? { beforeContent } : {})}
      {...(afterContent !== undefined ? { afterContent } : {})}
      {...(customBlocks ? { customBlocks } : {})}
      {...(blocks ? { blocks } : {})}
      {...(quiz ? { quiz } : {})}
    />
  );
}

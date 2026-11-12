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
/** Inputs required to render repository-owned Markdown through the shared Docs workspace. */
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
 * Normalizes a page identifier or URL to the pathname and fragment used by local routing.
 *
 * @param value Page route or browser URL to normalize.
 * @param base Fallback origin used to resolve relative URLs.
 *
 * @return Pathname and fragment without host-specific query parameters, or the original value if it is not a URL.
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
 * @param value URL, pathname, or fragment string whose hash should be decoded.
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
 * Resolves a local page by fragment ID, pathname, source path, or page ID.
 *
 * @param pages Available local pages in their navigation order.
 * @param value Page ID, path, pathname, or browser URL to resolve.
 *
 * @return The best matching page, with fragment IDs taking precedence over shared pathnames.
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
 * Finds a node in the local navigation tree and carries its parent chain with it.
 * @param nodes Sibling nodes to search in their existing order.
 * @param id `origName` identifier to match.
 * @param ancestors Parents accumulated by the recursive caller.
 * @return Matching node and its parents, or `undefined` if the ID is absent.
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
 * Finds a leaf by ID and retains its parent chain for section/group routing.
 * @param nodes Sibling nodes to search in navigation order.
 * @param id Page ID stored in a leaf's `origName` field.
 * @param ancestors Parents already visited on the current path.
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
 * @param nodes Navigation nodes in their displayed order.
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
 * Maps local Markdown pages and browser routes into the shared read-only Docs workspace.
 *
 * @param workspaceOptions Host-owned route tree, Markdown page index, and optional presentation capabilities.
 * @param workspaceOptions.tree Navigation tree displayed by the workspace.
 * @param workspaceOptions.pages Local Markdown documents indexed by route and ID.
 * @param workspaceOptions.pathname Current browser route used to select the document.
 * @param workspaceOptions.title Host title shown in the sidebar and document title.
 * @param workspaceOptions.description Optional site description shown below the title.
 * @param workspaceOptions.beforeContent Optional host-owned content rendered before the page body.
 * @param workspaceOptions.hue Optional Styling hue applied to the workspace palette.
 * @param workspaceOptions.rootPath Host Docs root used to build local routes.
 * @param workspaceOptions.homePath Optional destination for the site brand link.
 * @param workspaceOptions.afterContent Optional host-owned content appended after the page body.
 * @param workspaceOptions.customBlocks Optional host-specific rich block renderers.
 * @param workspaceOptions.blocks Optional switches controlling supported rich blocks.
 * @param workspaceOptions.quiz Optional quiz controls and host generation callback.
 * @return The shared workspace displaying the selected Markdown page and any configured host content or quiz controls.
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
           * Resolves a source path to the canonical route used by the local page index.
           * @param path Host path or route supplied for a local document.
           * @returns The indexed page pathname, or the workspace root when no page matches.
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
               * Resolves the indexed page once for the source and editor content in this response.
               */
              const document = resolvePage(args);
              return {
                data: (document
                  ? {
                      ...document,
                      source: document.markdown,
                      content: markdownToDocsValue(document.markdown),
                    }
                  : null) as T,
              };
            }
            if (op === 'read.doc.attachments') {
              return {
                data: ((resolvePage(args) ?? aPage())?.attachments ?? []).map((attachment) => ({
                  ...attachment,
                  title: attachment.name,
                  isMd: false,
                })) as T,
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

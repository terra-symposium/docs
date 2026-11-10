/**
 * src/components/StaticWorkspace.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { $surfaceReady, useTransitionState } from '../lib/terra/docs/state.js';
import { docsHueTheme } from '../lib/docs-theme.js';
import { docsValueToMarkdown, markdownToDocsValue } from '../lib/markdown-model.js';
import { useEffect } from 'react';

// COMPONENTS
import * as TerraQualityRegex from '../lib/terra/regex.mjs';
import { Button } from '@terra-symposium/styling/ui';
import { DocsWorkspace } from './terra/Workspace.js';
import { ErrorBoundary } from '@terra-symposium/standards-error-boundaries/react';
import { DocsMarkdown } from './MarkdownContent.js';

// TYPES
import type { DocsAttachment, DocsLeaf, DocsSection } from '../lib/workspace-types.js';
import type { DocsHostAdapter, DocsHostTreeNode } from '../lib/host.js';
import type { DocsNavNode } from './navigation.js';
import type { DocsQuizConfig } from './quiz.js';
import type { JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * Matches surrounding slashes when normalizing a storage path.
 *
 * @return A regular expression used to remove leading and trailing slashes.
 */
const G_REGEX = () => TerraQualityRegex.REGEX_G_REGEX_35();
const SHARED_REGEX = TerraQualityRegex.REGEX_PATTERN_REGEX_3();

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Converts a title or identifier into the stable path segment used by the workspace.
 *
 * @param value Title or identifier to normalize.
 *
 * @return A lowercase hyphenated slug, or `index` when no characters remain.
 */
const slug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(TerraQualityRegex.REGEX_A_Z0_9_G_REGEX(), '-')
    .replace(TerraQualityRegex.REGEX_G_REGEX_20(), '') || 'index';
/**
 * Normalizes a route for comparison while preserving its fragment identifier.
 *
 * @param value Route or URL returned by the host.
 *
 * @return Path and fragment without a trailing path slash, or the original value if parsing fails.
 */
const routeKey = (value: string): string => {
  try {
    const url = new URL(value, 'http://docs.local');
    return `${url.pathname.replace(SHARED_REGEX, '') || '/'}${url.hash}`;
  } catch {
    return value;
  }
};
/**
 * Converts a route or URL into the key used by the local Docs content store.
 *
 * @param value Route or URL for a Docs leaf.
 *
 * @return Storage key without surrounding slashes, defaulting to `index.mdx` on an empty path.
 */
const storageKey = (value: string): string => {
  try {
    const url = new URL(value, 'http://docs.local');
    return (url.pathname.replace(G_REGEX(), '') || 'index.mdx') + url.hash;
  } catch {
    return value.replace(G_REGEX(), '') || 'index.mdx';
  }
};
/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Signals that static content is visible after the workspace transition completes.
 *
 * @param children Markdown or MDX content to reveal when the workspace is ready.
 *
 * @return The content fragment after marking the view surface as ready.
 */
function StaticContentSlot({ children }: { children: ReactNode }): JSX.Element {
  useEffect(() => {
    $surfaceReady.set('view');
    document.dispatchEvent(new Event('docs:surface-ready'));
  }, [useTransitionState()]);
  return <>{children}</>;
}

/**
 * Adapts a host's local Markdown pages to the original, read-only Docs workspace.
 *
 * @param title Site title shown by the host's shared Docs chrome.
 * @param homeHref Destination for the site brand link.
 * @param description Supporting site description shown in the sidebar.
 * @param pageTitle Current page title used by navigation and document metadata.
 * @param hue Optional Styling hue applied to the workspace palette.
 * @param nodes Navigation tree used when explicit sections are not provided.
 * @param sections Resolved section and leaf data for the current Docs tree.
 * @param currentPath Browser path used to select and identify the current page.
 * @param rootPath Host Docs root used when building fallback routes.
 * @param markdown Markdown source converted when no structured content is supplied.
 * @param content Pre-parsed content value used by the shared workspace.
 * @param attachments Attachments available to the current page.
 * @param updatedAt Optional document update timestamp.
 * @param renderContent Optional static React body supplied by the host.
 * @param children Fallback body content when `renderContent` is absent.
 * @param staticContent Whether page content is already static and can skip editor transition work.
 * @param quiz Optional host-owned quiz toolbar and generation callback.
 *
 * @return The Docs workspace configured for read-only navigation and page viewing.
 */
export function DocsStaticWorkspace({
  title,
  homeHref = '/',
  description,
  pageTitle,
  hue,
  nodes = [],
  sections,
  currentPath,
  rootPath = '/',
  markdown = '',
  content,
  attachments = [],
  updatedAt,
  renderContent,
  children,
  staticContent = false,
  quiz,
}: {
  title: string;
  homeHref?: string;
  description?: string;
  pageTitle?: string;
  hue?: number | null;
  nodes?: DocsNavNode[];
  sections?: DocsSection[];
  currentPath: string;
  rootPath?: string;
  markdown?: string;
  content?: unknown;
  attachments?: DocsAttachment[];
  updatedAt?: string;
  renderContent?: ReactNode;
  children?: ReactNode;
  staticContent?: boolean;
  /** Optional ephemeral quiz flow backed by the static host's server endpoint. */
  quiz?: DocsQuizConfig;
}): JSX.Element {
  /**
   * Adapts the host's nested navigation model to the shared Docs section/group shape.
   * @param navigation Ordered navigation sections with optional linked children.
   * @returns Docs sections preserving grouping, link metadata, and display order.
   */
  const sectionsFromNavigation = (navigation: DocsNavNode[]): DocsSection[] => {
    /**
     * Converts a linked navigation node to its page metadata and skips branch-only entries.
     * @param node Navigation item whose `href` determines whether it represents a page.
     * @returns Docs leaf metadata for linked items, or `null` for items without a URL.
     */
    const toLeaf = (node: DocsNavNode): DocsLeaf | null =>
      node.href
        ? {
            ...(node.id ? { id: node.id } : {}),
            ...(node.path ? { path: node.path } : {}),
            title: node.title,
            href: node.href,
            ...(node.description ? { description: node.description } : {}),
            ...(node.hue !== undefined ? { hue: node.hue } : {}),
            ...(node.updatedAt ? { updatedAt: node.updatedAt } : {}),
            ...(node.attachments ? { attachments: node.attachments } : {}),
          }
        : null;
    return navigation.map((s) => {
      const children = s.children ?? [];
      return {
        ...(s.id ? { id: s.id } : {}),
        ...(s.path ? { path: s.path } : {}),
        ...(s.hue !== undefined ? { hue: s.hue } : {}),
        title: s.title,
        groups: children.some((node) => Boolean(node.children?.length))
          ? children.map((group) => ({
              ...(group.id ? { id: group.id } : {}),
              ...(group.path ? { path: group.path } : {}),
              ...(group.hue !== undefined ? { hue: group.hue } : {}),
              title: group.title,
              leaves: (group.children ?? [])
                .map(toLeaf)
                .filter((leaf): leaf is DocsLeaf => leaf !== null),
            }))
          : [
              {
                title: s.title,
                leaves: (children.length ? children : [s])
                  .map(toLeaf)
                  .filter((leaf): leaf is DocsLeaf => leaf !== null),
              },
            ],
      };
    });
  };
  const workspaceSections: DocsSection[] = sections ?? sectionsFromNavigation(nodes);
  const theme = hue === undefined ? undefined : docsHueTheme(hue);
  const allLeaves = workspaceSections.flatMap((s, v) =>
    s.groups.flatMap((group, groupIndex) =>
      group.leaves.map((leaf, leafIndex) => ({
        section: s,
        group,
        leaf,
        sectionIndex: v,
        groupIndex,
        leafIndex,
      })),
    ),
  );
  const a =
    allLeaves.find((i) => routeKey(i.leaf.href) === routeKey(currentPath)) ??
    allLeaves.find((i) => routeKey(i.leaf.href) === routeKey(rootPath)) ??
    allLeaves[0];
  const docContent = Array.isArray(content) ? content : markdownToDocsValue(markdown);
  const markdownSource = markdown.trim()
    ? markdown
    : Array.isArray(content)
      ? docsValueToMarkdown(content as Parameters<typeof docsValueToMarkdown>[0])
      : '';
  const contentSlot =
    renderContent ??
    children ??
    (markdownSource ? <DocsMarkdown markdown={markdownSource} /> : undefined);
  const readyContent =
    contentSlot !== undefined || staticContent ? (
      <StaticContentSlot key={currentPath}>{contentSlot ?? null}</StaticContentSlot>
    ) : undefined;
  const tree: DocsHostTreeNode[] = workspaceSections.map((s) => {
    const sectionId = s.id ?? slug(s.title);
    return {
      type: 'branch',
      origName: sectionId,
      title: s.title,
      path: s.path ?? sectionId,
      ...(s.hue !== undefined ? { hue: s.hue } : {}),
      url: s.groups[0]?.leaves[0]?.href ?? rootPath,
      permission: 'read',
      children: s.groups.map((group) => {
        const groupKey = `${sectionId}/${group.id ?? slug(group.title)}`;
        return {
          type: 'branch',
          origName: group.id ?? groupKey,
          title: group.title,
          path: group.path ?? groupKey,
          ...(group.hue !== undefined ? { hue: group.hue } : {}),
          permission: 'read',
          children: group.leaves.map((leaf) => ({
            type: 'leaf',
            origName: leaf.id ?? `${groupKey}/${slug(leaf.title)}`,
            title: leaf.title,
            path: leaf.path ?? storageKey(leaf.href),
            url: leaf.href,
            permission: 'read',
            ...(leaf.hue !== undefined ? { hue: leaf.hue } : {}),
            ...(leaf.description ? { description: leaf.description } : {}),
            ...(leaf.updatedAt ? { updatedAt: leaf.updatedAt } : {}),
          })),
        };
      }),
    };
  });
  return (
    <div className="docs-theme-scope" {...(theme ? { style: theme } : {})}>
      <ErrorBoundary
        name="Docs workspace"
        resetKey={currentPath}
        onError={(e, c) => console.error(`[${c.name}]`, e, c.componentStack)}
        fallback={(e) => (
          <section
            aria-labelledby="docs-workspace-error-title"
            className="mx-auto my-12 max-w-2xl rounded-xl border border-primary-7 bg-primary-2 p-6 text-primary-12"
            role="alert"
          >
            <h1 className="mb-2 mt-0 text-xl font-semibold" id="docs-workspace-error-title">
              Documentation unavailable
            </h1>
            <p className="mb-4">The Docs workspace could not render this page.</p>
            <pre className="mb-4 overflow-auto whitespace-pre-wrap break-words rounded-md bg-primary-3 p-3 text-sm">
              {e.message}
            </pre>
            <Button onClick={() => window.location.reload()} variant="primary-tonal">
              Reload page
            </Button>
          </section>
        )}
      >
        <DocsWorkspace
          host={
            {
              navigationMode: 'document',
              capabilities: {
                read: true,
                write: false,
                reorder: false,
                attachments: false,
                export: false,
                history: false,
                publish: false,
              },
              rootPath,
              homePath: homeHref,
              siteTitle: title,
              ...(description ? { siteDescription: description } : {}),
              /**
               * Builds a page URL from the section, group, and leaf identifiers supplied by the workspace.
               *
               * @param sectionId Section identifier from the route state.
               * @param groupId Optional group identifier within the section.
               * @param leafId Optional leaf identifier within the group.
               *
               * @return The matching page URL, or `rootPath` when no page matches.
               */
              buildRoute(sectionId, groupId, leafId) {
                return (
                  allLeaves.find(
                    (i) =>
                      (i.section.id ?? slug(i.section.title)) === sectionId &&
                      (groupId === undefined || (i.group.id ?? slug(i.group.title)) === groupId) &&
                      (leafId === undefined || (i.leaf.id ?? slug(i.leaf.title)) === leafId),
                  )?.leaf.href ?? rootPath
                );
              },
              /**
               * Resolves a page URL into the route identifiers used by the workspace.
               *
               * @param value Page URL selected by the host or Docs navigation.
               *
               * @return Matching section, group, and leaf identifiers with the canonical pathname.
               */
              resolveRoute(value) {
                const match = allLeaves.find((i) => routeKey(i.leaf.href) === routeKey(value)) ?? a;
                return {
                  sectionId: match?.section.id ?? slug(match?.section.title ?? 'index'),
                  groupId: match?.group.id ?? slug(match?.group.title ?? 'index'),
                  leafId: match?.leaf.id ?? slug(match?.leaf.title ?? 'index'),
                  targetId: match?.leaf.id ?? slug(match?.leaf.title ?? 'index'),
                  pathname: match?.leaf.href ?? rootPath,
                };
              },
              /**
               * Makes a relative path root-relative while preserving absolute URLs and paths.
               *
               * @param path Route or asset path requested by a Docs action.
               *
               * @return The original absolute path or a path prefixed by the host root.
               */
              routePath(path) {
                if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('/')) return path;
                return `${rootPath.replace(SHARED_REGEX, '')}/${path}`;
              },
              /**
               * Handles the read-only operations exposed by the local Docs host adapter.
               *
               * @param op Read operation requested by a Docs workspace feature.
               * @param input Optional operation-specific path or list request.
               *
               * @return Read data for supported operations or an error for unsupported operations.
               */
              async invoke<T = unknown>(
                op: import('../lib/host.js').DocsActionOperation,
                input?: unknown,
              ): Promise<{ data?: T; error?: unknown }> {
                let data: unknown;
                if (op === 'read.doc.list') {
                  const request = input as { type?: string; path?: string } | undefined;
                  if (request?.type === 'nav') data = tree;
                  else if (request?.type === 'folderEntries') {
                    const folder = (request.path ?? '').replace(G_REGEX(), '');
                    data = allLeaves
                      .filter(
                        (i) =>
                          !folder ||
                          (i.leaf.path ?? i.leaf.href)
                            .replace(TerraQualityRegex.REGEX_PATTERN_REGEX_6(), '')
                            .startsWith(`${folder}/`),
                      )
                      .map((i) => i.leaf.path ?? i.leaf.href);
                  } else data = [];
                } else if (op === 'read.doc.get') {
                  /**
                   * Finds a leaf by route while retaining the active-page fallback.
                   * @param path Optional source path or route supplied by the reader action.
                   * @returns The matching leaf, or the active leaf when no path was requested.
                   */
                  const leafForPath = (path?: string): DocsLeaf | undefined => {
                    if (!path) return a?.leaf;
                    return allLeaves.find(
                      (i) =>
                        routeKey(i.leaf.href) === routeKey(path) ||
                        storageKey(i.leaf.path ?? i.leaf.href) === storageKey(path),
                    )?.leaf;
                  };
                  const selected =
                    leafForPath((input as { path?: string } | undefined)?.path) ?? a?.leaf;
                  if (
                    selected &&
                    typeof window !== 'undefined' &&
                    routeKey(selected.href) !== routeKey(currentPath)
                  ) {
                    window.location.assign(selected.href);
                  }
                  data = selected
                    ? {
                        path: selected.path ?? selected.href,
                        pathname: selected.href,
                        title: selected.title,
                        description: selected.description,
                        updatedAt: selected.updatedAt ?? updatedAt,
                        source: markdown,
                        content: docContent,
                      }
                    : null;
                } else if (op === 'read.doc.attachments') {
                  data = (a?.leaf.attachments ?? attachments).map((i, v) => ({
                    id: String(v),
                    name: i.title,
                    path: i.href,
                    ...(i.type ? { type: i.type } : {}),
                    ...(i.size !== undefined ? { size: i.size } : {}),
                  }));
                } else if (op === 'read.util.pathname') {
                  data = currentPath;
                } else if (op === 'read.util.node') {
                  data = {
                    title: a?.leaf.title ?? pageTitle ?? title,
                    origName: slug(a?.leaf.title ?? pageTitle ?? title),
                  };
                } else if (op === 'read.tsdocs') {
                  data = { scopes: [] };
                } else if (op === 'read.asset.get') {
                  data = new ArrayBuffer(0);
                } else {
                  return {
                    error: new Error(`The local Docs provider does not implement ${op}.`),
                  };
                }
                return { data: data as T };
              },
            } satisfies DocsHostAdapter
          }
          tree={tree}
          pathname={currentPath}
          permission="read"
          path={a?.leaf.path ?? a?.leaf.href ?? currentPath}
          title={pageTitle ?? a?.leaf.title ?? title}
          {...(a?.leaf.description ? { description: a.leaf.description } : {})}
          {...((a?.leaf.updatedAt ?? updatedAt)
            ? { updatedAt: a?.leaf.updatedAt ?? updatedAt }
            : {})}
          source={markdown}
          content={docContent}
          staticContent={staticContent}
          {...(quiz ? { quiz } : {})}
          {...(readyContent !== undefined ? { renderContent: readyContent } : {})}
        />
      </ErrorBoundary>
    </div>
  );
}

/**
 * src/components/StaticWorkspace.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { $surfaceReady, useTransitionState } from '../lib/terra/docs/state.js';
import { docsHueTheme } from '../lib/docs-theme.js';
import { markdownToDocsValue } from '../lib/markdown-model.js';
import { useEffect } from 'react';

// COMPONENTS
import { Button } from '@terra-symposium/styling/ui';
import { ErrorBoundary } from '@terra-symposium/standards-error-boundaries/react';
import { DocsWorkspace } from './terra/Workspace.js';
import type { DocsQuizConfig } from './quiz.js';

// TYPES
import type { DocsAttachment, DocsLeaf, DocsSection } from '../lib/workspace-types.js';
import type { DocsHostAdapter, DocsHostAttachment, DocsHostTreeNode } from '../lib/host.js';
import type { DocsNavNode } from './navigation.js';
import type { JSX, ReactNode } from 'react';
import * as TerraQualityRegex from '../lib/terra/regex.mjs';

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

/** Properties used to build a host-independent, read-only Docs workspace. */
type Props = {
  title: string;
  homeHref?: string;
  description?: string;
  pageTitle?: string;
  pageDescription?: string;
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
};

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
    .replace(/^-|-$/g, '') || 'index';
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

/** Returns whether a Docs leaf owns the requested route, including nested subpages. */
const routeOwnsPath = (leafRoute: string, requestedRoute: string): boolean => {
  const leaf = routeKey(leafRoute).split('#', 1)[0] ?? '';
  const requested = routeKey(requestedRoute).split('#', 1)[0] ?? '';
  return requested === leaf || requested.startsWith(`${leaf.replace(SHARED_REGEX, '')}/`);
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
/**
 * Converts the host's nested navigation nodes into Docs sections and leaf records.
 *
 * @param nodes Navigation roots supplied by the host site.
 *
 * @return Sections that preserve the source grouping and include only linked pages as leaves.
 */
function sectionsFromNavigation(nodes: DocsNavNode[]): DocsSection[] {
  /**
   * Converts a linked navigation node to a Docs leaf while ignoring non-link groups.
   *
   * @param node Navigation node to map.
   *
   * @return Leaf metadata when the node has an `href`, otherwise `null`.
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
  return nodes.map((section) => {
    const children = section.children ?? [];
    const groups = children.length
      ? children.map((group) => ({
          ...(group.id ? { id: group.id } : {}),
          ...(group.path ? { path: group.path } : {}),
          ...(group.hue !== undefined ? { hue: group.hue } : {}),
          title: group.title,
          leaves: (group.children?.length ? group.children : [group])
            .map(toLeaf)
            .filter((leaf): leaf is DocsLeaf => leaf !== null),
        }))
      : [
          {
            title: section.title,
            leaves: [section].map(toLeaf).filter((leaf): leaf is DocsLeaf => leaf !== null),
          },
        ];
    return {
      ...(section.id ? { id: section.id } : {}),
      ...(section.path ? { path: section.path } : {}),
      ...(section.hue !== undefined ? { hue: section.hue } : {}),
      title: section.title,
      groups,
    };
  });
}

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Signals that static content is visible after the workspace transition completes.
 *
 * @param props Component props containing the host-rendered content.
 * @param props.children Markdown or MDX content to reveal when the workspace is ready.
 *
 * @return The content fragment after marking the view surface as ready.
 */
function StaticContentSlot({ children }: { children: ReactNode }): JSX.Element {
  const transition = useTransitionState();
  useEffect(() => {
    $surfaceReady.set('view');
    document.dispatchEvent(new Event('docs:surface-ready'));
  }, [transition]);
  return <>{children}</>;
}

/**
 * Adapts a host's local Markdown pages to the original, read-only Docs workspace.
 *
 * @param props Page content, navigation, attachment metadata, and optional host render slots.
 *
 * @return The Docs workspace configured for read-only navigation and page viewing.
 */
export function DocsStaticWorkspace({
  title,
  homeHref = '/',
  description,
  pageTitle,
  pageDescription,
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
}: Props): JSX.Element {
  const workspaceSections: DocsSection[] = sections ?? sectionsFromNavigation(nodes);
  const theme = hue === undefined ? undefined : docsHueTheme(hue);
  const currentKey = routeKey(currentPath);
  const allLeaves = workspaceSections.flatMap((section, sectionIndex) =>
    section.groups.flatMap((group, groupIndex) =>
      group.leaves.map((leaf, leafIndex) => ({
        section,
        group,
        leaf,
        sectionIndex,
        groupIndex,
        leafIndex,
      })),
    ),
  );
  const a =
    allLeaves.find((i) => routeKey(i.leaf.href) === currentKey) ??
    allLeaves
      .filter((i) => routeOwnsPath(i.leaf.href, currentPath))
      .sort(
        (left, right) => routeKey(right.leaf.href).length - routeKey(left.leaf.href).length,
      )[0] ??
    allLeaves.find((i) => routeKey(i.leaf.href) === routeKey(rootPath)) ??
    allLeaves[0];
  const currentAttachments = a?.leaf.attachments ?? attachments;
  const docPath = a?.leaf.href ?? currentPath;
  const effectivePageDescription = pageDescription ?? a?.leaf.description;
  const docContent = Array.isArray(content) ? content : markdownToDocsValue(markdown);
  const contentSlot = renderContent ?? children;
  const readyContent =
    contentSlot !== undefined || staticContent ? (
      <StaticContentSlot key={currentPath}>{contentSlot ?? null}</StaticContentSlot>
    ) : undefined;
  const tree: DocsHostTreeNode[] = workspaceSections.map((section) => {
    const sectionId = section.id ?? slug(section.title);
    return {
      type: 'branch',
      origName: sectionId,
      title: section.title,
      path: section.path ?? sectionId,
      ...(section.hue !== undefined ? { hue: section.hue } : {}),
      url: section.groups[0]?.leaves[0]?.href ?? rootPath,
      permission: 'read',
      children: section.groups.map((group) => {
        const groupId = group.id ?? slug(group.title);
        const groupKey = `${sectionId}/${groupId}`;
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
  /**
   * Resolves a host route or storage path to the matching leaf, falling back to the current page.
   *
   * @param path Route or content-store path requested by the host.
   *
   * @return Matching leaf metadata, the current page for an empty path, or `undefined`.
   */
  const leafForPath = (path?: string): DocsLeaf | undefined => {
    if (!path) return a?.leaf;
    const requestedRoute = routeKey(path);
    const requestedStoragePath = storageKey(path);
    return (
      allLeaves.find(
        (i) =>
          routeKey(i.leaf.href) === requestedRoute ||
          storageKey(i.leaf.path ?? i.leaf.href) === requestedStoragePath,
      )?.leaf ??
      allLeaves
        .filter((i) => routeOwnsPath(i.leaf.href, path))
        .sort(
          (left, right) => routeKey(right.leaf.href).length - routeKey(left.leaf.href).length,
        )[0]?.leaf
    );
  };
  const hostAttachments: DocsHostAttachment[] = currentAttachments.map((i, v) => ({
    id: String(v),
    name: i.title,
    path: i.href,
    ...(i.type ? { type: i.type } : {}),
    ...(i.size !== undefined ? { size: i.size } : {}),
  }));
  const host: DocsHostAdapter = {
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
      const found = allLeaves.find(
        (i) =>
          (i.section.id ?? slug(i.section.title)) === sectionId &&
          (groupId === undefined || (i.group.id ?? slug(i.group.title)) === groupId) &&
          (leafId === undefined || (i.leaf.id ?? slug(i.leaf.title)) === leafId),
      );
      return found?.leaf.href ?? rootPath;
    },
    /**
     * Resolves a page URL into the route identifiers used by the workspace.
     *
     * @param value Page URL selected by the host or Docs navigation.
     *
     * @return Matching section, group, and leaf identifiers with the canonical pathname.
     */
    resolveRoute(value) {
      const match =
        allLeaves.find((i) => routeKey(i.leaf.href) === routeKey(value)) ??
        allLeaves
          .filter((i) => routeOwnsPath(i.leaf.href, value))
          .sort(
            (left, right) => routeKey(right.leaf.href).length - routeKey(left.leaf.href).length,
          )[0] ??
        a;
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
                (i.leaf.path ?? i.leaf.href).replace(/^\/+/, '').startsWith(`${folder}/`),
            )
            .map((i) => i.leaf.path ?? i.leaf.href);
        } else data = [];
      } else if (op === 'read.doc.get') {
        const request = input as { path?: string } | undefined;
        const selected = leafForPath(request?.path) ?? a?.leaf;
        if (
          selected &&
          typeof window !== 'undefined' &&
          !routeOwnsPath(selected.href, currentPath)
        ) {
          window.location.assign(selected.href);
        }
        data = selected
          ? {
              path: selected.path ?? selected.href,
              pathname: routeOwnsPath(selected.href, currentPath) ? currentPath : selected.href,
              title: pageTitle ?? selected.title,
              description: pageDescription ?? selected.description,
              updatedAt: selected.updatedAt ?? updatedAt,
              source: markdown,
              content: docContent,
            }
          : null;
      } else if (op === 'read.doc.attachments') {
        data = hostAttachments;
      } else if (op === 'read.util.pathname') {
        data = currentPath;
      } else if (op === 'read.util.node') {
        data = {
          title: pageTitle ?? a?.leaf.title ?? title,
          origName: slug(pageTitle ?? a?.leaf.title ?? title),
        };
      } else if (op === 'read.tsdocs') {
        data = { scopes: [] };
      } else if (op === 'read.asset.get') {
        data = new ArrayBuffer(0);
      } else {
        return { error: new Error(`The local Docs provider does not implement ${op}.`) };
      }
      return { data: data as T };
    },
  };
  return (
    <div className="docs-theme-scope" {...(theme ? { style: theme } : {})}>
      <ErrorBoundary
        name="Docs workspace"
        resetKey={currentPath}
        onError={(error, context) =>
          console.error(`[${context.name}]`, error, context.componentStack)
        }
        fallback={(error) => (
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
              {error.message}
            </pre>
            <Button onClick={() => window.location.reload()} variant="primary-tonal">
              Reload page
            </Button>
          </section>
        )}
      >
        <DocsWorkspace
          host={host}
          tree={tree}
          pathname={currentPath}
          permission="read"
          path={a?.leaf.path ?? docPath}
          title={pageTitle ?? a?.leaf.title ?? title}
          {...(effectivePageDescription ? { description: effectivePageDescription } : {})}
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

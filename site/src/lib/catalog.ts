/**
 * site/src/lib/catalog.ts
 */

/// <reference types="vite/client" />

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { getHue } from '@terra-symposium/styling';

// TYPES
import type { DocsNavNode } from '../../../src/components/navigation.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * Matches hyphens and underscores that separate words in route labels.
 *
 * @return A global regular expression for replacing route word separators.
 */
const G_REGEX = () => /[-_]+/g;
/**
 * Matches the first Unicode letter after a word boundary for title capitalization.
 *
 * @return A global Unicode-aware regular expression for capitalizing word initials.
 */
const B_P_L_GU_REGEX = () => /\b\p{L}/gu;
/**
 * Matches leading or trailing slashes that should be removed from a path.
 *
 * @return A regular expression that matches leading or trailing slashes.
 */
const G_CLASS_2 = () => /^\/+|\/+$/g;
/** Matches a leading YAML frontmatter block in a Markdown or MDX page. */
const S_N_S_S_N_S_N_REGEX = /^---\s*\n[\s\S]*?\n---\s*\n/;
type SidebarFrontmatter = { label?: string; order?: number; hidden?: boolean };
type DocsFrontmatter = {
  title?: string;
  description?: string;
  hue?: number | null;
  label?: string;
  order?: number;
  hidden?: boolean;
  visibility?: 'visible' | 'hidden';
  sidebar?: SidebarFrontmatter;
};
type ContentModule = { Content?: unknown; default?: unknown; frontmatter?: DocsFrontmatter };
/**
 * Renderable Docs page metadata derived from its Markdown source and frontmatter.
 */
export type SitePage = {
  file: string;
  slug: string;
  title: string;
  sidebarLabel?: string;
  description: string;
  hue?: number | null;
  hidden: boolean;
  order: number;
  content: unknown;
  markdown: string;
};
const modules = import.meta.glob<ContentModule>('/docs/**/*.{md,mdx}', { eager: true });
const sources = import.meta.glob<string>('/docs/**/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const base = import.meta.env.BASE_URL;
const routes = new Map<string, string>();
/** Visible Docs pages sorted by configured sidebar order and source path. */
export const sitePages: SitePage[] = Object.entries(modules)
  .map(([file, module]) => {
    const slug = routeForFile(file);
    const previous = routes.get(slug);
    if (previous) throw new Error(`Duplicate Docs route "${slug || '/'}": ${previous} and ${file}`);
    routes.set(slug, file);
    const markdown = sources[file] ?? '';
    const frontmatter = module.frontmatter ?? {};
    return {
      file,
      slug,
      title: frontmatter.title ?? titleFromSource(markdown, slug),
      ...((frontmatter.sidebar?.label ?? frontmatter.label)
        ? { sidebarLabel: frontmatter.sidebar?.label ?? frontmatter.label }
        : {}),
      description: frontmatter.description ?? '',
      ...(frontmatter.hue !== undefined ? { hue: frontmatter.hue } : {}),
      hidden:
        frontmatter.sidebar?.hidden ?? frontmatter.hidden ?? frontmatter.visibility === 'hidden',
      order: frontmatter.sidebar?.order ?? frontmatter.order ?? Number.MAX_SAFE_INTEGER,
      content: module.Content ?? module.default,
      markdown: markdown.replace(S_N_S_S_N_S_N_REGEX, ''),
    };
  })
  .sort((left, right) => left.order - right.order || left.file.localeCompare(right.file));
type MutableNode = Omit<DocsNavNode, 'children'> & { children: Map<string, MutableNode> };
const rootNodes = new Map<string, MutableNode>();

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Resolves a page title from its first heading or, when absent, its route slug.
 *
 * @param source Markdown source after import, including optional frontmatter.
 * @param slug Normalized route path used as the title fallback.
 *
 * @return The authored heading or a title-cased final route segment.
 */
function titleFromSource(source: string, slug: string): string {
  const body = source.replace(S_N_S_S_N_S_N_REGEX, '');
  const heading = /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1]?.trim();
  if (heading) return heading;
  const name = slug.split('/').at(-1) || 'Overview';
  return name.replace(G_REGEX(), ' ').replace(B_P_L_GU_REGEX(), (letter) => letter.toUpperCase());
}

/**
 * Converts a Markdown or MDX file path into its slash-delimited route slug.
 *
 * @param file Vite glob path for the source page.
 *
 * @return The page path without its extension or trailing `index` segment.
 */
function routeForFile(file: string): string {
  const relative = file.replace(/^\/?docs\//, '').replace(/\.(?:md|mdx)$/i, '');
  return relative.replace(/(?:^|\/)index$/i, '').replace(G_CLASS_2(), '');
}

/**
 * Creates a display label from a route segment by replacing separators and capitalizing words.
 *
 * @param value Route segment to display in navigation.
 *
 * @return Human-readable navigation text.
 */
function label(value: string): string {
  return value.replace(G_REGEX(), ' ').replace(B_P_L_GU_REGEX(), (letter) => letter.toUpperCase());
}

/**
 * Builds the navigation fields associated with a page at its public route.
 *
 * @param page Page whose title, label, description, and hue supply the navigation metadata.
 * @param href Public URL for the page.
 *
 * @return The metadata fields to merge into its navigation node.
 */
function pageMetadata(page: SitePage, href: string): Partial<MutableNode> {
  return {
    id: page.slug || 'index',
    title: page.sidebarLabel ?? page.title,
    href,
    ...(page.description ? { description: page.description } : {}),
    ...(page.hue !== undefined ? { hue: page.hue } : {}),
  };
}

/**
 * Converts the mutable map-based navigation tree into the serializable Docs navigation shape.
 *
 * @param nodes Child nodes indexed by their route segment.
 *
 * @return Navigation nodes with nested children represented as arrays.
 */
function materialize(nodes: Map<string, MutableNode>): DocsNavNode[] {
  return [...nodes.values()].map(({ children, ...node }) => ({
    ...node,
    ...(children.size ? { children: materialize(children) } : {}),
  }));
}

/**
 * Builds the public URL for a page, respecting a configured deployment base path.
 *
 * @param slug Page route without a leading or trailing slash.
 * @param base Public base path, with or without its surrounding slashes.
 *
 * @return A route with a trailing slash for the Docs site.
 */
export function pageHref(slug: string, base = '/'): string {
  const prefix = base === '/' ? '' : `/${base.replace(G_CLASS_2(), '')}`;
  return slug ? `${prefix}/${slug}/` : `${prefix}/`;
}

/**
 * Looks up a page by its normalized route slug.
 *
 * @param slug Route slug to find.
 *
 * @return The matching page, or `undefined` when the catalog has no such route.
 */
export function pageForSlug(slug: string): SitePage | undefined {
  return sitePages.find((page) => page.slug === slug);
}
if (sitePages.length === 0)
  throw new Error(
    'No Markdown files found in docs/. Add docs/index.md to start a Terra Docs site.',
  );
for (const page of sitePages.filter((i) => !i.hidden && i.slug !== '404')) {
  const segments = page.slug.split('/').filter(Boolean);
  let currentNodes = rootNodes;
  let current: MutableNode | undefined;
  let prefix = '';
  if (segments.length === 0) {
    const overview = currentNodes.get('overview') ?? {
      id: 'overview',
      title: 'Overview',
      hue: getHue('Overview'),
      children: new Map(),
    };
    if (!currentNodes.has('overview')) currentNodes.set('overview', overview);
    Object.assign(overview, pageMetadata(page, pageHref('', base)));
    continue;
  }
  for (const segment of segments) {
    prefix = prefix ? `${prefix}/${segment}` : segment;
    let node = currentNodes.get(segment);
    if (!node) {
      node = {
        id: prefix,
        title: label(segment),
        ...(prefix === segment ? { hue: getHue(label(segment)) } : {}),
        children: new Map(),
      };
      currentNodes.set(segment, node);
    }
    current = node;
    currentNodes = node.children;
  }
  if (current) Object.assign(current, pageMetadata(page, pageHref(page.slug, base)));
}

/** Navigation tree built from the visible pages after their routes are registered. */
export const siteNavigation = materialize(rootNodes);

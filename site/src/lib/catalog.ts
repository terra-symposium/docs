/**
 * site/src/lib/catalog.ts
 */

/// <reference types="vite/client" />

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { getHue } from '@terra-symposium/styling';

// COMPONENTS
import * as TerraQualityRegex from '../../../src/lib/terra/regex.mjs';

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
const G_REGEX = () => TerraQualityRegex.REGEX_G_REGEX_8();
/**
 * Matches the first Unicode letter after a word boundary for title capitalization.
 *
 * @return A global Unicode-aware regular expression for capitalizing word initials.
 */
const B_P_L_GU_REGEX = () => TerraQualityRegex.REGEX_B_P_L_GU_REGEX();
/**
 * Matches leading or trailing slashes that should be removed from a path.
 *
 * @return A regular expression that matches leading or trailing slashes.
 */
const G_CLASS_2 = () => TerraQualityRegex.REGEX_G_REGEX_35();
/** Matches a leading YAML frontmatter block in a Markdown or MDX page. */
const S_N_S_S_N_S_N_REGEX = /^---\s*\n[\s\S]*?\n---\s*\n/;
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
const pageInputs = {
  modules: import.meta.glob<{
    Content?: unknown;
    default?: unknown;
    frontmatter?: {
      title?: string;
      description?: string;
      hue?: number | null;
      label?: string;
      order?: number;
      hidden?: boolean;
      visibility?: 'visible' | 'hidden';
      sidebar?: { label?: string; order?: number; hidden?: boolean };
    };
  }>('/docs/**/*.{md,mdx}', { eager: true }),
  sources: import.meta.glob<string>('/docs/**/*.{md,mdx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};
const base = import.meta.env.BASE_URL;
const routes = new Map<string, string>();
/** Visible Docs pages sorted by configured sidebar order and source path. */
export const sitePages: SitePage[] = Object.entries(pageInputs.modules)
  .filter(
    ([f]) =>
      import.meta.env.PUBLIC_DOCS_INCLUDE_AGENTS !== 'false' || !f.startsWith('/docs/agents/'),
  )
  .map(([f, m]) => {
    const relativeFile = f.replace(/^\/docs\//, '');
    if (
      !['index.md', 'index.mdx'].includes(relativeFile.toLowerCase()) &&
      !relativeFile.includes('/')
    )
      throw new Error(`Markdown pages must be grouped in folders directly under docs/: ${f}`);
    const slug = f
      .replace(/^\/?docs\//, '')
      .replace(TerraQualityRegex.REGEX_MD_MDX_I_REGEX_2(), '')
      .replace(TerraQualityRegex.REGEX_SKILL_I_REGEX(), '')
      .replace(TerraQualityRegex.REGEX_INDEX_I_REGEX_2(), '')
      .replace(G_CLASS_2(), '');
    if (routes.has(slug))
      throw new Error(`Duplicate Docs route "${slug || '/'}": ${routes.get(slug)} and ${f}`);
    routes.set(slug, f);
    const markdown = pageInputs.sources[f] ?? '';
    const frontmatter = m.frontmatter ?? {};
    return {
      file: f,
      slug,
      title:
        frontmatter.title ??
        (TerraQualityRegex.REGEX_S_S_S_M_REGEX()
          .exec(markdown.replace(S_N_S_S_N_S_N_REGEX, ''))?.[1]
          ?.trim() ||
          (slug.split('/').at(-1) || 'Overview')
            .replace(G_REGEX(), ' ')
            .replace(B_P_L_GU_REGEX(), (letter) => letter.toUpperCase())),
      ...((frontmatter.sidebar?.label ?? frontmatter.label)
        ? { sidebarLabel: frontmatter.sidebar?.label ?? frontmatter.label }
        : {}),
      description: frontmatter.description ?? '',
      ...(frontmatter.hue !== undefined ? { hue: frontmatter.hue } : {}),
      hidden:
        frontmatter.sidebar?.hidden ?? frontmatter.hidden ?? frontmatter.visibility === 'hidden',
      order: frontmatter.sidebar?.order ?? frontmatter.order ?? Number.MAX_SAFE_INTEGER,
      content: m.Content ?? m.default,
      markdown: markdown.replace(S_N_S_S_N_S_N_REGEX, ''),
    };
  })
  .sort((l, r) => l.order - r.order || l.file.localeCompare(r.file));
/** In-progress navigation node whose children are indexed by route segment. */
type MutableNode = Omit<DocsNavNode, 'children'> & { children: Map<string, MutableNode> };
const rootNodes = new Map<string, MutableNode>();
/** Navigation tree built from the visible pages after their routes are registered. */
export const siteNavigation: DocsNavNode[] = [];
const pending: { source: Map<string, MutableNode>; target: DocsNavNode[] }[] = [
  { source: rootNodes, target: siteNavigation },
];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates a display label from a route segment by replacing separators and capitalizing words.
 *
 * @param value Route segment to display in navigation.
 *
 * @return Human-readable navigation text.
 */
function label(value: string): string {
  return value.replace(G_REGEX(), ' ').replace(B_P_L_GU_REGEX(), (l) => l.toUpperCase());
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
  return sitePages.find((p) => p.slug === slug);
}

/**
 * Finds the first visible page leaf in the first available navigation section.
 *
 * @return The public URL for that page, or the site root when no section has a leaf.
 */
export function firstAvailableLeafHref(): string | undefined {
  const pending = [...siteNavigation].reverse();
  while (pending.length) {
    const node = pending.pop();
    if (!node) continue;
    if (node.children?.length) pending.push(...[...node.children].reverse());
    else if (node.href && node.href !== pageHref('', base)) {
      return node.href;
    }
  }
  const page = sitePages.find((i) => !i.hidden && i.slug && i.slug !== '404');
  return page ? pageHref(page.slug, base) : undefined;
}
if (sitePages.length === 0)
  throw new Error('No Markdown files found in docs/. Add docs/index.md to start a Docs site.');
for (const page of sitePages.filter((i) => !i.hidden && i.slug !== '' && i.slug !== '404')) {
  let currentNodes = rootNodes;
  let current: MutableNode | undefined;
  let prefix = '';
  for (const segment of page.slug.split('/').filter(Boolean)) {
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
  if (current)
    Object.assign(current, {
      id: page.slug || 'index',
      title: page.sidebarLabel ?? page.title,
      href: pageHref(page.slug, base),
      ...(page.description ? { description: page.description } : {}),
      ...(page.hue !== undefined ? { hue: page.hue } : {}),
    });
}
while (pending.length) {
  const branch = pending.pop();
  if (!branch) continue;
  for (const { children, ...node } of branch.source.values()) {
    const child: DocsNavNode = { ...node };
    if (children.size) {
      child.children = [];
      pending.push({ source: children, target: child.children });
    }
    branch.target.push(child);
  }
}

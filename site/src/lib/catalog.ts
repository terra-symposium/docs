/**
 * site/src/lib/catalog.ts
 */

/// <reference types="vite/client" />

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { getHue } from '@terra-symposium/styling';
import { parse as parseYaml } from 'yaml';
import { parseDocsAuthoredQuiz } from '../../../dist/lib/components/quiz.js';

// COMPONENTS
import * as TerraQualityRegex from '../../../src/lib/terra/regex.mjs';
import { siteImageUrls } from '../../../src/lib/local-markdown.js';

// TYPES
import type { DocsNavNode } from '../../../dist/lib/components/navigation.js';
import type { DocsAuthoredQuizDocument } from '../../../dist/lib/components/quiz.js';

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
 * Matches a numeric ordering prefix at the start of a route segment.
 *
 * @return A regular expression for extracting the leading numeric order.
 */
const ORDER_PREFIX_REGEX = () => /^(\d+)[-_]+/;
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
/**
 * Matches a leading YAML frontmatter block in a Markdown or MDX page.
 */
const S_N_S_S_N_S_N_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

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
  markdown: string;
  sourceMarkdown: string;
  authoredQuiz?: DocsAuthoredQuizDocument;
};
const pageInputs = import.meta.glob<string>('/docs/**/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const quizInputs = import.meta.glob<string>('/docs/**/quiz.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const leafDirectory = (file: string): string => file.replace(/(?:index\.mdx?|quiz\.json)$/, '');
const authoredQuizzes = new Map<string, DocsAuthoredQuizDocument>();
for (const [file, source] of Object.entries(quizInputs)) {
  try {
    authoredQuizzes.set(leafDirectory(file), parseDocsAuthoredQuiz(JSON.parse(source)));
  } catch (error) {
    throw new Error(
      `Invalid authored quiz in ${file}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
const base = import.meta.env.BASE_URL;
const routes = new Map<string, string>();
/**
 * Builds the page catalogue from repository Markdown and its frontmatter.
 *
 * @docsId frontmatter
 * @docsUseWhen Every repository-backed leaf needs a title and description before its body.
 * @docsConstraint Put title and description in frontmatter.
 * @docsConstraint Keep titles within 48 characters.
 * @docsConstraint Keep descriptions within 85 characters.
 * @docsConstraint Keep each metadata value on one line.
 * @docsConstraint Local navigation order comes from filenames.
 * @docsDo Describe the page purpose, not its source filename or format.
 * @docsDo Check host-specific metadata against that host’s schema before adding it.
 * @docsDo Use numbered filenames when setting local navigation order.
 * @docsDont Do not add metadata the catalogue does not read.
 * @docsDont Do not split a title or description across lines.
 * @docsTip Make metadata specific to the page.
 * @docsInsertionStep Put the YAML fence at the start of the Markdown leaf.
 * @docsInsertionStep Enter one-line title and description values.
 * @docsSyntax
 * ```mdx
 * ---
 * title: Save Docs edits
 * description: Receive editor changes and save them in the host.
 * ---
 *
 * ## Save edits
 * ```
 * @docsRenderedExample
 * # Save Docs edits
 *
 * *Receive editor changes and save them in the host.*
 *
 * ## Save edits
 */
export const sitePages: SitePage[] = Object.entries(pageInputs)
  .filter(
    ([f]) =>
      import.meta.env.PUBLIC_DOCS_INCLUDE_AGENTS !== 'false' || !f.startsWith('/docs/agents/'),
  )
  .map(([f, source]) => {
    const relativeFile = f.replace(/^\/docs\//, '');
    const authoredQuiz = authoredQuizzes.get(leafDirectory(f));
    if (
      !['index.md', 'index.mdx'].includes(relativeFile.toLowerCase()) &&
      !relativeFile.includes('/')
    )
      throw new Error(`Markdown pages must be grouped in folders directly under docs/: ${f}`);
    const slug = f
      .replace(TerraQualityRegex.REGEX_DOCS_REGEX_2(), '')
      .replace(TerraQualityRegex.REGEX_MD_MDX_I_REGEX_2(), '')
      .replace(TerraQualityRegex.REGEX_SKILL_I_REGEX(), '')
      .replace(TerraQualityRegex.REGEX_INDEX_I_REGEX_2(), '')
      .replace(G_CLASS_2(), '');
    if (routes.has(slug))
      throw new Error(`Duplicate Docs route "${slug || '/'}": ${routes.get(slug)} and ${f}`);
    routes.set(slug, f);
    const markdown = source ?? '';
    const frontmatterSource = S_N_S_S_N_S_N_REGEX.exec(markdown)?.[1] ?? '';
    let frontmatter: {
      title?: string;
      description?: string;
      hue?: number | null;
      label?: string;
      hidden?: boolean;
      visibility?: 'visible' | 'hidden';
      sidebar?: { label?: string; hidden?: boolean; order?: number };
      order?: number;
    };
    try {
      frontmatter = (parseYaml(frontmatterSource) ?? {}) as typeof frontmatter;
    } catch (error) {
      throw new Error(
        `Invalid Docs frontmatter in ${f}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    for (const [field, limit] of [
      ['title', 48],
      ['description', 85],
    ] as const) {
      const value = frontmatter[field];
      if (value === undefined) continue;
      if (typeof value !== 'string' || Array.from(value).length > limit)
        throw new Error(`Docs ${field} must be a string of at most ${limit} characters: ${f}`);
    }
    if ('order' in frontmatter || (frontmatter.sidebar && 'order' in frontmatter.sidebar))
      throw new Error(`Docs page order comes from its filename, not frontmatter: ${f}`);
    const title =
      frontmatter.title ??
      (TerraQualityRegex.REGEX_S_S_S_M_REGEX()
        .exec(markdown.replace(S_N_S_S_N_S_N_REGEX, ''))?.[1]
        ?.trim() ||
        (slug.split('/').at(-1) || 'Overview')
          .replace(G_REGEX(), ' ')
          .replace(B_P_L_GU_REGEX(), (initial) => initial.toUpperCase()));
    if (Array.from(title).length > 48)
      throw new Error(`Docs title must be at most 48 characters: ${f}`);
    return {
      file: f,
      slug,
      title,
      ...((frontmatter.sidebar?.label ?? frontmatter.label)
        ? { sidebarLabel: frontmatter.sidebar?.label ?? frontmatter.label }
        : {}),
      description: frontmatter.description ?? '',
      ...(frontmatter.hue !== undefined ? { hue: frontmatter.hue } : {}),
      hidden:
        frontmatter.sidebar?.hidden ?? frontmatter.hidden ?? frontmatter.visibility === 'hidden',
      markdown: siteImageUrls(markdown.replace(S_N_S_S_N_S_N_REGEX, ''), relativeFile, base),
      sourceMarkdown: markdown,
      ...(authoredQuiz ? { authoredQuiz } : {}),
    };
  })
  .sort((l, r) => l.file.localeCompare(r.file, undefined, { numeric: true }));
/**
 * In-progress navigation node whose children are indexed by route segment.
 */
type MutableNode = Omit<DocsNavNode, 'children'> & { children: Map<string, MutableNode> };
const rootNodes = new Map<string, MutableNode>();
/**
 * Navigation tree built from the visible pages after their routes are registered.
 */
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
  return value
    .replace(ORDER_PREFIX_REGEX(), '')
    .replace(G_REGEX(), ' ')
    .replace(B_P_L_GU_REGEX(), (l) => l.toUpperCase());
}

/**
 * Removes a route's numeric ordering prefix from its displayed page title.
 *
 * @param title Authored or generated page title.
 * @param routeSegment Final route segment associated with the page.
 *
 * @return The title without the route's ordering prefix when present.
 */
function pageNavigationTitle(title: string, routeSegment: string): string {
  const prefix = ORDER_PREFIX_REGEX().exec(routeSegment)?.[1];
  if (!prefix) return title;
  return title.replace(new RegExp(`^\\s*${prefix}[-_\\s]+`), '').trim();
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
 * Finds the first visible leaf in the first available navigation tree.
 *
 * @return The public URL for that leaf, or the site root when no tree has a leaf.
 */
export function firstAvailableLeafHref(): string | undefined {
  const pending = [...siteNavigation].reverse();
  let agentLeaf: string | undefined;
  while (pending.length) {
    const node = pending.pop();
    if (!node) continue;
    if (node.children?.length) pending.push(...[...node.children].reverse());
    else if (node.href && node.href !== pageHref('', base)) {
      if (!node.id.startsWith('agents/')) return node.href;
      agentLeaf ??= node.href;
    }
  }
  if (agentLeaf) return agentLeaf;
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
      title: pageNavigationTitle(
        page.sidebarLabel ?? page.title,
        page.slug.split('/').at(-1) ?? '',
      ),
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

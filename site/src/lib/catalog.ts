/// <reference types="vite/client" />

import type { DocsNavNode } from '../../../src/components/navigation.js';

type SidebarFrontmatter = {
  label?: string;
  order?: number;
  hidden?: boolean;
};

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

type ContentModule = {
  Content?: unknown;
  default?: unknown;
  frontmatter?: DocsFrontmatter;
};

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

function titleFromSource(source: string, slug: string): string {
  const body = source.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const heading = /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1]?.trim();
  if (heading) return heading;
  const name = slug.split('/').at(-1) || 'Overview';
  return name.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function routeForFile(file: string): string {
  const relative = file.replace(/^\/?docs\//, '').replace(/\.(?:md|mdx)$/i, '');
  return relative.replace(/(?:^|\/)index$/i, '').replace(/^\/+|\/+$/g, '');
}

const routes = new Map<string, string>();
export const sitePages: SitePage[] = Object.entries(modules)
  .map(([file, module]) => {
    const slug = routeForFile(file);
    const previous = routes.get(slug);
    if (previous) {
      throw new Error(`Duplicate Docs route "${slug || '/'}": ${previous} and ${file}`);
    }
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
      markdown: markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, ''),
    };
  })
  .sort((left, right) => left.order - right.order || left.file.localeCompare(right.file));

if (sitePages.length === 0) {
  throw new Error(
    'No Markdown files found in docs/. Add docs/index.md to start a Terra Docs site.',
  );
}

type MutableNode = Omit<DocsNavNode, 'children'> & { children: Map<string, MutableNode> };
const rootNodes = new Map<string, MutableNode>();

function label(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

for (const page of sitePages.filter((item) => !item.hidden && item.slug !== '404')) {
  const segments = page.slug.split('/').filter(Boolean);
  let currentNodes = rootNodes;
  let current: MutableNode | undefined;
  let prefix = '';
  if (segments.length === 0) {
    const overview = currentNodes.get('overview') ?? {
      id: 'overview',
      title: 'Overview',
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
      node = { id: prefix, title: label(segment), children: new Map() };
      currentNodes.set(segment, node);
    }
    current = node;
    currentNodes = node.children;
  }
  if (current) Object.assign(current, pageMetadata(page, pageHref(page.slug, base)));
}

function pageMetadata(page: SitePage, href: string): Partial<MutableNode> {
  return {
    id: page.slug || 'index',
    title: page.sidebarLabel ?? page.title,
    href,
    ...(page.description ? { description: page.description } : {}),
    ...(page.hue !== undefined ? { hue: page.hue } : {}),
  };
}

function materialize(nodes: Map<string, MutableNode>): DocsNavNode[] {
  return [...nodes.values()].map(({ children, ...node }) => ({
    ...node,
    ...(children.size ? { children: materialize(children) } : {}),
  }));
}

export const siteNavigation = materialize(rootNodes);

export function pageHref(slug: string, base = '/'): string {
  const prefix = base === '/' ? '' : `/${base.replace(/^\/+|\/+$/g, '')}`;
  return slug ? `${prefix}/${slug}/` : `${prefix}/`;
}

export function pageForSlug(slug: string): SitePage | undefined {
  return sitePages.find((page) => page.slug === slug);
}

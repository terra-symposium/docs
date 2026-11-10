/**
 * site/base-path-remark-plugin.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import * as TerraQualityRegex from '../../src/lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Prefixes a site-local absolute URL with the configured deployment base, leaving external and already-prefixed paths alone.
 * @param value Markdown or JSX URL value to adjust.
 * @param base Astro deployment base such as `/docs/`.
 * @returns The base-prefixed URL, or the original value when it is not eligible for rewriting.
 */
function addBasePath(value, base) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || base === '/')
    return value;
  const basePath = `/${base.replace(TerraQualityRegex.REGEX_G_REGEX_6(), '')}`;
  if (value === basePath) return `${basePath}/`;
  if (value.startsWith(`${basePath}/`)) return value;
  return `${basePath}${value}`;
}

/**
 * Adds the deployment prefix to root-relative `href` and `src` attributes in raw HTML.
 * @param source HTML fragment from a Markdown node.
 * @param base Astro deployment base passed to the remark plugin.
 * @returns The HTML source with eligible attribute URLs prefixed.
 */
function addBaseToHtml(source, base) {
  return source.replace(
    /\b(href|src)=(['"])(\/[^'"#?]*)([^'"]*)\2/gi,
    (_match, a, q, p, s) => `${a}=${q}${addBasePath(`${p}${s}`, base)}${q}`,
  );
}

/**
 * Creates a remark transformer that prefixes local links, images, and JSX URL attributes.
 * @param base Astro deployment base supplied by the site configuration.
 * @returns A unified plugin that mutates matching URLs in each Markdown syntax tree.
 */
export function basePathRemarkPlugin({ base }) {
  return (tree) => {
    /**
     * Prefixes eligible local URLs throughout a Markdown AST subtree.
     * @param node Current syntax-tree node; descendants are visited recursively.
     * @returns Nothing; matching URL fields are updated in place.
     */
    const visit = (node) => {
      if (['link', 'image', 'definition'].includes(node.type) && typeof node.url === 'string')
        node.url = addBasePath(node.url, base);
      if (node.type === 'html' && typeof node.value === 'string')
        node.value = addBaseToHtml(node.value, base);
      if (
        node.type === 'mdxJsxAttribute' &&
        ['href', 'src'].includes(node.name) &&
        typeof node.value === 'string'
      )
        node.value = addBasePath(node.value, base);
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}

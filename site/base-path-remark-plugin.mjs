/**
 * site/base-path-remark-plugin.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import * as TerraQualityRegex from '../src/lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Prefixes a root-relative URL with the deployed site base while preserving external and fragment URLs.
 *
 * @param value - URL from a Markdown link, image, or HTML attribute.
 * @param base - Astro base path used by the current deployment.
 *
 * @return The base-prefixed URL, or the original value when no rewrite applies.
 */
function addBasePath(value, base) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || base === '/')
    return value;
  const basePath = `/${base.replace(TerraQualityRegex.REGEX_G_REGEX_35(), '')}`;
  if (value === basePath) return `${basePath}/`;
  if (value.startsWith(`${basePath}/`)) return value;
  return `${basePath}${value}`;
}

/**
 * Rewrites root-relative `href` and `src` attributes embedded in raw HTML.
 *
 * @param source - Raw HTML string from a Markdown node.
 * @param base - Astro base path used by the current deployment.
 *
 * @return HTML with eligible attribute URLs routed through the deployed base path.
 */
function addBaseToHtml(source, base) {
  return source.replace(
    /\b(href|src)=(['"])(\/[^'"#?]*)([^'"]*)\2/gi,
    (_match, a, q, p, s) => `${a}=${q}${addBasePath(`${p}${s}`, base)}${q}`,
  );
}

/**
 * Creates a remark transformer that applies Astro's deployment base to authored resource links.
 *
 * @param base - Astro base path used to serve the site.
 *
 * @return Transformer that updates root-relative Markdown, HTML, and MDX JSX URLs in place.
 */
export function basePathRemarkPlugin({ base }) {
  return (tree) => {
    /**
     * Walks a Markdown/MDX node tree and rewrites URL-bearing nodes recursively.
     *
     * @param node - Current syntax-tree node and any nested children.
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

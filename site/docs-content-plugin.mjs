/**
 * site/docs-content-plugin.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { existsSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';

// COMPONENTS
import * as TerraQualityRegex from '../../src/lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const markdownExts = new Set(['.md', '.mdx']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Converts a Markdown source path into its public, extensionless site route.
 *
 * @param file Markdown document whose public URL is being constructed.
 * @param docsRoot Absolute root containing the published Markdown tree.
 * @param base Site deployment prefix, including its leading and trailing slashes.
 *
 * @return The route with `index` and `SKILL` filename segments removed.
 */
function publicRoute(file, docsRoot, base) {
  const path = relative(docsRoot, file)
    .split(sep)
    .join('/')
    .replace(TerraQualityRegex.REGEX_MD_MDX_I_REGEX(), '');
  const route = path
    .replace(TerraQualityRegex.REGEX_SKILL_I_REGEX(), '')
    .replace(TerraQualityRegex.REGEX_INDEX_I_REGEX(), '')
    .replace(TerraQualityRegex.REGEX_G_REGEX_6(), '');
  return `${base}${route ? `${route}/` : ''}`;
}

/**
 * Rewrites an in-tree Markdown or asset link for the built documentation site.
 *
 * @param rawTarget Link target as authored, including optional title syntax.
 * @param sourceFile Markdown file containing the link.
 * @param docsRoot Absolute root used to reject links escaping the documentation tree.
 * @param base Site deployment prefix used when producing public URLs.
 *
 * @return The rewritten target when it points to a published Markdown or asset file; otherwise the original target.
 */
function rewriteTarget(rawTarget, sourceFile, docsRoot, base) {
  const target = rawTarget.trim();
  if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return rawTarget;
  const match = /^(<[^>]+>|[^\s]+)([\s\S]*)$/.exec(target);
  if (!match) return rawTarget;
  const bracketed = match[1].startsWith('<') && match[1].endsWith('>');
  const pathname = bracketed ? match[1].slice(1, -1) : match[1];
  const suffix = match[2];
  const [filePath, ...hashParts] = pathname.split('#');
  const [cPath, ...queryParts] = filePath.split('?');
  const fragment = hashParts.length ? `#${hashParts.join('#')}` : '';
  const query = queryParts.length ? `?${queryParts.join('?')}` : '';
  if (cPath.startsWith('/')) {
    const basePath =
      base === '/' ? '' : `/${base.replace(TerraQualityRegex.REGEX_G_REGEX_6(), '')}`;
    const rootBase = `${basePath}/`;
    const routedPath =
      base === '/' || cPath.startsWith(rootBase)
        ? cPath
        : cPath === basePath
          ? rootBase
          : `${basePath}${cPath}`;
    const rewritten = `${routedPath}${query}${fragment}`;
    return `${bracketed ? `<${rewritten}>` : rewritten}${suffix}`;
  }
  let resolvedPath;
  try {
    resolvedPath = resolve(sourceFile, '..', decodeURIComponent(cPath));
  } catch {
    return rawTarget;
  }
  const relativePath = relative(docsRoot, resolvedPath);
  if (relativePath.startsWith(`..${sep}`) || relativePath === '..' || !existsSync(resolvedPath))
    return rawTarget;
  const ext = extname(resolvedPath).toLowerCase();
  const rewritten = markdownExts.has(ext)
    ? publicRoute(resolvedPath, docsRoot, base)
    : `${base}_docs/assets/${relativePath.split(sep).join('/')}`;
  return `${bracketed ? `<${rewritten}${query}${fragment}>` : `${rewritten}${query}${fragment}`}${suffix}`;
}

/**
 * Applies a transformation only to Markdown outside fenced code blocks.
 *
 * @param source Markdown source containing any fenced examples.
 * @param callback Transformation to apply to each non-code segment.
 *
 * @return Source with transformed prose and unchanged fenced examples.
 */
function mapOutsideCode(source, callback) {
  const sections = source.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g);
  return sections.map((s, i) => (i % 2 ? s : callback(s))).join('');
}

/**
 * Configures Vite to rewrite local Docs links and asset references during Markdown transforms.
 *
 * @param root Vite project root used to locate the documentation tree.
 * @param base Site deployment prefix used for links in the generated site.
 *
 * @return A pre-transform plugin that leaves files outside `docs/` untouched.
 */
export function docsContentPlugin({ root, base }) {
  const docsRoot = resolve(root, 'docs');
  return {
    name: 'docs-content-assets',
    enforce: 'pre',
    /**
     * Rewrites local documentation links and asset URLs before Markdown compilation.
     * @param source Markdown or MDX file contents.
     * @param id Absolute source filename with any Vite query suffix.
     * @returns Transformed source for files under `docs/`, or `null` for unrelated modules.
     */
    transform(source, id) {
      if (id.includes('?') || !markdownExts.has(extname(id).toLowerCase())) return null;
      const sourceFile = resolve(id);
      const relativePath = relative(docsRoot, sourceFile);
      if (relativePath.startsWith(`..${sep}`) || relativePath === '..') return null;
      const withMarkdownLinks = source.replace(
        /(!?\[[^\]]*\]\()([^)]+)(\))/g,
        (_full, b, t, a) => `${b}${rewriteTarget(t, sourceFile, docsRoot, base)}${a}`,
      );
      return mapOutsideCode(withMarkdownLinks, (s) =>
        s.replace(
          /\b(src|href)=(['"])(.*?)\2/g,
          (full, attribute, quote, target) =>
            `${attribute}=${quote}${rewriteTarget(target, sourceFile, docsRoot, base)}${quote}`,
        ),
      );
    },
  };
}

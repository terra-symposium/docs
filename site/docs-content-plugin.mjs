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
import * as TerraQualityRegex from '../src/lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const markdownExts = new Set(['.md', '.mdx']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Converts an in-repository Markdown file path into its public Docs route.
 *
 * @param file - Resolved Markdown source file.
 * @param docsRoot - Root directory containing the authored Docs pages.
 * @param base - Public deployment base path.
 *
 * @return Trailing-slash route, with index and skill source names hidden from the URL.
 */
function publicRoute(file, docsRoot, base) {
  const route = relative(docsRoot, file)
    .split(sep)
    .join('/')
    .replace(TerraQualityRegex.REGEX_MD_MDX_I_REGEX(), '')
    .replace(TerraQualityRegex.REGEX_SKILL_I_REGEX(), '')
    .replace(TerraQualityRegex.REGEX_INDEX_I_REGEX_2(), '')
    .replace(TerraQualityRegex.REGEX_G_REGEX_6(), '');
  return `${base}${route ? `${route}/` : ''}`;
}

/**
 * Rewrites a Markdown or HTML link target to the corresponding public page or copied asset.
 *
 * @param rawTarget - Authored target, including optional angle brackets, query, fragment, and suffix.
 * @param sourceFile - Markdown file containing the target.
 * @param docsRoot - Root directory used to reject links that escape the Docs content tree.
 * @param base - Public deployment base path.
 *
 * @return Rewritten target when it maps to local Docs content; otherwise the authored target.
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
      base === '/' ? '' : `/${base.replace(TerraQualityRegex.REGEX_G_REGEX_35(), '')}`;
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
 * Applies a transformation to Markdown sections outside fenced code blocks.
 *
 * @param source - Markdown source containing optional backtick or tilde fences.
 * @param callback - Transformation applied to each non-code section.
 *
 * @return Source with transformed prose/HTML sections and original fenced code preserved.
 */
function mapOutsideCode(source, callback) {
  return source
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((s, i) => (i % 2 ? s : callback(s)))
    .join('');
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
     *
     * @param source Markdown or MDX file contents.
     * @param id Absolute source filename with any Vite query suffix.
     *
     * @return Transformed source for files under `docs/`, or `null` for unrelated modules.
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

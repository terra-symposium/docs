import { existsSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';

const markdownExtensions = new Set(['.md', '.mdx']);

function publicRoute(file, docsRoot, base) {
  const path = relative(docsRoot, file)
    .split(sep)
    .join('/')
    .replace(/\.(?:md|mdx)$/i, '');
  const route = path.replace(/(?:^|\/)index$/i, '').replace(/^\/+|\/+$/g, '');
  return `${base}${route ? `${route}/` : ''}`;
}

function rewriteTarget(rawTarget, sourceFile, docsRoot, base) {
  const target = rawTarget.trim();
  if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return rawTarget;
  const match = /^(<[^>]+>|[^\s]+)([\s\S]*)$/.exec(target);
  if (!match) return rawTarget;
  const bracketed = match[1].startsWith('<') && match[1].endsWith('>');
  const pathname = bracketed ? match[1].slice(1, -1) : match[1];
  const suffix = match[2];
  const [filePath, ...hashParts] = pathname.split('#');
  const [cleanPath, ...queryParts] = filePath.split('?');
  const fragment = hashParts.length ? `#${hashParts.join('#')}` : '';
  const query = queryParts.length ? `?${queryParts.join('?')}` : '';
  if (cleanPath.startsWith('/')) {
    const basePath = base === '/' ? '' : `/${base.replace(/^\/+|\/+$/g, '')}`;
    const rootBase = `${basePath}/`;
    const routedPath =
      base === '/' || cleanPath.startsWith(rootBase)
        ? cleanPath
        : cleanPath === basePath
          ? rootBase
          : `${basePath}${cleanPath}`;
    const rewritten = `${routedPath}${query}${fragment}`;
    return `${bracketed ? `<${rewritten}>` : rewritten}${suffix}`;
  }
  let resolvedPath;
  try {
    resolvedPath = resolve(sourceFile, '..', decodeURIComponent(cleanPath));
  } catch {
    return rawTarget;
  }
  const relativePath = relative(docsRoot, resolvedPath);
  if (relativePath.startsWith(`..${sep}`) || relativePath === '..' || !existsSync(resolvedPath))
    return rawTarget;
  const extension = extname(resolvedPath).toLowerCase();
  const rewritten = markdownExtensions.has(extension)
    ? publicRoute(resolvedPath, docsRoot, base)
    : `${base}_terra-docs/assets/${relativePath.split(sep).join('/')}`;
  return `${bracketed ? `<${rewritten}${query}${fragment}>` : `${rewritten}${query}${fragment}`}${suffix}`;
}

function mapOutsideCode(source, callback) {
  const sections = source.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g);
  return sections.map((section, index) => (index % 2 ? section : callback(section))).join('');
}

export function docsContentPlugin({ root, base }) {
  const docsRoot = resolve(root, 'docs');
  return {
    name: 'terra-docs-content-assets',
    enforce: 'pre',
    transform(source, id) {
      if (id.includes('?') || !markdownExtensions.has(extname(id).toLowerCase())) return null;
      const sourceFile = resolve(id);
      const relativePath = relative(docsRoot, sourceFile);
      if (relativePath.startsWith(`..${sep}`) || relativePath === '..') return null;
      const withMarkdownLinks = source.replace(
        /(!?\[[^\]]*\]\()([^)]+)(\))/g,
        (_full, before, target, after) =>
          `${before}${rewriteTarget(target, sourceFile, docsRoot, base)}${after}`,
      );
      return mapOutsideCode(withMarkdownLinks, (section) =>
        section.replace(
          /\b(src|href)=(['"])(.*?)\2/g,
          (full, attribute, quote, target) =>
            `${attribute}=${quote}${rewriteTarget(target, sourceFile, docsRoot, base)}${quote}`,
        ),
      );
    },
  };
}

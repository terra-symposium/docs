import { existsSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
const G_REGEX = () => /^\/+|\/+$/g;

const markdownExts = new Set(['.md', '.mdx']);

/** Maps a documentation source file to its public route, collapsing index and skill leaf suffixes.
 *
 * @param file Markdown source path discovered under the consumer docs root.
 * @param docsRoot Absolute directory containing the source pages.
 * @param base Public URL prefix used by the generated site.
 * @return The canonical route with the configured public prefix.
 */
export function publicRoute(file, docsRoot, base) {
	const route = relative(docsRoot, file)
		.split(sep)
		.join('/')
		.replace(/\.(?:md|mdx)$/i, '')
		.replace(/(?:^|\/)SKILL$/i, '')
		.replace(/(?:^|\/)index$/i, '')
		.replace(G_REGEX(), '');
	return `${base}${route ? `${route}/` : ''}`;
}

function rewriteTarget(rawTarget, srcFile, docsRoot, base) {
	const target = rawTarget.trim();
	if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return rawTarget;
	const match = /^(<[^>]+>|[^\s]+)([\s\S]*)$/.exec(target);
	if (!match) return rawTarget;
	const bracketed = match[1].startsWith('<') && match[1].endsWith('>');
	const suffix = match[2];
	const [filePath, ...hashParts] = (bracketed ? match[1].slice(1, -1) : match[1]).split('#');
	const [cleanPath, ...queryParts] = filePath.split('?');
	const fragment = hashParts.length ? `#${hashParts.join('#')}` : '';
	const query = queryParts.length ? `?${queryParts.join('?')}` : '';
	if (cleanPath.startsWith('/')) {
		const basePath = base === '/' ? '' : `/${base.replace(G_REGEX(), '')}`;
		const rootBase = `${basePath}/`;
		const rewritten = `${base === '/' || cleanPath.startsWith(rootBase) ? cleanPath : cleanPath === basePath ? rootBase : `${basePath}${cleanPath}`}${query}${fragment}`;
		return `${bracketed ? `<${rewritten}>` : rewritten}${suffix}`;
	}
	let resolvedPath;
	try {
		resolvedPath = resolve(srcFile, '..', decodeURIComponent(cleanPath));
	} catch {
		return rawTarget;
	}
	const relativePath = relative(docsRoot, resolvedPath);
	if (relativePath.startsWith(`..${sep}`) || relativePath === '..' || !existsSync(resolvedPath)) return rawTarget;
	const rewritten = markdownExts.has(extname(resolvedPath).toLowerCase()) ? publicRoute(resolvedPath, docsRoot, base) : `${base}_docs/assets/${relativePath.split(sep).join('/')}`;
	return `${bracketed ? `<${rewritten}${query}${fragment}>` : `${rewritten}${query}${fragment}`}${suffix}`;
}

/** Rewrites page-local links and asset references for a generated Docs site.
 *
 * @param root Repository root containing the `docs/` source tree.
 * @param base Public URL prefix used by the generated site.
 * @return A Vite plugin that maps page links and assets to their public routes.
 */
export function docsContentPlugin({ root, base }) {
	const docsRoot = resolve(root, 'docs');
	return {
		name: 'docs-content-assets',
		enforce: 'pre',
		transform(src, id) {
			if (id.includes('?') || !markdownExts.has(extname(id).toLowerCase())) return null;
			const srcFile = resolve(id);
			const relativePath = relative(docsRoot, srcFile);
			if (relativePath.startsWith(`..${sep}`) || relativePath === '..') return null;
			return src
				.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
				.map((section, i) => {
					if (i % 2) return section;
					return section
						.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (_full, before, target, after) => `${before}${rewriteTarget(target, srcFile, docsRoot, base)}${after}`)
						.replace(/\b(src|href)=(['"])(.*?)\2/g, (full, attribute, quote, target) => `${attribute}=${quote}${rewriteTarget(target, srcFile, docsRoot, base)}${quote}`);
				})
				.join('');
		},
	};
}

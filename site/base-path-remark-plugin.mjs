function addBasePath(value, base) {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || base === '/') return value;
	const basePath = `/${base.replace(/^\/+|\/+$/g, '')}`;
	if (value === basePath) return `${basePath}/`;
	if (value.startsWith(`${basePath}/`)) return value;
	return `${basePath}${value}`;
}

function addBaseToHtml(src, base) {
	return src.replace(/\b(href|src)=(['"])(\/[^'"#?]*)([^'"]*)\2/gi, (_match, attr, quote, pathname, suffix) => `${attr}=${quote}${addBasePath(`${pathname}${suffix}`, base)}${quote}`);
}

/** Adds the configured deployment prefix to root-relative links in Markdown trees.
 *
 * @param base Prefix supplied by the generated site's Astro configuration.
 * @return A Remark transformer that updates Markdown and embedded HTML URLs.
 */
export function basePathRemarkPlugin({ base }) {
	return tree => {
		const visit = node => {
			if (['link', 'image', 'definition'].includes(node.type) && typeof node.url === 'string') node.url = addBasePath(node.url, base);
			if (node.type === 'html' && typeof node.value === 'string') node.value = addBaseToHtml(node.value, base);
			if (node.type === 'mdxJsxAttribute' && ['href', 'src'].includes(node.name) && typeof node.value === 'string') node.value = addBasePath(node.value, base);
			for (const child of node.children ?? []) visit(child);
		};
		visit(tree);
	};
}

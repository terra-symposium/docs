/**
 * src/lib/docs-catalog.ts
 */

/// <reference types="vite/client" />

import type { DocsHostTreeNode } from '@terra-symposium/docs-site';
import type { DocsLocalPage } from '@terra-symposium/docs-site/local-workspace';

const srcPrefix = '../../docs/';
const srcs = import.meta.glob('../../docs/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const modules = import.meta.glob('../../docs/**/*.md', { eager: true }) as Record<string, { frontmatter?: { title?: string; description?: string; order?: number } }>;

const pageOrder = new Map(Object.entries(modules).map(([file, module]) => [file.slice(srcPrefix.length), module.frontmatter?.order ?? 0]));

function displayName(name: string): string {
	return name
		.replace(/^\d+-/, '')
		.replace(/-/g, ' ')
		.replace(/\b\w/g, character => character.toUpperCase());
}

/** Every Markdown file in docs/ is a page; its relative path is its route. */
export const docsPages: DocsLocalPage[] = Object.entries(modules)
	.map(([file, module]) => {
		const relativePath = file.slice(srcPrefix.length);
		const id = relativePath.replace(/\.md$/, '');
		const route = id === 'index' ? '' : id.replace(/\/index$/, '');
		const basename = id.split('/').at(-1) ?? 'Docs';
		return {
			id,
			path: `docs/${relativePath}`,
			pathname: route ? `/${route}/` : '/',
			title: module.frontmatter?.title ?? displayName(basename === 'index' ? (id.split('/').at(-2) ?? 'Docs') : basename),
			...(module.frontmatter?.description ? { description: module.frontmatter.description } : {}),
			markdown: String(srcs[file] ?? '').replace(/^---\s*\n[\s\S]*?\n---\s*\n/, ''),
		};
	})
	.sort((a, b) => {
		// Preserve folder keys before the comparator can be called repeatedly by sort.
		// hygiene-ignore single-use -- Keep each folder key stable across comparator calls.
		const aFolder = a.id.slice(0, a.id.lastIndexOf('/'));
		// hygiene-ignore single-use -- Keep each folder key stable across comparator calls.
		const bFolder = b.id.slice(0, b.id.lastIndexOf('/'));
		return (aFolder === bFolder ? (pageOrder.get(`${a.id}.md`) ?? 0) - (pageOrder.get(`${b.id}.md`) ?? 0) : 0) || a.path.localeCompare(b.path, undefined, { numeric: true });
	});

function leaf(page: DocsLocalPage): DocsHostTreeNode {
	return {
		type: 'leaf',
		origName: page.id,
		title: page.title,
		path: page.path,
		url: page.pathname,
		permission: 'read',
	};
}

function childrenFor(pages: DocsLocalPage[], folder: string): DocsHostTreeNode[] {
	const direct: DocsLocalPage[] = [];
	const folders = new Map<string, DocsLocalPage[]>();
	for (const page of pages) {
		const relative = folder ? page.id.slice(folder.length + 1) : page.id;
		const slash = relative.indexOf('/');
		if (slash < 0) {
			direct.push(page);
			continue;
		}
		const name = relative.slice(0, slash);
		folders.set(name, [...(folders.get(name) ?? []), page]);
	}
	// hygiene-ignore single-use -- Materialize sorted folders before recursively building children.
	const branches = [...folders]
		.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
		.map(([name, nested]) => {
			const path = folder ? `${folder}/${name}` : name;
			return {
				type: 'branch' as const,
				origName: path,
				title: displayName(name),
				path,
				permission: 'read' as const,
				children: childrenFor(nested, path),
			};
		});
	return [...direct.map(leaf), ...branches];
}

// hygiene-ignore single-use -- Retain the deduplicated section set used to define the docs tree.
const sectionIds = new Set(docsPages.map(page => (page.id.includes('/') ? page.id.split('/')[0]! : 'docs-root')));
// hygiene-ignore single-use -- Keep the section ordering deterministic before mapping the tree.
const sortedSections = [...sectionIds].sort((a, b) => (a === 'docs-root' ? -1 : b === 'docs-root' ? 1 : a.localeCompare(b, undefined, { numeric: true })));
/** Sections and leaves follow the current docs/ directory tree. */
export const docsTree: DocsHostTreeNode[] = sortedSections.map(section => {
	const isRoot = section === 'docs-root';
	// hygiene-ignore single-use -- Compute section pages once for the nested navigation tree.
	const pages = docsPages.filter(page => (isRoot ? !page.id.includes('/') : page.id.startsWith(`${section}/`)));
	return {
		type: 'branch',
		origName: section,
		title: isRoot ? 'Docs' : displayName(section),
		path: isRoot ? 'docs' : section,
		permission: 'read',
		children: [
			{
				type: 'branch',
				origName: `${section}/pages`,
				title: 'Pages',
				path: `${section}/pages`,
				permission: 'read',
				children: childrenFor(pages, isRoot ? '' : section),
			},
		],
	};
});

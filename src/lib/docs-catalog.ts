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

/** Every Markdown file in docs/ is a page; index and skill files use their containing directory route. */
export const docsPages: DocsLocalPage[] = Object.entries(modules)
	.map(([file, module]) => {
		const relativePath = file.slice(srcPrefix.length);
		const id = relativePath.replace(/\.md$/, '');
		const route = id === 'index' ? '' : id.replace(/\/(?:index|SKILL)$/i, '');
		const basename = id.split('/').at(-1) ?? 'Docs';
		const markdown = String(srcs[file] ?? '').replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
		return {
			id,
			path: `docs/${relativePath}`,
			pathname: route ? `/${route}/` : '/',
			title: module.frontmatter?.title ?? /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? displayName(basename === 'index' || /^SKILL$/i.test(basename) ? (id.split('/').at(-2) ?? 'Docs') : basename),
			...(module.frontmatter?.description ? { description: module.frontmatter.description } : {}),
			markdown,
		};
	})
	.sort((a, b) => {
		return (
			(a.id.slice(0, a.id.lastIndexOf('/')) === b.id.slice(0, b.id.lastIndexOf('/')) ? (pageOrder.get(`${a.id}.md`) ?? 0) - (pageOrder.get(`${b.id}.md`) ?? 0) : 0) ||
			a.path.localeCompare(b.path, undefined, { numeric: true })
		);
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
	return [
		...direct.map(leaf),
		...[...folders]
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
			}),
	];
}

/** Sections and leaves follow the current docs/ directory tree. The root index is also
 * exposed as a synthetic Docs section so it can be selected in workspace navigation.
 */
const navigationPages = docsPages.filter(page => page.id !== 'index');
const homePage = docsPages.find(page => page.id === 'index');

export const docsTree: DocsHostTreeNode[] = [
	...(homePage
		? [
				{
					type: 'branch' as const,
					origName: 'docs',
					title: 'Docs',
					path: 'docs',
					permission: 'read' as const,
					simulated: true,
					children: [
						{
							type: 'branch' as const,
							origName: 'docs/pages',
							title: 'Pages',
							path: 'docs/pages',
							permission: 'read' as const,
							children: [leaf(homePage)],
						},
					],
				} satisfies DocsHostTreeNode,
			]
		: []),
	...[...new Set(navigationPages.map(page => page.id.split('/')[0]!))]
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
		.map((section): DocsHostTreeNode => {
			return {
				type: 'branch',
				origName: section,
				title: displayName(section),
				path: section,
				permission: 'read',
				children: [
					{
						type: 'branch',
						origName: `${section}/pages`,
						title: 'Pages',
						path: `${section}/pages`,
						permission: 'read',
						children: childrenFor(
							navigationPages.filter(page => page.id.startsWith(`${section}/`)),
							section,
						),
					},
				],
			};
		}),
];

/**
 * src/lib/docs-catalog.ts
 */

/// <reference types="vite/client" />

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { DocsHostTreeNode } from './host.js';
import type { DocsLocalPage } from '../components/LocalDocsWorkspace.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const sources = import.meta.glob('../content/docs/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
export const docsPages: DocsLocalPage[] = Object.entries(
	import.meta.glob('../content/docs/**/*.md', { eager: true }) as Record<string, { default: unknown; frontmatter?: { title?: string; description?: string } }>,
).map(([f, m]) => {
	const slug = f
		.replace('../content/docs/', '')
		.replace(/(?:^|\/)index\.md$/, '')
		.replace(/\.md$/, '');
	const id = slug || 'index';
	return {
		id,
		path: `content/docs/${id === 'index' ? 'index' : slug}.md`,
		pathname: id === 'index' ? '/' : `/${slug}/`,
		title:
			m.frontmatter?.title ??
			(id === 'index'
				? 'Terra Docs'
				: id
						.split('/')
						.at(-1)!
						.replace(/-/g, ' ')
						.replace(/\b\w/g, value => value.toUpperCase())),
		...(m.frontmatter?.description ? { description: m.frontmatter.description } : {}),
		markdown: String(sources[f] ?? '').replace(/^---\s*\n[\s\S]*?\n---\s*\n/, ''),
	};
});
export const docsTree: DocsHostTreeNode[] = [
	{
		id: 'start-here',
		title: 'Start here',
		groups: [{ id: 'guides', title: 'Guides', ids: ['index', 'getting-started'] }],
	},
	{
		id: 'configure',
		title: 'Configure',
		groups: [{ id: 'guides', title: 'Guides', ids: ['configuration', 'storage', 'deploy'] }],
	},
	{
		id: 'reference',
		title: 'Reference',
		groups: [{ id: 'guides', title: 'Guides', ids: ['component', 'development'] }],
	},
].map(s => ({
	type: 'branch',
	origName: s.id,
	title: s.title,
	path: s.id,
	children: s.groups.map(group => ({
		type: 'branch',
		origName: `${s.id}/${group.id}`,
		title: group.title,
		path: `${s.id}/${group.id}`,
		children: group.ids.flatMap(id => {
			const page = docsPages.find(entry => entry.id === id);
			return page
				? [
						{
							type: 'leaf' as const,
							origName: page.id,
							title: page.title,
							path: page.path,
							url: page.pathname,
							permission: 'read' as const,
						},
					]
				: [];
		}),
	})),
}));

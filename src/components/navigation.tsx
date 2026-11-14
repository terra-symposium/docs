/**
 * src/components/navigation.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors } from '@terra-symposium/styling';

// TYPES
import type { CSSProperties, JSX } from 'react';
import type { DocsAttachment } from '../lib/workspace-types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Hierarchical navigation item accepted by the static Docs navigation component. */
export type DocsNavNode = {
	id?: string;
	path?: string;
	title: string;
	href?: string;
	description?: string;
	updatedAt?: string;
	attachments?: DocsAttachment[];
	children?: DocsNavNode[];
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a nested documentation navigation list with the active route marked.
 *
 * @param nodes Navigation nodes to display.
 * @param currentPath Current URL used to mark the active page.
 * @param hue Base hue used for the navigation accent.
 *
 * @return Accessible nested navigation element.
 */
export function DocsNavigation({ nodes, currentPath, hue = 210 }: { nodes: DocsNavNode[]; currentPath: string; hue?: number | null }): JSX.Element {
	const [accent] = colors(hue);
	const render = (items: DocsNavNode[]): JSX.Element => (
		<ul className='terra-docs-nav-list'>
			{items.map((n, i) => (
				<li key={`${n.href ?? n.title}-${i}`}>
					{n.href ? (
						<a href={n.href} aria-current={n.href === currentPath ? 'page' : undefined}>
							{n.title}
						</a>
					) : (
						<span>{n.title}</span>
					)}
					{n.children?.length ? render(n.children) : null}
				</li>
			))}
		</ul>
	);
	return (
		<nav className='terra-docs-nav' aria-label='Documentation' style={{ '--docs-accent': `rgb(${accent.light[8]})` } as CSSProperties}>
			{render(nodes)}
		</nav>
	);
}

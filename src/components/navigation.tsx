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
	const render = (items: DocsNavNode[], nested = false): JSX.Element => (
		<ul className={nested ? 'm-0 list-none pl-4' : 'm-0 list-none p-0'}>
			{items.map((n, i) => (
				<li className='my-0.5' key={`${n.href ?? n.title}-${i}`}>
					{n.href ? (
						<a
							href={n.href}
							aria-current={n.href === currentPath ? 'page' : undefined}
							className='block rounded px-2 py-1 text-inherit no-underline hover:bg-[color-mix(in_srgb,var(--docs-accent)_10%,white)] hover:text-[var(--docs-accent)] aria-[current=page]:bg-[color-mix(in_srgb,var(--docs-accent)_10%,white)] aria-[current=page]:text-[var(--docs-accent)]'
						>
							{n.title}
						</a>
					) : (
						<span className='block px-2 pb-1 pt-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>{n.title}</span>
					)}
					{n.children?.length ? render(n.children, true) : null}
				</li>
			))}
		</ul>
	);
	return (
		<nav className='text-sm leading-normal' aria-label='Documentation' style={{ '--docs-accent': `rgb(${accent.light[8]})` } as CSSProperties}>
			{render(nodes)}
		</nav>
	);
}

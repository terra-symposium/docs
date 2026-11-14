/**
 * src/components/terra/editor/TerraContentEditor.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createDocsSchema, safeLink } from '../../../lib/schema.js';
import { createElement } from 'react';
import { defineBlockObject, defineInlineObject } from '@portabletext/editor';
import { renderCallout } from './docs/_Callout.js';
import { renderCode } from './docs/_DocsCode.js';
import { renderImage } from './docs/_DocsImage.js';
import { renderMathBlock } from './docs/_Math.js';
import { renderSections } from './docs/_Tabs.js';
import { renderTable } from './docs/_Table.js';

// COMPONENTS
import MathInline from './docs/_math_inline.js';
import { DocsHeading } from './docs/heading.js';
import { EditorProvider, PortableTextEditable } from '@portabletext/editor';
import { Embed } from './docs/_Embed.js';
import { EventListenerPlugin, NodePlugin } from '@portabletext/editor/plugins';
import { NodesBlock } from './docs/_Nodes.js';
import { Raw } from './docs/_Raw.js';
import { Toolbar } from '../../_Toolbar.js';
import { TsDocs } from './docs/_TsDocs.js';

// TYPES
import type { DocsBlockOptions } from '../../blocks.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// terra-quality-ignore single-use -- Keep the renderer registry at module scope so callbacks retain identity across editor renders.
const rendererByType: Record<string, (props: any) => JSX.Element | null> = {
	accordion: renderSections,
	callout: renderCallout,
	code: renderCode,
	docImage: renderImage,
	embed: ({ attributes: a, children: c, node: n }) => (
		<div {...a} data-docs-editor-block='Embed'>
			<Embed block={n} />
			{c}
		</div>
	),
	math: renderMathBlock,
	nodes: ({ attributes: a, children: c, node: n }) => (
		<div {...a}>
			<NodesBlock block={n} />
			{c}
		</div>
	),
	raw: ({ attributes: a, children: c, node: n }) => (
		<div {...a}>
			<Raw block={n} />
			{c}
		</div>
	),
	table: renderTable,
	tabs: renderSections,
	tsDocs: ({ attributes: a, children: c, node: n }) => (
		<div {...a}>
			<TsDocs block={n} />
			{c}
		</div>
	),
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Docs-only Portable Text profile extracted from the website's shared editor.
 *
 * @param content Initial Portable Text blocks displayed by the editor.
 * @param onChange Callback receiving each updated block array.
 * @param readOnly Whether the editor should prevent changes.
 * @param resetKey Key that recreates the editor when its source document changes.
 * @param nested Whether to omit block types that are not valid inside nested content.
 * @param toolbar Whether to render the Docs editing toolbar.
 *
 * @return The configured Portable Text editor surface.
 */
export function TerraContentEditor({
	content = [],
	onChange,
	readOnly = false,
	resetKey,
	nested = false,
	toolbar = false,
}: {
	content?: any[];
	onChange?: (content: any[]) => void;
	readOnly?: boolean;
	resetKey?: string;
	nested?: boolean;
	toolbar?: boolean;
	[key: string]: any;
}): JSX.Element {
	const nestedBlocks: DocsBlockOptions = { accordion: false, callout: false, tabs: false };
	return (
		<div data-terra-content-editor>
			<EditorProvider
				key={resetKey}
				initialConfig={{
					schemaDefinition: createDocsSchema(nested ? nestedBlocks : undefined),
					initialValue: content,
					readOnly,
				}}
			>
				<EventListenerPlugin
					on={e => {
						if (e.type === 'mutation' && !readOnly) onChange?.(e.value ?? []);
					}}
				/>
				<NodePlugin
					nodes={[
						...Object.entries(rendererByType).map(([t, r]) => defineBlockObject({ type: t, render: props => r(props as any) ?? <></> })),
						defineInlineObject({ type: 'math', render: p => <MathInline {...p} /> }) as any,
					]}
				/>
				{toolbar && <Toolbar blocks={nested ? nestedBlocks : undefined} />}
				<PortableTextEditable
					aria-label={readOnly ? 'Document viewer' : 'Document editor'}
					contentEditable={!readOnly}
					className='terra-docs-content outline-none'
					renderStyle={({ children: c, schemaType: s }) => {
						const style = s.value;
						if (style === 'blockquote') return <blockquote>{c}</blockquote>;
						if (readOnly && typeof style === 'string' && /^h[2-6]$/.test(style)) return <DocsHeading level={style as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'}>{c}</DocsHeading>;
						if (typeof style === 'string' && /^h[1-6]$/.test(style)) return createElement(style, {}, c);
						return <p>{c}</p>;
					}}
					renderDecorator={({ children: c, value: v }) =>
						v === 'strong' ? <strong>{c}</strong> : v === 'em' ? <em>{c}</em> : v === 'underline' ? <u>{c}</u> : v === 'strike-through' ? <s>{c}</s> : v === 'code' ? <code>{c}</code> : <>{c}</>
					}
					renderAnnotation={({ children: c, value: v }) => {
						const href = safeLink(v.href);
						return href ? <a href={href}>{c}</a> : <>{c}</>;
					}}
				/>
			</EditorProvider>
		</div>
	);
}

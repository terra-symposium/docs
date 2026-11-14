/**
 * src/components/Docs.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createDocsSchema, safeLink } from '../lib/schema.js';
import { docsBlockNodes } from './blocks.js';
import { useEditor } from '@portabletext/editor';
import { useEffect } from 'react';

// COMPONENTS
import { EditorProvider, PortableTextEditable } from '@portabletext/editor';
import { EventListenerPlugin, NodePlugin } from '@portabletext/editor/plugins';
import { Toolbar } from './_Toolbar.js';

// TYPES
import type { DocsBlockOptions } from './blocks.js';
import type { JSX } from 'react';
import type { PortableTextBlock } from '@portabletext/editor';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Portable Text blocks supplied and retained by the host application. */
export type DocsValue = PortableTextBlock[];
/** Selects editing or read-only rendering. */
export type DocsMode = 'edit' | 'view';
/** Controlled content with editing callbacks available only in edit mode. */
export type DocsProps = {
	value: DocsValue;
	className?: string;
	blocks?: DocsBlockOptions;
} & ({ mode: 'edit'; onChange: (value: DocsValue) => void } | { mode: 'view'; onChange?: never });

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * A minimal standalone version of TerraContentEditor's Portable Text surface.
 *
 * @param value Portable Text value displayed by the surface.
 * @param className Optional class applied to the surface root.
 * @param blocks Optional configuration for enabled Docs blocks.
 * @param mode Whether the surface allows editing or renders read-only content.
 * @param onChange Callback receiving the updated value in edit mode.
 *
 * @return Editable or read-only Portable Text surface.
 */
export function Docs({ value, className, blocks, mode, onChange }: DocsProps): JSX.Element {
	const optionalProps = {
		...(className === undefined ? {} : { className }),
		...(blocks === undefined ? {} : { blocks }),
	};
	return (
		<div className={['terra-docs', className].filter(Boolean).join(' ')}>
			<EditorProvider
				initialConfig={{
					schemaDefinition: createDocsSchema(blocks),
					initialValue: value,
					readOnly: mode === 'view',
				}}
			>
				<DocsSurface {...(mode === 'edit' ? { value, ...optionalProps, mode, onChange } : { value, ...optionalProps, mode })} />
			</EditorProvider>
		</div>
	);
}

// terra-quality-ignore single-use -- Keep DocsSurface as the child component that owns the editor hooks under EditorProvider.
/**
 *
 * @param props
 *
 * @return
 */
function DocsSurface(props: DocsProps): JSX.Element {
	const editor = useEditor();

	// initialConfig is read once; subsequent host values and mode changes need explicit updates.
	useEffect(() => {
		editor.send({ type: 'update value', value: props.value });
	}, [editor, props.value]);
	useEffect(() => {
		editor.send({ type: 'update readOnly', readOnly: props.mode === 'view' });
	}, [editor, props.mode]);
	return (
		<>
			<EventListenerPlugin
				on={e => {
					if (e.type === 'mutation' && props.mode === 'edit') {
						props.onChange(e.value ?? []);
					}
				}}
			/>
			<NodePlugin nodes={docsBlockNodes(props.blocks)} />
			{props.mode === 'edit' && <Toolbar blocks={props.blocks} />}
			<PortableTextEditable
				aria-label={props.mode === 'edit' ? 'Document editor' : 'Document viewer'}
				aria-readonly={props.mode === 'view'}
				contentEditable={props.mode === 'edit'}
				className='terra-docs-content'
				renderStyle={({ children: c, schemaType: s }) => {
					if (s.value === 'h2') return <h2>{c}</h2>;
					if (s.value === 'h3') return <h3>{c}</h3>;
					if (s.value === 'h4') return <h4>{c}</h4>;
					if (s.value === 'h5') return <h5>{c}</h5>;
					if (s.value === 'h6') return <h6>{c}</h6>;
					if (s.value === 'blockquote') return <blockquote>{c}</blockquote>;
					return <p>{c}</p>;
				}}
				renderDecorator={({ children: c, value: v }) => {
					if (v === 'strong') return <strong>{c}</strong>;
					if (v === 'em') return <em>{c}</em>;
					if (v === 'underline') return <u>{c}</u>;
					if (v === 'strike-through') return <s>{c}</s>;
					if (v === 'code') return <code>{c}</code>;
					return <>{c}</>;
				}}
				renderAnnotation={({ children: c, value: v }) => {
					const href = safeLink(v.href);
					return href ? <a href={href}>{c}</a> : <>{c}</>;
				}}
			/>
		</>
	);
}

/**
 * src/components/terra/editor/docs/_Callout.tsx
 */

// @ts-nocheck -- source-preserving extraction; public host contracts are typed in src/host.ts.
/* Docs callout renderer with view and edit modes. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEditor } from '@portabletext/editor';

// COMPONENTS
import { ErrorBoundary } from '../../ui.js';
import { Input } from '@terra-symposium/styling/ui/terra-original';
import { TerraContentEditor } from '../TerraContentEditor.js';

// TYPES
import type { DocsBlock, PortableTextBlockEditorProps, PortableTextBlockRendererProps } from '../types.js';
import type { DocsNestedContent, TerraContent as TerraContentData } from '../../../../lib/terra/runtime/types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Sanity Portable Text callout data consumed by the docs editor and renderer. */
type CalloutBlock = DocsBlock<'callout'>;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a Docs callout and its nested rich-text body.
 *
 * @param block
 * @param props - Portable Text block and editor attributes for the authored callout title, style, and content.
 *
 * @return The rendered callout block.
 */
function Callout({ block }: { block: CalloutBlock }): JSX.Element {
	return (
		<ErrorBoundary name='CalloutBlock'>
			<aside className='docs-block my-0 flow-root [&>:first-child]:!mt-0 [&>:last-child]:!mb-0' data-docs-aside={block.kind ?? 'note'}>
				<h4 className='title'>{block.title ?? block.kind ?? 'Note'}</h4>
				<TerraContentEditor content={(block.content ?? []) as unknown as TerraContentData} docsAttachments={[]} memberProfile='docs' nested readOnly />
			</aside>
		</ErrorBoundary>
	);
}

/* Renders editable Docs callout controls and nested content. */
/**
 * Renders the CalloutEditor component.
 *
 * @param attrs
 * @param children
 * @param node
 * @param path
 * @param props - Portable Text editor attributes, nested children, block node, and path used to edit a callout.
 *
 * @return The editable callout and nested rich-text surface.
 */
function CalloutEditor({ attributes: attrs, children, node, path }: PortableTextBlockEditorProps<CalloutBlock>): React.JSX.Element {
	const editor = useEditor();
	const block = node;
	return (
		<ErrorBoundary name='CalloutEditor'>
			<aside {...attrs} contentEditable={false} className='docs-block my-0 flow-root rounded-md border border-primary-5 p-4' data-terra-block='callout' data-docs-aside={block.kind ?? 'note'}>
				<Input
					aria-label='Callout title'
					className='mb-3 border-0 bg-transparent px-0 text-lg font-bold shadow-none'
					value={block.title ?? block.kind ?? 'Note'}
					onChange={e => editor.send({ type: 'block.set', at: path, props: { title: e.currentTarget.value } })}
				/>
				<TerraContentEditor
					content={(block.content ?? []) as unknown as TerraContentData}
					docsAttachments={[]}
					memberProfile='docs'
					nested
					onChange={c => editor.send({ type: 'block.set', at: path, props: { content: c as DocsNestedContent } })}
				/>
				{children}
			</aside>
		</ErrorBoundary>
	);
}

/* Adapts Portable Text's block-object contract to the callout renderer. */
/**
 * Renders the renderCallout component.
 *
 * @param attrs Portable Text attributes applied to the callout wrapper.
 * @param children Nested rich-text content supplied by Portable Text.
 * @param node Callout block data to render or edit.
 * @param path Portable Text path identifying the block.
 * @param readOnly Whether editing controls should be omitted.
 *
 * @return The callout renderer in editable or read-only mode.
 */
export function renderCallout({ attributes: attrs, children, node, path, readOnly }: PortableTextBlockRendererProps<CalloutBlock>): React.JSX.Element {
	return readOnly ? <Callout block={node} /> : <CalloutEditor attributes={attrs} children={children} node={node} path={path} />;
}
Object.assign(Callout, { displayName: 'DocsCalloutPreview' });
Object.assign(CalloutEditor, { displayName: 'DocsCalloutEditor' });
Object.assign(renderCallout, { displayName: 'DocsCalloutRenderer' });

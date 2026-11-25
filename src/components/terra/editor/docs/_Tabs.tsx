/**
 * src/components/terra/editor/docs/_Tabs.tsx
 */

// @ts-nocheck -- source-preserving extraction; public host contracts are typed in src/host.ts.
/* Docs tabs and accordion renderer with view and edit modes. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEditor } from '@portabletext/editor';

// COMPONENTS
import { AccordionGroup, AccordionItem, TabsGroup, TabsItem } from '../_blocks.js';
import { Add as AddIcon } from '@carbon/icons-react';
import { Button } from '@terra-symposium/styling/ui/terra-original';
import { ErrorBoundary } from '../../ui.js';
import { TerraContentEditor } from '../TerraContentEditor.js';

// TYPES
import type { DocBody, DocsNestedContent, TerraContent as TerraContentData } from '../../../../lib/terra/runtime/types.js';
import type { DocsBlock, PortableTextBlockEditorProps, PortableTextBlockRendererProps } from '../types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Union of the docs tabs and accordion block shapes. */
type SectionsBlock = DocsBlock<'tabs'> | DocsBlock<'accordion'>;
const key = (val: unknown, fallback: string): string => (typeof val === 'object' && val !== null && typeof (val as { _key?: unknown })._key === 'string' ? (val as { _key: string })._key : fallback);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/* Renders read-only Docs tabs.
 *
 * @param props - Authored tabs block containing labeled sections and their nested content.
 * @returns The tabbed content panel.
 */
/**
 * Renders the TabsBlock component.
 *
 * @param block
 * @param props - Authored tab block with labeled nested sections to render.
 *
 * @return The read-only tab group.
 */
function TabsBlock({ block }: { block: DocsBlock<'tabs'> }): JSX.Element {
	return (
		<ErrorBoundary name='TabsBlock'>
			<TabsGroup>
				{(block.items ?? []).map((i, v) => {
					const entry = i as { content?: DocBody; title?: unknown };
					return (
						<TabsItem key={key(i, `${v}`)} title={typeof entry.title === 'string' ? entry.title : `Tab ${v + 1}`}>
							<TerraContentEditor content={(Array.isArray(entry.content) ? entry.content : []) as unknown as TerraContentData} docsAttachments={[]} memberProfile='docs' nested readOnly />
						</TabsItem>
					);
				})}
			</TabsGroup>
		</ErrorBoundary>
	);
}

/* Renders read-only Docs accordion sections. */
/**
 * Renders the AccordionBlock component.
 *
 * @param block
 * @param props - Authored accordion block with labeled expandable sections to render.
 *
 * @return The read-only accordion group.
 */
function AccordionBlock({ block }: { block: DocsBlock<'accordion'> }): JSX.Element {
	return (
		<ErrorBoundary name='AccordionBlock'>
			<AccordionGroup>
				{(block.items ?? []).map((i, v) => {
					const entry = i as { content?: DocBody; title?: unknown };
					return (
						<AccordionItem key={key(i, `${v}`)} title={typeof entry.title === 'string' ? entry.title : `Item ${v + 1}`}>
							<TerraContentEditor content={(Array.isArray(entry.content) ? entry.content : []) as unknown as TerraContentData} docsAttachments={[]} memberProfile='docs' nested readOnly />
						</AccordionItem>
					);
				})}
			</AccordionGroup>
		</ErrorBoundary>
	);
}

/* Shares tab and accordion mutations while preserving their component-local renderers. */
/*
 * Renders the SectionsEditor component.
 *
 * @param props - Portable Text editor attributes, nested children, section kind, block node, and path.
 * @returns The editor controls for tabs or accordion sections.
 */
/**
 * Renders the Sections component.
 *
 * @param attrs
 * @param children
 * @param kind
 * @param node
 * @param path
 * @param props - Authored tabs or accordion block selected for read-only display.
 *
 * @return The matching tabs or accordion group.
 */
function SectionsEditor({
	attributes: attrs,
	children,
	kind,
	node,
	path,
}: PortableTextBlockEditorProps<SectionsBlock> & {
	kind: 'accordion' | 'tabs';
}): React.JSX.Element {
	const editor = useEditor();
	const items = (node as SectionsBlock).items ?? [];
	const rename = (idx: number, title: string): void =>
		editor.send({
			type: 'block.set',
			at: path,
			props: { items: items.map((i, c) => (c === idx ? { ...i, title } : i)) },
		});
	const remove = (idx: number): void =>
		editor.send({
			type: 'block.set',
			at: path,
			props: { items: items.filter((_item, c) => c !== idx) },
		});
	const add = (): void =>
		editor.send({
			type: 'block.set',
			at: path,
			props: {
				items: [
					...items,
					{
						_key: crypto.randomUUID().replaceAll('-', ''),
						_type: 'item',
						content: [],
						title: kind === 'tabs' ? `Tab ${items.length + 1}` : `Item ${items.length + 1}`,
					},
				],
			},
		});
	const content = items.map((i, v) => {
		const title = typeof i.title === 'string' ? i.title : kind === 'tabs' ? `Tab ${v + 1}` : `Item ${v + 1}`;
		const nested = (
			<TerraContentEditor
				content={(i.content ?? []) as unknown as TerraContentData}
				docsAttachments={[]}
				memberProfile='docs'
				nested
				onChange={x =>
					editor.send({
						type: 'block.set',
						at: path,
						props: {
							items: items.map((i, c) => (c === v ? { ...i, content: x as DocsNestedContent } : i)),
						},
					})
				}
			/>
		);
		return kind === 'tabs' ? (
			<TabsItem key={i._key} title={title}>
				{nested}
			</TabsItem>
		) : (
			<AccordionItem key={i._key} title={title} onDelete={() => remove(v)} onRename={x => rename(v, x)}>
				{nested}
			</AccordionItem>
		);
	});
	return (
		<ErrorBoundary name='SectionsEditor'>
			<div {...attrs} contentEditable={false} data-terra-block={kind}>
				{kind === 'tabs' ? (
					<TabsGroup onAdd={add} onDelete={remove} onRename={(v, t) => rename(Number(v), t)}>
						{content}
					</TabsGroup>
				) : (
					<>
						<div className='mb-2'>
							<Button size='sm' variant='outline' onClick={add}>
								<AddIcon aria-hidden='true' /> Add section
							</Button>
						</div>
						<AccordionGroup>{content}</AccordionGroup>
					</>
				)}
				{children}
			</div>
		</ErrorBoundary>
	);
}

/**
 * Renders Docs tabs or accordion sections from their authored block.
 *
 * @param block
 * @param props - Authored tabs or accordion block with its labeled nested sections.
 *
 * @return The matching tabbed or expandable section group.
 */
function Sections({ block }: { block: SectionsBlock }): React.JSX.Element {
	return block._type === 'tabs' ? <TabsBlock block={block} /> : <AccordionBlock block={block} />;
}

/* Adapts Portable Text's block-object contract to the sections renderer. */
/**
 * Renders the renderSections component.
 *
 * @param attrs Portable Text attributes applied to the sections wrapper.
 * @param children Nested renderer content supplied by Portable Text.
 * @param node Tabs or accordion block data to display or edit.
 * @param path Portable Text path identifying the block.
 * @param readOnly Whether editing controls should be omitted.
 *
 * @return The sections renderer in editable or read-only mode.
 */
export function renderSections({ attributes: attrs, children, node, path, readOnly }: PortableTextBlockRendererProps<SectionsBlock>): React.JSX.Element {
	return readOnly ? <Sections block={node} /> : <SectionsEditor attributes={attrs} children={children} kind={node._type} node={node} path={path} />;
}
Object.assign(TabsBlock, { displayName: 'DocsTabsBlock' });
Object.assign(AccordionBlock, { displayName: 'DocsAccordionBlock' });
Object.assign(SectionsEditor, { displayName: 'DocsSectionsEditor' });
Object.assign(Sections, { displayName: 'DocsSections' });

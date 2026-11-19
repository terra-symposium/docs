/**
 * src/components/blocks.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import katex from 'katex';
import { defineBlockObject, defineInlineObject, useEditor } from '@portabletext/editor';
import { renderMarkdown } from '../lib/markdown.js';
import { useState } from 'react';
import { CodeBlock } from './terra/editor/docs/_CodeBlock.js';
import { NodesBlock } from './terra/editor/docs/_Nodes.js';
import { Button, DataTableContent, Input, Textarea } from '@terra-symposium/styling/ui';

// TYPES
import type { JSX } from 'react';
import type { Path } from '@portabletext/editor';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/
const GRID_GAP_2_5_ROUNDED_LG_BORDER_BORDER_BORDER_P_3_CLASS = 'grid gap-2.5 rounded-lg border border-border p-3';
const GRID_GAP_2_ROUNDED_MD_BORDER_BORDER_BORDER_P_2_5_CLASS = 'grid gap-2 rounded-md border border-border p-2.5';
const GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS = 'grid gap-1 text-sm font-semibold';

/** The portable Docs members. A host can disable any member without changing stored data. */
export const DOCS_BLOCK_TYPES = ['accordion', 'tabs', 'table', 'callout', 'code', 'docImage', 'embed', 'math', 'nodes', 'raw', 'tsDocs'] as const;
/** Literal discriminator values supported by the Docs Portable Text editor. */
export type DocsBlockType = (typeof DOCS_BLOCK_TYPES)[number];
/** Per-block enablement flags for customizing a Docs editor instance. */
export type DocsBlockOptions = Partial<Record<DocsBlockType | 'inlineMath', boolean>>;
/** Extensible Docs rich-text block record retained by viewers and editors. */
export type RichBlock = { _type: string; _key?: string; markdown?: string; [key: string]: unknown };
export const DOCS_BLOCK_FIELDS: Record<DocsBlockType, { name: string; type: 'string' | 'number' | 'boolean' | 'array' | 'object' }[]> = {
	accordion: [
		{ name: 'items', type: 'array' },
		{ name: 'markdown', type: 'string' },
	],
	tabs: [
		{ name: 'items', type: 'array' },
		{ name: 'markdown', type: 'string' },
	],
	table: [
		{ name: 'header', type: 'string' },
		{ name: 'rows', type: 'array' },
		{ name: 'markdown', type: 'string' },
	],
	callout: [
		{ name: 'kind', type: 'string' },
		{ name: 'title', type: 'string' },
		{ name: 'content', type: 'array' },
		{ name: 'markdown', type: 'string' },
	],
	code: [
		{ name: 'language', type: 'string' },
		{ name: 'source', type: 'string' },
		{ name: 'value', type: 'string' },
		{ name: 'markdown', type: 'string' },
	],
	docImage: [
		{ name: 'alt', type: 'string' },
		{ name: 'url', type: 'string' },
		{ name: 'title', type: 'string' },
		{ name: 'width', type: 'string' },
		{ name: 'height', type: 'string' },
		{ name: 'markdown', type: 'string' },
	],
	embed: [
		{ name: 'src', type: 'string' },
		{ name: 'title', type: 'string' },
		{ name: 'width', type: 'string' },
		{ name: 'height', type: 'string' },
		{ name: 'markdown', type: 'string' },
	],
	math: [
		{ name: 'code', type: 'string' },
		{ name: 'inline', type: 'boolean' },
		{ name: 'markdown', type: 'string' },
	],
	nodes: [
		{ name: 'nodes', type: 'array' },
		{ name: 'edges', type: 'array' },
		{ name: 'direction', type: 'string' },
		{ name: 'height', type: 'number' },
		{ name: 'nodeSep', type: 'number' },
		{ name: 'rankSep', type: 'number' },
		{ name: 'proximityConnect', type: 'boolean' },
		{ name: 'markdown', type: 'string' },
	],
	raw: [{ name: 'markdown', type: 'string' }],
	tsDocs: [
		{ name: 'scope', type: 'string' },
		{ name: 'markdown', type: 'string' },
	],
};
// hygiene-ignore single-use -- Keep one module-level default block map so editor insertions reuse the same authored shapes.
const defaults: Record<DocsBlockType, RichBlock> = {
	accordion: { _type: 'accordion', items: [{ title: 'Item', content: [] }] },
	tabs: { _type: 'tabs', items: [{ title: 'Tab', content: [] }] },
	table: { _type: 'table', header: 'Table', rows: [] },
	callout: { _type: 'callout', kind: 'info', title: 'Note', content: [] },
	code: { _type: 'code', language: 'text', value: '' },
	docImage: { _type: 'docImage', alt: '', url: '' },
	embed: { _type: 'embed', src: '', title: '' },
	math: { _type: 'math', code: '', inline: false },
	nodes: { _type: 'nodes', nodes: [], edges: [], direction: 'TB' },
	raw: { _type: 'raw', markdown: '' },
	tsDocs: { _type: 'tsDocs', scope: '' },
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Returns enabled block types while preserving the package's default set.
 *
 * @param options Optional flags that disable specific block types.
 *
 * @return Block discriminators enabled for the editor.
 */
export function enabledDocsBlocks(options: DocsBlockOptions = {}): DocsBlockType[] {
	return DOCS_BLOCK_TYPES.filter(t => options[t] !== false);
}

/**
 * Creates a fresh default value for a supported Docs block type.
 *
 * @param type Block discriminator whose default value is requested.
 *
 * @return Cloned block data that callers can edit without changing shared defaults.
 */
export function defaultDocsBlock(type: DocsBlockType): RichBlock {
	return structuredClone(defaults[type]);
}

/**
 *
 * @param v
 *
 * @return
 */
function text(v: unknown): string {
	if (typeof v === 'string') return v;
	if (Array.isArray(v)) return v.map(text).join(' ');
	if (v && typeof v === 'object') {
		const item = v as Record<string, unknown>;
		return text(item.markdown ?? item.text ?? item.children ?? item.content ?? '');
	}
	return '';
}

/**
 *
 * @param value
 *
 * @return
 */
function sUrl(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value.trim()) return undefined;
	try {
		return ['https:', 'http:', 'mailto:'].includes(new URL(value, 'https://docs.invalid').protocol) ? value : undefined;
	} catch {
		return undefined;
	}
}

/**
 *
 * @param item
 *
 * @return
 */
function nestedMarkdown(item: Record<string, unknown>): string {
	return typeof item.markdown === 'string' ? item.markdown : text(item.content);
}

/**
 * Read-only rendering for every reusable Docs member. Unknown data stays in the value.
 *
 * @param block Portable Text block to render.
 *
 * @return Read-only markup for the block's known content.
 */
export function DocsRichBlock({ block }: { block: RichBlock }): JSX.Element {
	const items = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : [];
	switch (block._type) {
		case 'accordion':
			return (
				<div>
					{items.map((v, i) => (
						<details key={i}>
							<summary>{text(v.title)}</summary>
							<div dangerouslySetInnerHTML={{ __html: renderMarkdown(nestedMarkdown(v)) }} />
						</details>
					))}
				</div>
			);
		case 'tabs':
			return (
				<div>
					{items.map((v, i) => (
						<details key={i} open={i === 0}>
							<summary>{text(v.title)}</summary>
							<div dangerouslySetInnerHTML={{ __html: renderMarkdown(nestedMarkdown(v)) }} />
						</details>
					))}
				</div>
			);
		case 'table': {
			const rows = Array.isArray(block.rows) ? (block.rows as Record<string, unknown>[]) : [];
			return (
				<section>
					{block.header && block.header !== 'Table' ? <strong>{text(block.header)}</strong> : null}
					<DataTableContent
						columns={(Array.isArray(rows[0]?.cells) ? (rows[0].cells as unknown[]) : []).map((cell, i) => ({
							key: String(i),
							label: text(cell),
							render: (row: Record<string, unknown>) => text(Array.isArray(row.cells) ? row.cells[i] : ''),
						}))}
						rows={rows.slice(1)}
						variant='default'
					/>
				</section>
			);
		}
		case 'callout': {
			const kind = text(block.kind);
			return (
				<aside className='docs-block my-0 flow-root' data-docs-aside={kind === 'warning' ? 'caution' : kind === 'error' ? 'danger' : kind || 'note'}>
					<h4 className='title'>{text(block.title)}</h4>
					<div dangerouslySetInnerHTML={{ __html: renderMarkdown(nestedMarkdown(block)) }} />
				</aside>
			);
		}
		case 'code':
			return <CodeBlock code={text(block.value)} language={text(block.language)} tone='view' />;
		case 'docImage':
			return sUrl(block.url) ? (
				<figure>
					<img src={sUrl(block.url)} alt={text(block.alt)} />
					<figcaption>{text(block.title)}</figcaption>
				</figure>
			) : (
				<p>Image URL unavailable</p>
			);
		case 'embed':
			return sUrl(block.src) ? (
				<iframe title={text(block.title) || 'Embedded content'} src={sUrl(block.src)} loading='lazy' sandbox='allow-scripts allow-same-origin allow-popups' />
			) : (
				<p>Embed URL unavailable</p>
			);
		case 'math': {
			const code = text(block.code);
			const html = katex.renderToString(code, {
				displayMode: !block.inline,
				throwOnError: false,
				strict: 'ignore',
				trust: false,
			});
			return block.inline ? (
				<span className='overflow-x-auto' aria-label={code} dangerouslySetInnerHTML={{ __html: html }} />
			) : (
				<div className='overflow-x-auto' aria-label={code} dangerouslySetInnerHTML={{ __html: html }} />
			);
		}
		case 'nodes':
			return <NodesBlock block={block as Parameters<typeof NodesBlock>[0]['block']} />;
		case 'raw':
			return <div className='terra-docs-raw' dangerouslySetInnerHTML={{ __html: renderMarkdown(text(block.markdown)) }} />;
		case 'tsDocs':
			return (
				<section className='terra-docs-tsdocs'>
					<strong>TypeScript: {text(block.scope)}</strong>
					{block.markdown && <p>{text(block.markdown)}</p>}
				</section>
			);
		default:
			return <pre data-unsupported-block={block._type}>{block.markdown ?? JSON.stringify(block)}</pre>;
	}
}

/**
 *
 * @param block
 * @param path
 * @param readOnly
 *
 * @return
 */
function BlockEditor({ block, path, readOnly }: { block: RichBlock; path: Path; readOnly: boolean }): JSX.Element {
	// hygiene-ignore single-use -- Call the editor hook unconditionally before deriving the active block fields.
	const editor = useEditor();
	const [expanded, setExpanded] = useState(false);
	const type = block._type as DocsBlockType;
	const set = (props: Record<string, unknown>) => editor.send({ type: 'block.set', at: path, props });
	const items = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : [];
	const rows = Array.isArray(block.rows) ? (block.rows as Record<string, unknown>[]) : [];
	const nodes = Array.isArray(block.nodes) ? (block.nodes as Record<string, unknown>[]) : [];
	const edges = Array.isArray(block.edges) ? (block.edges as Record<string, unknown>[]) : [];
	return (
		<div className='my-3 rounded-lg border border-border bg-background p-3'>
			<DocsRichBlock block={block} />
			{!readOnly && (
				<>
					<Button variant='outline' size='sm' onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
						Edit {type}
					</Button>
					{expanded && (
						<div className='mt-3 grid gap-3'>
							{(DOCS_BLOCK_FIELDS[type] ?? []).map(f => {
								const value = block[f.name];
								const update = (n: unknown) => set({ [f.name]: n, markdown: f.name === 'markdown' ? n : '' });
								if (f.name === 'items')
									return (
										<fieldset className={GRID_GAP_2_5_ROUNDED_LG_BORDER_BORDER_BORDER_P_3_CLASS} key='items'>
											<legend>Items</legend>
											{items.map((item, index) => (
												<div className={GRID_GAP_2_ROUNDED_MD_BORDER_BORDER_BORDER_P_2_5_CLASS} key={index}>
													<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS}>
														Title
														<Input
															value={text(item.title)}
															onChange={event =>
																set({
																	items: items.map((entry, i) => (i === index ? { ...entry, title: event.currentTarget.value } : entry)),
																	markdown: '',
																})
															}
														/>
													</label>
													<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS}>
														Content
														<Textarea
															value={nestedMarkdown(item)}
															onChange={event =>
																set({
																	items: items.map((entry, i) => (i === index ? { ...entry, markdown: event.currentTarget.value } : entry)),
																	markdown: '',
																})
															}
														/>
													</label>
													<Button variant='outline' size='sm' onClick={() => set({ items: items.filter((_entry, i) => i !== index), markdown: '' })}>
														Remove item
													</Button>
												</div>
											))}
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													set({
														items: [...items, { title: 'Item', markdown: '', content: [] }],
														markdown: '',
													})
												}
											>
												Add item
											</Button>
										</fieldset>
									);
								if (f.name === 'rows')
									return (
										<fieldset className={GRID_GAP_2_5_ROUNDED_LG_BORDER_BORDER_BORDER_P_3_CLASS} key='rows'>
											<legend>Table rows</legend>
											{rows.map((row, rowIndex) => {
												const cells = Array.isArray(row.cells) ? (row.cells as Record<string, unknown>[]) : [];
												return (
													<div key={rowIndex} className={GRID_GAP_2_ROUNDED_MD_BORDER_BORDER_BORDER_P_2_5_CLASS}>
														{cells.map((cell, cellIndex) => (
															<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS} key={cellIndex}>
																Cell {cellIndex + 1}
																<Input
																	value={text(cell.content ?? cell.markdown)}
																	onChange={event =>
																		set({
																			rows: rows.map((entry, i) =>
																				i === rowIndex
																					? {
																							...entry,
																							cells: cells.map((current, j) =>
																								j === cellIndex
																									? {
																											...current,
																											markdown: event.currentTarget.value,
																											content: [],
																										}
																									: current,
																							),
																						}
																					: entry,
																			),
																			markdown: '',
																		})
																	}
																/>
															</label>
														))}
														<Button
															variant='outline'
															size='sm'
															onClick={() =>
																set({
																	rows: rows.map((entry, i) =>
																		i === rowIndex
																			? {
																					...entry,
																					cells: [...cells, { _type: 'cell', content: [], markdown: '' }],
																				}
																			: entry,
																	),
																	markdown: '',
																})
															}
														>
															Add cell
														</Button>
														<Button
															variant='outline'
															size='sm'
															onClick={() =>
																set({
																	rows: rows.filter((_entry, i) => i !== rowIndex),
																	markdown: '',
																})
															}
														>
															Remove row
														</Button>
													</div>
												);
											})}
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													set({
														rows: [
															...rows,
															{
																_type: 'row',
																cells: [{ _type: 'cell', content: [], markdown: '' }],
															},
														],
														markdown: '',
													})
												}
											>
												Add row
											</Button>
										</fieldset>
									);
								if (f.name === 'nodes')
									return (
										<fieldset className={GRID_GAP_2_5_ROUNDED_LG_BORDER_BORDER_BORDER_P_3_CLASS} key='nodes'>
											<legend>Diagram nodes</legend>
											{nodes.map((node, index) => (
												<div key={index} className={GRID_GAP_2_ROUNDED_MD_BORDER_BORDER_BORDER_P_2_5_CLASS}>
													<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS}>
														ID
														<Input
															value={text(node.id)}
															onChange={event =>
																set({
																	nodes: nodes.map((entry, i) => (i === index ? { ...entry, id: event.currentTarget.value } : entry)),
																	markdown: '',
																})
															}
														/>
													</label>
													<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS}>
														Title
														<Input
															value={text((node.data as Record<string, unknown> | undefined)?.title)}
															onChange={event =>
																set({
																	nodes: nodes.map((entry, i) =>
																		i === index
																			? {
																					...entry,
																					data: {
																						...((entry.data as Record<string, unknown>) ?? {}),
																						title: event.currentTarget.value,
																					},
																				}
																			: entry,
																	),
																	markdown: '',
																})
															}
														/>
													</label>
													<Button variant='outline' size='sm' onClick={() => set({ nodes: nodes.filter((_entry, i) => i !== index), markdown: '' })}>
														Remove node
													</Button>
												</div>
											))}
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													set({
														nodes: [...nodes, { id: crypto.randomUUID(), type: 'process', data: { title: 'Node' } }],
														markdown: '',
													})
												}
											>
												Add node
											</Button>
										</fieldset>
									);
								if (f.name === 'edges')
									return (
										<fieldset className={GRID_GAP_2_5_ROUNDED_LG_BORDER_BORDER_BORDER_P_3_CLASS} key='edges'>
											<legend>Connections</legend>
											{edges.map((edge, index) => (
												<div key={index} className={GRID_GAP_2_ROUNDED_MD_BORDER_BORDER_BORDER_P_2_5_CLASS}>
													{(['source', 'target'] as const).map(name => (
														<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS} key={name}>
															{name}
															<select
																className='min-h-9 rounded-md border border-border bg-background p-1.5'
																value={text(edge[name])}
																onChange={event =>
																	set({
																		edges: edges.map((entry, i) => (i === index ? { ...entry, [name]: event.currentTarget.value } : entry)),
																		markdown: '',
																	})
																}
															>
																{nodes.map(node => (
																	<option key={text(node.id)} value={text(node.id)}>
																		{text((node.data as Record<string, unknown> | undefined)?.title ?? node.id)}
																	</option>
																))}
															</select>
														</label>
													))}
													<Button variant='outline' size='sm' onClick={() => set({ edges: edges.filter((_entry, i) => i !== index), markdown: '' })}>
														Remove connection
													</Button>
												</div>
											))}
											<Button
												variant='outline'
												size='sm'
												disabled={nodes.length < 2}
												onClick={() =>
													set({
														edges: [
															...edges,
															{
																id: crypto.randomUUID(),
																source: nodes[0]?.id,
																target: nodes[1]?.id,
															},
														],
														markdown: '',
													})
												}
											>
												Add connection
											</Button>
										</fieldset>
									);
								if (f.name === 'content')
									return (
										<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS} key='content'>
											Content
											<Textarea value={typeof block.markdown === 'string' ? block.markdown : text(value)} onChange={event => set({ markdown: event.currentTarget.value })} />
										</label>
									);
								return (
									<label className={GRID_GAP_1_TEXT_SM_FONT_SEMIBOLD_CLASS} key={f.name}>
										{f.name}
										{f.type === 'boolean' ? (
											<input type='checkbox' checked={Boolean(value)} onChange={event => update(event.currentTarget.checked)} />
										) : (
											<Textarea value={String(value ?? '')} onChange={event => update(f.type === 'number' ? Number(event.currentTarget.value) : event.currentTarget.value)} />
										)}
									</label>
								);
							})}
						</div>
					)}
				</>
			)}
		</div>
	);
}

// hygiene-ignore single-use -- Keep the exported docsBlockNodes callable API available to external consumers; its one local reference does not replace that contract.
/**
 * Creates Portable Text block and inline definitions enabled for a Docs editor.
 *
 * @param options Optional block enablement flags.
 *
 * @return Editor block definitions for the selected Docs members.
 */
export function docsBlockNodes(options: DocsBlockOptions = {}) {
	const nodes = enabledDocsBlocks(options).map(t =>
		defineBlockObject({
			type: t,
			render: ({ attributes, children, node, path, readOnly }) => (
				<div {...attributes} data-docs-block={t} contentEditable={false}>
					<BlockEditor block={node as RichBlock} path={path} readOnly={readOnly} />
					{children}
				</div>
			),
		}),
	);
	if (options.inlineMath !== false)
		nodes.push(
			defineInlineObject({
				type: 'math',
				render: ({ attributes: a, children: c, node: n }) => (
					<span {...a} contentEditable={false}>
						<DocsRichBlock block={{ ...(n as RichBlock), _type: 'math', inline: true }} />
						{c}
					</span>
				),
			}) as never,
		);
	return nodes;
}

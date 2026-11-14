/**
 * src/lib/terra/runtime/types.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { ComponentType, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Indexable object whose properties have not been narrowed yet. */
type UnknownRecord = Record<string, unknown>;
/** Portable Text shaped block with an extensible type-specific payload. */
type PortableBlock<T extends string = string> = T extends string ? { _type: T; _key?: string; children?: PortableBlock[]; [key: string]: unknown } : never;
/** Access level granted to a Docs page or attachment. */
export type DocsPermissionLevel = 'read' | 'write';
/** Active Docs workspace screen. */
export type Mode = 'view' | 'edit' | 'attachments';
/** Transition state used while changing workspace views. */
export type Transition = 'idle' | 'local' | 'p' | `to-${Mode}`;
/** Cell content and source formats used by document tables. */
export type DocTableCell = {
	_key?: string;
	_type?: 'cell';
	content?: DocBody;
	html?: string;
	markdown?: string;
};
/** Extensible Docs content block with common text, media, and layout fields. */
export type DocBlock = {
	_type: string;
	_key?: string;
	alt?: string;
	children?: PortableBlock[];
	code?: string;
	content?: DocBody | null;
	depth?: number;
	direction?: string;
	edges?: unknown[];
	height?: number | string;
	inline?: boolean;
	items?: Array<{ content?: DocBody | null; markdown?: string; title?: string }>;
	kind?: string;
	language?: string;
	listItem?: string;
	markdown?: string;
	markDefs?: DocsContentPtMarkDef[];
	nodes?: unknown[];
	nodeSep?: number;
	proximityConnect?: boolean;
	rankSep?: number;
	rows?: Array<{ cells: DocTableCell[] }>;
	source?: string;
	src?: string;
	scope?: string;
	style?: string;
	text?: string;
	title?: string;
	url?: string;
	value?: unknown;
	width?: number | string;
	[key: string]: unknown;
};
/** Ordered block list representing a document body. */
export type DocBody = DocBlock[];
/**
 * Narrows unknown input to an array of Docs content blocks.
 *
 * @param value Candidate body value to inspect.
 *
 * @return Whether the value is an array of typed content blocks.
 */
export const isDocBody = (value: unknown): value is DocBody => Array.isArray(value) && value.every(b => b && typeof b === 'object' && '_type' in b);
/** Saved document version and its serialized or structured content. */
export type DocVer = {
	_key?: string;
	ver?: string;
	content?: string | DocBody;
	contentJson: string;
	body?: DocBody;
	component?: string;
	description: string;
	title: string;
	savedAt: string;
};
/** Markdown-backed document record loaded by the Docs runtime. */
export type Md = {
	[key: string]: unknown;
	content?: string | DocVer[] | DocBody | null;
	description?: string;
	component?: string;
	order?: number;
	path?: string;
	pathname?: string;
	src?: string;
	title?: string;
	sources?: string[];
};
/** Result returned by a Docs host action. */
export type ActionRes<T = unknown> = { data?: T; error?: unknown };
/** Editable document draft maintained by the editor. */
export type Draft = {
	content?: string | DocBody | null;
	description?: string;
	path?: string;
	title?: string;
	source: string;
};
/** Text selection and geometry captured from the document editor. */
export type EditorSel = {
	anchorOffset?: number;
	anchorPath?: number[] | null;
	anchorText?: string;
	box?: { height: number; left: number; top: number; width: number };
	collapsed?: boolean;
	code?: { from: number; to: number } | null;
	dom?: Range | null;
	focusOffset?: number;
	focusPath?: number[] | null;
	focusText?: string;
	text?: string;
	visible?: boolean;
};
/** Mutable references to editor content, selection, and toolbar state. */
export type EditorRefs = {
	body?: HTMLElement | null;
	selection?: EditorSel | null;
	toolbar?: ToolbarState | null;
};
/** Host-defined editor surface state exposed to Docs contexts. */
export type EditorSurface = UnknownRecord;
/** Operations and state exposed by the Docs editor toolbar. */
export type ToolbarState = {
	applySearchText: (value: string) => void;
	busy: string | null;
	dirty: boolean;
	discard?: () => void | Promise<void>;
	insert: (md: string, rootEnd?: boolean, selection?: EditorSel | null) => void;
	optimistic?: boolean;
	path?: string;
	permission?: DocsPermissionLevel;
	prettier?: () => void;
	readSearchText: () => Promise<string>;
	save?: () => void | Promise<void>;
	setMode: (mode: Mode) => Promise<void>;
	toggleList?: (kind: string) => void;
};
// terra-quality-ignore single-use -- Keep the exported EditorState type contract available to external consumers; its one local reference does not replace that contract.
/** Load, save, and dirty state shared by the document editor. */
export type EditorState = {
	busy: string | null;
	dirty: boolean;
	draft: Draft;
	loaded: boolean;
	optimistic: boolean;
	version: number;
};

/** Navigation leaf representing a document or attachment. */
export type Leaf = {
	type: 'leaf';
	origName: string;
	path?: string;
	url: string;
	permission: DocsPermissionLevel;
	title?: string;
	description?: string;
	contributors?: string[];
	content?: unknown;
	source?: string;
	[key: string]: unknown;
};
/** Navigation branch containing child Docs pages or branches. */
export type Branch = {
	type: 'branch';
	origName: string;
	children: Tree[];
	permission: DocsPermissionLevel;
	title?: string;
	url?: string;
	firstLeafUrl?: string;
	hue?: number;
	[key: string]: unknown;
};
/** Union of a document leaf and a grouped navigation branch. */
export type Tree = Leaf | Branch;
/** Supported attachment categories in the Docs workspace. */
export type AttchType = 'image' | 'pdf' | 'youtube' | 'tsdocs' | 'website' | 'file' | 'doc' | 'document' | 'other';
/** Related document or attachment discovered beside a page. */
export type Sister = {
	content?: unknown;
	id?: string;
	path: string;
	name: string;
	isMd: boolean;
	title?: string;
	type?: string;
	sourceUrl?: string;
	source?: string;
	unavailable?: boolean;
};
/** Action entry displayed in a Docs navigation tree menu. */
export type DocsTreeMenuAction = {
	destructive?: boolean;
	disabled?: boolean;
	icon?: ReactNode;
	label: string;
	onSelect?: () => void;
	separator?: boolean;
	subActions?: DocsTreeMenuAction[];
};
/** Format, flattening, and category filters for a workspace export. */
export type DocsExportOpts = {
	flatten: boolean;
	format: 'raw' | 'pdf';
	filters: {
		pages: boolean;
		pdfs: boolean;
		images: boolean;
		youtube: boolean;
		tsdocs: boolean;
		other: boolean;
	};
	merges: { pages: boolean; pdfs: boolean; images: boolean; youtube: boolean; tsdocs: boolean };
};
/** Selected export destination and source paths, or no active selection. */
export type ExportTgt = {
	paths: string[];
	rootDir: string;
	filename: string;
	title: string;
	nodeIds?: string[];
} | null;
/** Selected attachment destination within the Docs navigation tree. */
export type AttchTgt = {
	path: string;
	title: string;
	scope: 'section' | 'group' | 'leaf';
	node: Tree;
};
/** Selected branch or leaf scheduled for removal. */
export type DelTgt = {
	kind: 'section' | 'branch' | 'leaf';
	path: string;
	bPath?: string;
	slugPath?: string;
	active?: boolean;
	title: string;
	origNode?: Tree;
} | null;
/** Controlled prompt dialog state and its save and cancel callbacks. */
export type PromptState = {
	open: boolean;
	title: string;
	description?: string;
	label: string;
	value: string;
	onSave: (val: string) => void;
	onCancel?: () => void;
} | null;
/** Editor block-menu option and the action it triggers. */
export type BlockOpt = {
	group: 'type' | 'insert';
	icon: ReactNode;
	label: string;
	value: string;
	onSelect: () => void;
};
/** Repository-provided Docs component with optional display labels. */
export type RepoComponentWithLabel = {
	name: string;
	label?: string;
	component?: ComponentType<UnknownRecord>;
	displayLabel?: string;
	[key: string]: unknown;
};
/** Nested menu structure for repository components and folders. */
export type MenuTree = { components: RepoComponentWithLabel[]; folders: Record<string, MenuTree> };
/** Active drag operation for a leaf or branch in the Docs tree. */
export type DragState = { active: boolean; path: string; kind: 'leaf' } | { fPath: string; kind: 'branch'; pPath: string };
/** Drop target and relative placement for a tree reorder operation. */
export type ReorderDropState = { key: string; position: 'after' | 'before' | 'inside' };
// terra-quality-ignore single-use -- Keep the exported TableRow type contract available to external consumers; its one local reference does not replace that contract.
/** Portable Text table row containing keyed cells. */
export type TableRow<TCell = DocTableCell> = { _key: string; _type: 'row'; cells: TCell[] };
/** DOM block annotated with optional Docs action metadata. */
export type BlockTgt = HTMLElement & { __blockActions?: UnknownRecord[] };
/** Parsed TypeScript documentation item rendered in Docs. */
export type TsDocsItem = { slug: string; title: string; body: DocBody };
/** Extensible graph edge record. */
export type Edge = UnknownRecord;
/** Extensible flow graph node record. */
export type FlowNode = UnknownRecord;
/** Optional styling and handle overrides attached to a flow edge. */
export type FlowEdgeData = UnknownRecord & {
	color?: string;
	label?: string;
	srcHandleOverride?: string;
	tgtHandleOverride?: string;
};
/** Display, interaction, and handle settings for a flow node. */
export type NodeData = UnknownRecord & {
	attributes?: Array<{ name: string; type?: string; value?: string }>;
	compact?: boolean;
	editable?: boolean;
	href?: string;
	id?: string;
	onClick?: () => void;
	requiredHandles?: { sources?: Pos[]; tgts?: Pos[] };
	title?: string;
};
/** Cardinal side used to place a flow node handle. */
export type Pos = 'top' | 'right' | 'bottom' | 'left';
/** Optional measured dimensions and coordinates for a graph node. */
export type DagreNode = { x?: number; y?: number; width?: number; height?: number };
/** Graph node input with an identifier and optional position. */
export type FlowNodeLike = {
	id: string;
	position?: { x: number; y: number };
	[key: string]: unknown;
};
/** Width and height used by the flow layout and resize handlers. */
export type FlowSize = { w: number; h: number };
/** Node and edge collections passed to the flow renderer. */
export type NodesProps = UnknownRecord & {
	direction?: string;
	edges?: Edge[];
	height?: number;
	nodes?: FlowNode[];
};
/** Flow node data with group resize behavior. */
export type GroupNodeData = NodeData & {
	isDragTarget?: boolean;
	onResizeEnd?: (id: string, size: FlowSize) => void;
};
/** Power Source graph shape accepted by placement helpers. */
export type PowerSrcGraph = {
	nodes: Array<
		| { type: 'origin' | 'terminal'; position?: { row?: number }; [key: string]: unknown }
		| {
				type: 'content';
				question?: { _ref?: string };
				position?: { row?: number };
				[key: string]: unknown;
		  }
	>;
	[key: string]: unknown;
};
/** Portable Text mark definition used in Docs content. */
export type DocsContentPtMarkDef = {
	_key?: string;
	_type?: string;
	href?: string;
	[key: string]: unknown;
};
/** Portable Text span containing inline text and mark references. */
export type DocsContentPtSpan = {
	_key?: string;
	_type?: string;
	marks?: string[];
	text?: string;
	[key: string]: unknown;
};
/** Editable values collected for a Docs nodes block. */
export type DocsNodesDraft = Record<string, boolean | string | undefined>;
/** Field descriptor used by Docs forms and block editors. */
export type Field = {
	key: string;
	kind: string;
	label: string;
	placeholder?: string;
	textarea?: boolean;
	tooltip: string;
};

/** Host adapter record for editor toolbar integrations. */
export type EditorToolbarAdapter = UnknownRecord;
// terra-quality-ignore single-use -- Keep the exported PortableEditorBlock type contract available to external consumers; its one local reference does not replace that contract.
/** Portable Text block used by the editor integration. */
export type PortableEditorBlock = PortableBlock;

/** Nested Portable Text content stored inside a Docs block. */
export type DocsNestedContent = PortableBlock[];
/** Portable Text document content handled by Terra Docs. */
export type TerraContent = PortableBlock[];
/** Problem document record used by problem content views. */
export type Problem = { _id?: string; title?: string; [key: string]: unknown };

// terra-quality-ignore single-use -- Keep the exported ArticleContent type contract available to external consumers; its one local reference does not replace that contract.
/** Article body with standard text blocks and supported inline objects. */
export type ArticleContent = Array<
	PortableBlock<'block'> & {
		children?: PortableBlock<'image' | 'video' | 'table' | 'questions' | 'dialogue' | 'definition'>[];
	}
>;
/** Portable Text content using the registered Docs block schema names. */
export type DocsContent = PortableBlock<keyof typeof DOCS_BLOCK_SCHEMAS>[];
/** Portable Text content using the supported problem block types. */
export type ProblemContent = PortableBlock<(typeof PROBLEM_BLOCK_TYPES)[number]>[];
/** Directed arc graph with extensible graph metadata. */
export type ArcGraph = { nodes: FlowNodeLike[]; edges: ArcGraphEdge[]; [key: string]: unknown };
/** Directed connection between two graph node identifiers. */
export type ArcGraphEdge = { source: string; target: string; [key: string]: unknown };
export const DOCS_BLOCK_SCHEMAS = {
	accordion: { fields: [{ name: 'items', type: 'array' }] },
	tabs: { fields: [{ name: 'items', type: 'array' }] },
	table: { fields: [{ name: 'rows', type: 'array' }] },
	callout: {
		fields: [
			{ name: 'kind', type: 'string' },
			{ name: 'content', type: 'array' },
		],
	},
	code: { fields: [{ name: 'value', type: 'string' }] },
	docImage: { fields: [{ name: 'url', type: 'string' }] },
	embed: { fields: [{ name: 'src', type: 'string' }] },
	math: { fields: [{ name: 'code', type: 'string' }] },
	nodes: { fields: [{ name: 'nodes', type: 'array' }] },
	raw: { fields: [{ name: 'markdown', type: 'string' }] },
	tsDocs: { fields: [{ name: 'scope', type: 'string' }] },
} satisfies Record<string, { fields: Array<{ name: string; type: string }> }>;
export const PROBLEM_BLOCK_TYPES = [
	'hint',
	'headline',
	'nodes',
	'entity',
	'definition',
	'countryReference',
	'notes',
	'photo',
	'audio',
	'video',
	'choicesReference',
	'question',
	'prompts',
	'timer',
	'table',
	'map',
	'tabs',
	'accordion',
] as const;

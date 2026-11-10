/**
 * src/lib/terra/runtime/types.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { ComponentType, ReactNode, SVGProps } from 'react';
import type { Edge as XYFlowEdge, Node as XYFlowNode, ReactFlowProps } from '@xyflow/react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** String-keyed object used where host-specific fields are preserved. */
type UnknownRecord = Record<string, unknown>;
/** Portable Text block data with optional nested children and custom fields. */
export type PortableBlock<T extends string = string> = T extends string
  ? { _type: T; _key?: string; children?: PortableBlock[]; [key: string]: unknown }
  : never;
/** Permission levels understood by the Docs workspace. */
export type DocsPermissionLevel = 'read' | 'write';
/** The active document surface mode. */
export type Mode = 'view' | 'edit' | 'attachments';
/** Navigation state used while the workspace changes routes or modes. */
export type Transition = 'idle' | 'local' | 'p' | `to-${Mode}`;
/** A table cell that can retain rich content or legacy markup. */
export type DocTableCell = {
  _key?: string;
  _type?: 'cell';
  content?: DocBody;
  html?: string;
  markdown?: string;
};
/** A Docs content block with fields shared by the supported block types. */
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
  header?: string;
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
  rows?: Array<{ _key?: string; _type?: 'row'; cells: DocTableCell[] }>;
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
/** Ordered Docs blocks stored as a document body. */
export type DocBody = DocBlock[];
/**
 * Checks whether an unknown value contains only Docs content blocks.
 *
 * @param value - Value to validate as a Docs body.
 *
 * @returns True when the value is an array of objects with a _type field.
 */
export const isDocBody = (value: unknown): value is DocBody =>
  Array.isArray(value) && value.every((b) => b && typeof b === 'object' && '_type' in b);
/** A saved document version together with its serialized body and metadata. */
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
/** A Docs page record that can contain Markdown, structured content, or versions. */
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
/** Result envelope returned by a Docs host action. */
export type ActionRes<T = unknown> = { data?: T; error?: unknown };
/** Editable document values retained while a page is being changed. */
export type Draft = {
  content?: string | DocBody | null;
  description?: string;
  path?: string;
  title?: string;
  source: string;
};
/** Selection coordinates shared by rich-text and source editors. */
export type EditorSel = {
  anchorOffset?: number | null | undefined;
  anchorPath?: number[] | null | undefined;
  anchorText?: string | undefined;
  anchorLinear?: number | null | undefined;
  box?: { height: number; left: number; top: number; width: number } | undefined;
  collapsed?: boolean | undefined;
  code?: { from: number; to: number } | null | undefined;
  dom?: Range | null | undefined;
  focusOffset?: number | null | undefined;
  focusPath?: number[] | null | undefined;
  focusText?: string | undefined;
  focusLinear?: number | null | undefined;
  text?: string | undefined;
  visible?: boolean | undefined;
};
/** Mutable editor references and pending synchronization state. */
export type EditorRefs = {
  blob?: Blob | null;
  body?: HTMLElement | null;
  code?: string;
  dirty?: boolean;
  editor?: unknown;
  lastMd?: string;
  load?: { ignoreInitialChange: boolean; pendingContent: string };
  norm?: { force: boolean; markdown: string; replay: boolean; structural: boolean };
  previews?: Map<string, unknown>;
  reparse?: string;
  replacements?: Map<string, unknown>;
  route?: { path: string | undefined; pathname: string };
  saved?: string;
  selection?: EditorSel | null;
  toolbar?: ToolbarState | null;
  uploads?: Map<string, unknown>;
  version?: unknown;
};
/** Runtime contract exposed by the active document editing surface. */
export type EditorSurface = {
  attachFiles: (files: File[]) => Promise<void>;
  controls: ToolbarState;
  editor: {
    busy: string | null;
    dirty: boolean;
    draft: Draft;
    loaded: boolean;
    optimistic: boolean;
    version: number;
  };
  insert: (markdown: string, rootEnd?: boolean, selection?: EditorSel | null) => void;
  mode: Mode;
  onBodyChange: (body: DocBody) => void;
  onMdChange: (markdown: string) => void;
  onVisualError: (err: unknown) => void;
  parseError: string | null;
  path: string | undefined;
  pathname: string;
  refs: import('react').MutableRefObject<EditorRefs>;
  save: () => Promise<void>;
  setMode: (mode: Mode) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
};
/** Actions and status values presented by the Docs toolbar. */
export type ToolbarState = {
  applySearchText: (value: string) => void;
  busy: string | null;
  dirty: boolean;
  discard?: () => void | Promise<void>;
  insert: (md: string, rootEnd?: boolean, selection?: EditorSel | null) => void;
  optimistic?: boolean | undefined;
  path?: string | undefined;
  permission?: DocsPermissionLevel;
  prettier?: () => void;
  readSearchText: () => Promise<string>;
  save?: () => void | Promise<void>;
  setMode: (mode: Mode) => Promise<void>;
  toggleList?: (kind: string) => void;
};
/** A navigable document or attachment at the end of a Docs tree branch. */
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
/** A navigable group of child branches or leaves in the Docs tree. */
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
/** A single branch or leaf in the Docs navigation tree. */
export type Tree = Leaf | Branch;
/** Attachment categories supported by the Docs workspace. */
export type AttchType =
  'image' | 'pdf' | 'youtube' | 'tsdocs' | 'website' | 'file' | 'doc' | 'document' | 'other';
/** A related Docs page or source file shown beside the current page. */
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
/** One action or nested action group in a Docs tree menu. */
export type DocsTreeMenuAction = {
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onSelect?: () => void;
  separator?: boolean;
  subActions?: DocsTreeMenuAction[];
};
/** Format and content filters used when exporting a Docs collection. */
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
/** Destination details for a Docs export, or null when none is selected. */
export type ExportTgt = {
  paths: string[];
  rootDir: string;
  filename: string;
  title: string;
  nodeIds?: string[];
} | null;
/** Selected tree target awaiting a delete confirmation, or null. */
export type DelTgt = {
  kind: 'section' | 'branch' | 'leaf';
  path: string;
  bPath?: string;
  slugPath?: string;
  active?: boolean;
  title: string;
  origNode?: Tree;
} | null;
/** Text prompt state used by Docs confirmation and rename dialogs. */
export type PromptState = {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  value: string;
  onSave: (val: string) => void;
  onCancel?: () => void;
} | null;
/** One selectable block command displayed in the Docs editor menu. */
export type BlockOpt = {
  group: 'type' | 'insert';
  icon: ComponentType<SVGProps<SVGSVGElement>> | ReactNode;
  label: string;
  value: string;
  onSelect: () => void;
};
/** A repository component paired with its display label. */
export type RepoComponentWithLabel = {
  name: string;
  path?: string;
  label?: string;
  component?: ComponentType<UnknownRecord>;
  clipboardValue?: string;
  displayLabel?: string;
  [key: string]: unknown;
};
/** A nested menu tree grouping components by repository folder. */
export type MenuTree = { components: RepoComponentWithLabel[]; folders: Record<string, MenuTree> };
/** Active drag information for a document leaf or branch. */
export type DragState =
  | { active: boolean; path: string; kind: 'leaf' }
  | { fPath: string; kind: 'branch'; pPath: string };
/** Drop target and placement chosen while reordering Docs navigation items. */
export type ReorderDropState = { key: string; position: 'after' | 'before' | 'inside' };
/** A DOM block annotated with optional Docs actions. */
export type BlockTgt = HTMLElement & { __blockActions?: UnknownRecord[] };
/** A TypeScript documentation page available for insertion into Docs. */
export type TsDocsItem = { slug: string; title: string; body: DocBody };
/** Data shared by standard and custom flowchart nodes. */
export type NodeData = Record<string, unknown> & {
  attributes?: Array<{ name: string; type?: string; value?: string }>;
  compact?: boolean;
  customPosition?: { x?: number; y?: number };
  editable?: boolean;
  groupId?: string;
  href?: string;
  id?: string;
  isDragTarget?: boolean;
  onClick?: () => void;
  onResizeEnd?: (id: string, size: FlowResizeParams) => void;
  requiredHandles?: { sources?: Pos[]; targets?: Pos[]; tgts?: Pos[] };
  title?: string;
};
/** XYFlow node specialized for Docs flowchart data. */
export type FlowNode = XYFlowNode<NodeData>;
/** XYFlow edge whose data can preserve host-specific fields. */
export type Edge = XYFlowEdge<Record<string, unknown>>;
/** Cardinal side used by flowchart node handles. */
export type Pos = 'top' | 'right' | 'bottom' | 'left';
/** Optional layout coordinates measured by Dagre. */
export type DagreNode = { x?: number; y?: number; width?: number; height?: number };
/** Flow node shape accepted by graph conversion helpers. */
export type FlowNodeLike = FlowNode;
/** Position and dimensions reported after a node resize. */
export type FlowResizeParams = { x: number; y: number; width: number; height: number };
/** Public props accepted by the Docs flowchart renderer. */
export type NodesProps = Omit<
  ReactFlowProps<FlowNode, Edge>,
  'nodes' | 'edges' | 'onNodeClick' | 'onFocus' | 'onBlur'
> & {
  allowedTypes?: string[];
  arcControls?: boolean;
  clipboardKey?: string;
  direction?: 'TB' | 'LR';
  disabled?: boolean;
  editable?: boolean;
  edges?: Edge[];
  height?: number;
  interactive?: boolean;
  lockedTypes?: string[];
  nodes?: FlowNode[];
  nodeLabels?: Record<string, string>;
  nodeSep?: number;
  onAddContent?: (position: { x: number; y: number }) => void;
  onCommit?: (graph: { nodes: FlowNode[]; edges: Edge[] }) => void;
  onNodeClick?: (node: FlowNode) => void;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  tabIndex?: number;
  onReady?: () => void;
  onResizeEnd?: (id: string, size: FlowResizeParams) => void;
  proximityConnect?: boolean;
  rankSep?: number;
  readyWhenEmpty?: boolean;
  showBg?: boolean;
  showCtrls?: boolean;
};
/** Node data used by a resizable flowchart group. */
export type GroupNodeData = NodeData & {
  isDragTarget?: boolean;
  onResizeEnd?: (id: string, size: FlowResizeParams) => void;
};
/** Unvalidated source graph shape normalized by the Docs flow runtime. */
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
/** Portable Text annotation definition preserved in Docs content. */
export type DocsContentPtMarkDef = {
  _key?: string;
  _type?: string;
  href?: string;
  [key: string]: unknown;
};
/** Field metadata used to render a Docs block editor control. */
export type Field = {
  key: string;
  kind: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
  tooltip: string;
};
/** Host-provided toolbar extension values. */
/** Optional editor commands supplied by a host's editor implementation. */
export type EditorToolbarAdapter = {
  format?: (kind: string) => void;
  insert?: ToolbarState['insert'];
  ready?: boolean;
  redo?: () => void;
  redoable?: boolean;
  setBlockType?: (type: string) => void;
  toggleList?: (kind: string) => void;
  undo?: () => void;
  undoable?: boolean;
};
/** Host-specific block inserted from the Docs toolbar. */
export type ToolbarBlock = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  insert: () => string;
  label: string;
  type: string;
};
/** Portable Text members accepted as a Docs content value. */
export type Content = PortableBlock[];
/** A problem record that can be referenced by Docs content. */
export type Problem = { _id?: string; title?: string; [key: string]: unknown };
/** Docs block content narrowed to the configured block schema names. */
export type DocsContent = {
  [T in keyof typeof DOCS_BLOCK_SCHEMAS]: DocBlock & { _type: T };
}[keyof typeof DOCS_BLOCK_SCHEMAS][];
/** Portable Text blocks supported by the problem-content renderer. */
export type ProblemContent = PortableBlock<(typeof PROBLEM_BLOCK_TYPES)[number]>[];
/** Flow graph persisted by the power-source integration. */
export type ArcGraph = {
  nodes: FlowNodeLike[];
  edges: { source: string; target: string; [key: string]: unknown }[];
  [key: string]: unknown;
};
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
  quiz: { fields: [{ name: 'markdown', type: 'string' }] },
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

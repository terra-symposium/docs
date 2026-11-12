/**
 * src/lib/terra/runtime/types.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type {
  ComponentType,
  CSSProperties,
  FocusEventHandler,
  MutableRefObject,
  ReactNode,
  SVGProps,
} from 'react';
import type { Edge as XYFlowEdge, Node as XYFlowNode, ReactFlowProps } from '@xyflow/react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Open object shape for serialized content whose fields are host-defined. */
type UnknownRecord = Record<string, unknown>;
/** Portable Text block with a typed discriminator and optional nested blocks. */
export type PortableBlock<T extends string = string> = T extends string
  ? { _type: T; _key?: string; children?: PortableBlock[]; [key: string]: unknown }
  : never;
/** Permissions the shared workspace exposes for a document or navigation node. */
export type DocsPermissionLevel = 'read' | 'write';
/** Visible workspace modes selected by the document toolbar. */
export type Mode = 'view' | 'edit' | 'attachments';
/** Intermediate editor transition states used while changing modes or loading local content. */
export type Transition = 'idle' | 'local' | 'p' | `to-${Mode}`;
/** Portable table cell that can retain rich blocks or its original Markdown/HTML source. */
export type DocTableCell = {
  _key?: string;
  _type?: 'cell';
  content?: DocBody;
  html?: string;
  markdown?: string;
};
/** Common serialized fields accepted by the Docs block renderers. */
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
/** Ordered block content stored for one Docs document or nested block. */
export type DocBody = DocBlock[];
/**
 * Checks that a value is an array of block-shaped objects before rendering stored content.
 *
 * @param value Candidate value from a host or serialized document.
 *
 * @return Whether every array entry has an object shape and a `_type` discriminator.
 */
export const isDocBody = (value: unknown): value is DocBody =>
  Array.isArray(value) && value.every((b) => b && typeof b === 'object' && '_type' in b);
/** Saved document revision with its content snapshot and display metadata. */
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
/** Markdown-backed document metadata accepted by the local and hosted workspaces. */
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
/** Result envelope returned by a host action, including a transport or operation error. */
export type ActionRes<T = unknown> = { data?: T; error?: unknown };
/** Unsaved editor draft paired with the original source and optional title metadata. */
export type Draft = {
  content?: string | DocBody | null;
  description?: string;
  path?: string;
  title?: string;
  source: string;
};
/** Serializable editor selection, including text offsets and optional browser range data. */
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
/** References to the active editor body, current selection, and toolbar controls. */
export type EditorRefs = {
  blob?: Blob | null;
  body?: HTMLElement | null;
  code?: string;
  dirty?: boolean;
  editor?: unknown;
  lastMd?: string;
  load?: { ignoreInitialChange: boolean; pendingContent: string };
  norm?: { force: boolean; replay: boolean; markdown?: string; structural?: boolean };
  previews?: Map<string, unknown>;
  reparse?: string;
  replacements?: Map<string, unknown>;
  route?: { path: string | undefined; pathname: string };
  saved?: string;
  selection?: EditorSel | null;
  toolbar?: ToolbarState | null;
  uploads?: Map<string, unknown>;
  version?: unknown;
  [key: string]: unknown;
};

/** State and callbacks exposed to Docs components while a document editor is mounted. */
export type EditorSurface = {
  attachFiles?: (files: File[]) => Promise<void>;
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
  refs: MutableRefObject<EditorRefs>;
  save: (code?: string) => void | Promise<void>;
  setMode: (mode: Mode) => Promise<void>;
  uploadImage?: (file: File) => Promise<string>;
};
/** State and callbacks consumed by the shared edit toolbar. */
export type ToolbarState = {
  applySearchText: (value: string) => void;
  busy: string | null;
  dirty: boolean;
  discard?: (() => void | Promise<void>) | undefined;
  insert: (md: string, rootEnd?: boolean, selection?: EditorSel | null) => void;
  optimistic?: boolean | undefined;
  path?: string | undefined;
  permission?: DocsPermissionLevel | undefined;
  prettier?: (() => void) | undefined;
  readSearchText: () => Promise<string>;
  save?: (() => void | Promise<void>) | undefined;
  setMode: (mode: Mode) => Promise<void>;
  toggleList?: ((kind: string) => void) | undefined;
};
/** Permissioned terminal node in the Docs navigation tree. */
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
/** Permissioned navigation group containing descendant leaves or branches. */
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
/** Navigation tree node accepted by the original Docs workspace. */
export type Tree = Leaf | Branch;
/** Attachment categories understood by the document export controls. */
export type AttchType =
  'image' | 'pdf' | 'youtube' | 'tsdocs' | 'website' | 'file' | 'doc' | 'document' | 'other';
/** Related document or asset entry shown alongside a leaf in the attachment view. */
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
/** One action or submenu entry in a Docs navigation context menu. */
export type DocsTreeMenuAction = {
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onSelect?: () => void;
  separator?: boolean;
  subActions?: DocsTreeMenuAction[];
};
/** Export format, content filters, and merge policy selected by the user. */
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
/** Active export selection; null means the export dialog has no target. */
export type ExportTgt = {
  paths: string[];
  rootDir: string;
  filename: string;
  title: string;
  nodeIds?: string[];
} | null;
/** Pending deletion target retained while the confirmation dialog is open. */
export type DelTgt = {
  kind: 'section' | 'branch' | 'leaf';
  path: string;
  bPath?: string;
  slugPath?: string;
  active?: boolean;
  title: string;
  origNode?: Tree;
} | null;
/** Controlled prompt dialog state and the callbacks that commit or cancel its value. */
export type PromptState = {
  open: boolean;
  title: string;
  description?: string | undefined;
  label: string;
  value: string;
  onSave: (val: string) => void;
  onCancel?: () => void;
} | null;
/** One command shown in a block type or insert menu. */
export type BlockOpt = {
  group: 'type' | 'insert';
  icon: ComponentType<SVGProps<SVGSVGElement>> | ReactNode;
  label: string;
  value: string;
  onSelect: () => void;
};
/** Custom block component entry with optional labels for the editor menu. */
export type RepoComponentWithLabel = {
  name: string;
  path?: string;
  label?: string;
  component?: ComponentType<UnknownRecord>;
  clipboardValue?: string;
  displayLabel?: string;
  [key: string]: unknown;
};
/** Nested menu index for custom components grouped by repository folder. */
export type MenuTree = { components: RepoComponentWithLabel[]; folders: Record<string, MenuTree> };
/** Current drag payload for either a leaf node or a branch node. */
export type DragState =
  | { active: boolean; path: string; kind: 'leaf' }
  | { fPath: string; kind: 'branch'; pPath: string };
/** Destination item and insertion position selected during a tree reorder. */
export type ReorderDropState = { key: string; position: 'after' | 'before' | 'inside' };
/** DOM element decorated with the action data for one rendered document block. */
export type BlockTgt = HTMLElement & { __blockActions?: UnknownRecord[] };
/** Parsed TypeScript documentation page passed to the graph and page renderers. */
export type TsDocsItem = { slug: string; title: string; body: DocBody };
/** Rendering and interaction metadata attached to a graph node. */
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
/** Supported node variants used by the Docs graph controls. */
export type FlowNodeType =
  'data' | 'decision' | 'erd' | 'group' | 'note' | 'origin' | 'process' | 'terminal' | 'terminator';
/** React Flow node shape used by the shared Docs diagram canvas. */
export type FlowNode = Omit<XYFlowNode<NodeData, FlowNodeType | undefined>, 'type'> & {
  type?: FlowNodeType;
};
/** React Flow edge shape with a serializable, host-defined data record. */
export type Edge = XYFlowEdge<Record<string, unknown>, string | undefined>;
/** Valid sides for graph node connection handles. */
export type Pos = 'top' | 'right' | 'bottom' | 'left';
/** Coordinates and dimensions calculated by the Dagre graph layout. */
export type DagreNode = { x?: number; y?: number; width?: number; height?: number };
/** Flow node shape accepted by layout helpers before React Flow normalization. */
export type FlowNodeLike = {
  id: string;
  position?: { x: number; y: number };
  type?: string;
  data?: NodeData;
  style?: CSSProperties;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
  parentId?: string;
  [key: string]: unknown;
};
/** Width and height produced by measuring a resizable graph group. */
export type FlowSize = { w: number; h: number };
/** Dimensions reported by React Flow after resizing a group or note node. */
export type FlowResizeParams = { x: number; y: number; width: number; height: number };
/** Diagram input options accepted by the Docs graph block renderer. */
export type NodesProps = Omit<
  ReactFlowProps<FlowNode, Edge>,
  'nodes' | 'edges' | 'onNodeClick' | 'onFocus' | 'onBlur'
> & {
  allowedTypes?: FlowNodeType[];
  arcControls?: boolean;
  clipboardKey?: string;
  direction?: 'TB' | 'LR';
  disabled?: boolean;
  editable?: boolean;
  edges?: Edge[];
  height?: number;
  interactive?: boolean;
  lockedTypes?: FlowNodeType[];
  nodes?: FlowNode[];
  nodeLabels?: Record<string, string>;
  nodeSep?: number;
  onAddContent?: (position: { x: number; y: number }) => void;
  onCommit?: (graph: { nodes: FlowNode[]; edges: Edge[] }) => void;
  onNodeClick?: (node: FlowNode) => void;
  onFocus?: FocusEventHandler<HTMLDivElement>;
  onBlur?: FocusEventHandler<HTMLDivElement>;
  tabIndex?: number;
  onReady?: () => void;
  onResizeEnd?: (id: string, size: FlowResizeParams) => void;
  proximityConnect?: boolean;
  rankSep?: number;
  readyWhenEmpty?: boolean;
  showBg?: boolean;
  showCtrls?: boolean;
};
/** Node metadata for a resizable or droppable diagram group. */
export type GroupNodeData = NodeData & {
  isDragTarget?: boolean;
  onResizeEnd?: (id: string, size: FlowResizeParams) => void;
};
/** Parsed power-source graph with source, terminal, and referenced-content nodes. */
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
/** Portable Text mark definition retained in a Docs rich-text block. */
export type DocsContentPtMarkDef = {
  _key?: string;
  _type?: string;
  href?: string;
  [key: string]: unknown;
};
/** Input descriptor used to build a Docs block configuration form. */
export type Field = {
  key: string;
  kind: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
  tooltip: string;
};
/** Host-provided toolbar state kept as an open adapter for legacy integrations. */
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
/** Portable Text block sequence accepted for a Docs document body. */
export type Content = PortableBlock[];
/** Problem document record used by the shared problem-content renderer. */
export type Problem = { _id?: string; title?: string; [key: string]: unknown };
/** Docs block content narrowed to the configured block schema names. */
export type DocsContent = {
  [T in keyof typeof DOCS_BLOCK_SCHEMAS]: DocBlock & { _type: T };
}[keyof typeof DOCS_BLOCK_SCHEMAS][];
/** Portable blocks nested inside another Docs component. */
export type DocsNestedContent = PortableBlock[];
/** Blocks supported by the shared problem-content renderer. */
export type ProblemContent = PortableBlock<(typeof PROBLEM_BLOCK_TYPES)[number]>[];
/** Arc graph assembled from positioned nodes and source/target connections. */
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

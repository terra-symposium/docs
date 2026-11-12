/**
 * src/components/terra/flow/Nodes.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import katex from 'katex';
import {
  applyEdgeChanges,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import {
  cn,
  createTrace,
  isRec,
  logErr,
  validateType,
  warn as logWarn,
} from '../../../lib/terra/runtime/runtime.js';
import { getGroupId, getNodeSize } from './_chrome.js';
import { toPng } from 'html-to-image';
import { useCallback, useEffect, useRef, useState } from 'react';

// COMPONENTS
import Dagre from '@dagrejs/dagre';
import React from 'react';
import {
  AlignHorizontalCenter as AlignHorizontalCenterIcon,
  AlignHorizontalLeft as AlignHorizontalLeftIcon,
  AlignHorizontalRight as AlignHorizontalRightIcon,
  AlignVerticalBottom as AlignVerticalBottomIcon,
  AlignVerticalCenter as AlignVerticalCenterIcon,
  AlignVerticalTop as AlignVerticalTopIcon,
  Choices as DecisionIcon,
  DataCategorical as TypeIcon,
  DataStructured as DataIcon,
  DistributeHorizontalCenter as DistributeHorizontalCenterIcon,
  DistributeHorizontalLeft as DistributeHorizontalLeftIcon,
  DistributeHorizontalRight as DistributeHorizontalRightIcon,
  DistributeVerticalBottom as DistributeVerticalBottomIcon,
  DistributeVerticalCenter as DistributeVerticalCenterIcon,
  DistributeVerticalTop as DistributeVerticalTopIcon,
  Document as NoteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  FitToScreen as FitToScreenIcon,
  MagicWand as WandIcon,
  Maximize as MaximizeIcon,
  ObjectStorage as GroupIcon,
  PlayOutline as OriginIcon,
  RadioButton as TerminatorIcon,
  Redo as RedoIcon,
  StopOutline as TerminalIcon,
  Table as ErdIcon,
  Task as ProcessIcon,
  TrashCan as TrashIcon,
  Undo as UndoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@carbon/icons-react';
import {
  Background,
  ControlButton,
  Controls,
  MarkerType,
  NodeResizer,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import {
  Button,
  ButtonGroup,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@terra-symposium/styling/ui';
import { ErrorBoundary } from '../ui.js';
import { Handles, SkeletonCard } from './_chrome.js';

// TYPES
import type {
  Connection,
  EdgeChange,
  EdgeMarkerType,
  Node as XyNode,
  NodeChange,
  NodeProps,
  XYPosition,
} from '@xyflow/react';
import type {
  Edge,
  FlowNode,
  GroupNodeData,
  NodeData,
  NodesProps,
  Pos,
} from '../../../lib/terra/runtime/types.js';
import type { FlowMenuContext } from './menuContext.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const HANDLES: Pos[] = ['top', 'right', 'bottom', 'left'];
const NODE_STYLES = {
  process: 'rounded border-2 border-primary-6 bg-primary-3 p-2 text-primary-12',
  terminator: 'rounded-full border-2 border-secondary-7 bg-secondary-3 px-4 py-2 text-secondary-11',
  decision:
    'rounded border-2 border-dashed border-yellow-700 bg-yellow-300 p-2 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-100',
  data: '-skew-x-12 border-2 border-gray-7 bg-gray-3 p-2 text-gray-11',
  origin:
    'rounded-full border-2 border-green-300 bg-green-100 px-4 py-2 font-bold text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100',
  terminal:
    'rounded-full border-2 border-red-300 bg-red-100 px-4 py-2 font-bold text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100',
} as const;
const NODE_CLASS = {
  attribute: 'break-words text-right opacity-70',
  selected: 'ring-2 ring-red-500 ring-offset-2 ring-offset-transparent',
} as const;

// prettier-ignore
const NODE_CFG: Record<keyof typeof NODE_TYPES, ({
    label: string;
    Icon: import('react').ComponentType<{
        className?: string;
    }>;
    colorCls: string;
})> = {
	data: { label: 'Data', Icon: DataIcon, colorCls: 'text-gray-11' },
	decision: { label: 'Decision', Icon: DecisionIcon, colorCls: 'text-yellow-600' },
	erd: { label: 'ERD', Icon: ErdIcon, colorCls: 'text-primary-11' },
	group: { label: 'Container', Icon: GroupIcon, colorCls: 'text-primary-11' },
	note: { label: 'Sticky note', Icon: NoteIcon, colorCls: 'text-gray-11' },
	origin: { label: 'Origin', Icon: OriginIcon, colorCls: 'text-green-600' },
	process: { label: 'Process', Icon: ProcessIcon, colorCls: 'text-primary-11' },
	terminal: { label: 'Terminal', Icon: TerminalIcon, colorCls: 'text-red-600' },
	terminator: { label: 'Terminator', Icon: TerminatorIcon, colorCls: 'text-secondary-11' },
};
const trace = createTrace('AUTHORING:Nodes', true);

// prettier-ignore
const NODE_MENUS = {
	align: [
	{ label: 'Align horizontal left', Icon: AlignHorizontalLeftIcon, val: 'left' as const },
	{ label: 'Align horizontal center', Icon: AlignHorizontalCenterIcon, val: 'center' as const },
	{ label: 'Align horizontal right', Icon: AlignHorizontalRightIcon, val: 'right' as const },
	{ label: 'sep', val: 'sep1' as const },
	{ label: 'Align vertical top', Icon: AlignVerticalTopIcon, val: 'top' as const },
	{ label: 'Align vertical center', Icon: AlignVerticalCenterIcon, val: 'middle' as const },
	{ label: 'Align vertical bottom', Icon: AlignVerticalBottomIcon, val: 'bottom' as const },
],

	// prettier-ignore
	distribute: [
	{ label: 'Distribute horizontal left', Icon: DistributeHorizontalLeftIcon, val: 'horizontal-left' },
	{ label: 'Distribute horizontal center', Icon: DistributeHorizontalCenterIcon, val: 'horizontal-center' },
	{ label: 'Distribute horizontal right', Icon: DistributeHorizontalRightIcon, val: 'horizontal-right' },
	{ label: 'sep', val: 'sep2' },
	{ label: 'Distribute vertical top', Icon: DistributeVerticalTopIcon, val: 'vertical-top' },
	{ label: 'Distribute vertical center', Icon: DistributeVerticalCenterIcon, val: 'vertical-center' },
	{ label: 'Distribute vertical bottom', Icon: DistributeVerticalBottomIcon, val: 'vertical-bottom' },
],

	// prettier-ignore
	edges: [
	{ label: 'Solid Line', val: 'solid' as const },
	{ label: 'Dashed Line', val: 'dashed' as const, dash: '4 2' },
	{ label: 'Dotted Line', val: 'dotted' as const, dash: '1 3', cap: 'round' as const },
],
};
const MENU_CLASS = {
  content: 'min-w-40 !border-primary-6 p-1',
  icon: 'mr-2',
  subContent: 'min-w-64 !border-primary-6 p-1',
} as const;

/** Node and edge snapshots exchanged between the flow editor and graph block. */
type FlowGraph = { nodes: FlowNode[]; edges: Edge[] };
/** Optional host extensions for validating, creating, or laying out graph data. */
type FlowEditorAdapter = {
  clipboardKey?: string;
  cloneNode?: (node: FlowNode, id: string) => FlowNode;
  createEdge?: (connection: Connection, graph: FlowGraph) => Edge | null | undefined;
  editableNode?: (node: FlowNode) => boolean;
  layout?: (graph: FlowGraph) => FlowGraph;
  read: FlowGraph;
  validConnection?: (connection: Connection, graph: FlowGraph) => boolean;
  write: (graph: FlowGraph) => void;
};

/*//////////////////////////////////////////////////
NODE TYPES
//////////////////////////////////////////////////*/

/**
 * Creates a higher-order flowchart node renderer with specified styling.
 *
 * @param className - CSS classes applied to the shell container.
 * @param inner - CSS classes applied to the text wrapper.
 *
 * @return Flowchart node component.
 */
function createNode(
  className: string,
  inner?: string,
): (props: NodeProps<XyNode<NodeData>>) => React.JSX.Element {
  /**
   * Renders a flow node as a link, action button, or inert container from its data.
   *
   * @param nodeProps React Flow node fields used to choose the element, label its content, and show selection.
   * @returns The styled node shell with its title and configured connection handles.
   */
  const NodeCard = (nodeProps: NodeProps<XyNode<NodeData>>): React.JSX.Element => {
    const { data, selected } = nodeProps;
    const Element = data.onClick ? 'button' : data.href ? 'a' : 'div';
    return (
      <Element
        {...(Element === 'button' ? { type: 'button' } : {})}
        {...(Element === 'a' ? { href: data.href } : {})}
        {...(Element === 'a' ? { 'data-docs-flow-node-link': '' } : {})}
        onClick={data.onClick}
        className={cn(
          'relative block min-w-40 text-pretty p-2 text-center text-sm font-normal !no-underline shadow-md transition-shadow',
          selected && 'ring-2 ring-red-500 ring-offset-2 ring-offset-transparent',
          className,
        )}
      >
        <Handles
          editable={data.editable === true}
          sources={data.requiredHandles?.sources ?? []}
          tgts={data.requiredHandles?.tgts ?? []}
        />
        <span className={inner}>{data.title}</span>
      </Element>
    );
  };
  return NodeCard;
}
export const NODE_TYPES = {
  erd:
    /**
     * Renders an entity-relationship node with typed attributes, math typesetting, and handles.
     *
     * @param d Entity name, fields, compact-view preference, and optional navigation action.
     * @param s Whether React Flow currently marks this node as selected.
     * @returns The entity card, including math-rendered attribute types when authored.
     */
    function ErdNode({ data: d, selected: s }: NodeProps<XyNode<NodeData>>): React.JSX.Element {
      const compact = d.compact === true;
      const Element = d.onClick ? 'button' : d.href ? 'a' : 'div';
      return (
        <Element
          type={Element === 'button' ? 'button' : undefined}
          href={Element === 'a' ? d.href : undefined}
          data-docs-flow-node-link={Element === 'a' ? '' : undefined}
          onClick={d.onClick}
          className={cn(
            'block max-h-96 w-full overflow-y-scroll rounded-md border-2 border-primary-6 bg-primary-2 text-primary-12 !no-underline shadow-lg transition-shadow',
            compact ? 'text-xs' : 'text-sm',
            s && NODE_CLASS.selected,
          )}
        >
          <div
            className={cn(
              'border-b-2 border-primary-6 bg-primary-3 text-center font-bold text-primary-12',
              compact ? 'px-2 py-0.5 text-sm' : 'px-3 py-2 text-lg',
            )}
          >
            {d.title}
          </div>
          {d.attributes && d.attributes.length > 0 && (
            <ul className={cn('my-0', compact ? 'gap-y-0.5 p-0.5 px-1.5' : 'p-2')}>
              {d.attributes.map((a) => (
                <li
                  key={a.name}
                  className={cn(
                    'grid grid-cols-[auto,1fr] font-mono',
                    compact ? 'my-0 gap-x-2 leading-tight' : 'gap-x-3 gap-y-0',
                  )}
                >
                  <span className="shrink-0">{a.name}</span>
                  {(() => {
                    const attrType = a.type ?? '';
                    const inlineMath = attrType.match(/^\$(?!\$)([\s\S]+)\$$/);
                    const displayMath = attrType.match(/^\$\$([\s\S]+)\$\$$/);
                    if (!inlineMath && !displayMath)
                      return <span className={NODE_CLASS.attribute}>{a.type}</span>;
                    return (
                      <span
                        className={`${NODE_CLASS.attribute} [&_.katex-display]:m-0 [&_.katex]:text-inherit`}
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(
                            (displayMath?.[1] ?? inlineMath?.[1] ?? '').trim(),
                            {
                              displayMode: Boolean(displayMath),
                              throwOnError: false,
                              strict: 'ignore',
                            },
                          ),
                        }}
                      />
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
          <Handles
            editable={d.editable === true}
            sources={d.requiredHandles?.sources ?? []}
            tgts={d.requiredHandles?.tgts ?? []}
          />
        </Element>
      );
    },
  process: createNode(NODE_STYLES.process),
  terminator: createNode(NODE_STYLES.terminator),
  origin: createNode(NODE_STYLES.origin),
  terminal: createNode(NODE_STYLES.terminal),
  decision: createNode(NODE_STYLES.decision),
  data: createNode(NODE_STYLES.data, 'block skew-x-12'),
  note:
    /**
     * Renders a resizable sticky note and forwards its final size to the graph owner.
     *
     * @param i Unique React Flow node id used to scope the note's clipped paper shape.
     * @param v Note title, editability, handles, and optional resize callback.
     * @param s Whether the canvas selects the note and should expose its resize affordance.
     * @returns The note surface, resize control, and connection handles.
     */
    function NoteNode({
      id: i,
      data: v,
      selected: s,
    }: NodeProps<XyNode<GroupNodeData>>): React.JSX.Element {
      return (
        <ErrorBoundary name="NoteNode">
          <NodeResizer
            color="#ef4444"
            isVisible={s && v.editable === true}
            minWidth={128}
            minHeight={128}
            onResizeEnd={(_e, p): void => {
              if (v.id) v.onResizeEnd?.(v.id, p);
            }}
          />
          <div
            className={cn(
              "relative size-full min-h-32 min-w-32 before:absolute before:left-[5px] before:top-[30%] before:h-3/4 before:w-[90%] before:bg-black/25 before:shadow-[rgba(0,0,0,0.5)_-2px_2px_15px] before:content-['']",
              s && NODE_CLASS.selected,
            )}
          >
            <Handles
              editable={v.editable === true}
              sources={v.requiredHandles?.sources ?? []}
              tgts={v.requiredHandles?.tgts ?? []}
            />
            <svg width="0" height="0" className="absolute">
              <defs>
                <clipPath id={`sticky-${i}`} clipPathUnits="objectBoundingBox">
                  <path d="M 1 0 Q 1 0.69, 0.97 0.96 0.97 0.96, 0 0.96 Q 0.04 0.69, 0.04 0 0.04 0, 1 0" />
                </clipPath>
              </defs>
            </svg>
            <div
              className="relative flex size-full min-h-32 min-w-32 items-center justify-center bg-yellow-300 p-5 pt-3 text-center text-sm font-normal text-yellow-950 shadow-md"
              style={{ clipPath: `url(#sticky-${i})` }}
            >
              {v.title}
            </div>
          </div>
        </ErrorBoundary>
      );
    },
  group:
    /**
     * Renders a resizable group container with its title and connector handles.
     *
     * @param d Group title, drag-target state, editability, and resize callback.
     * @param s Whether the canvas selects the group and may show its resize affordance.
     * @returns The group container and its connection handles.
     */
    function GroupNode({
      data: d,
      selected: s,
    }: NodeProps<XyNode<GroupNodeData>>): React.JSX.Element {
      return (
        <ErrorBoundary name="GroupNode">
          <NodeResizer
            color="#ef4444"
            isVisible={s && d.editable === true}
            minWidth={160}
            minHeight={100}
            onResizeEnd={(_e, p): void => {
              if (d.id) d.onResizeEnd?.(d.id, p);
            }}
          />
          <div
            className={cn(
              'size-full text-primary-11 transition-all',
              s && `rounded-lg ${NODE_CLASS.selected}`,
              d.isDragTarget && 'ring-dashed rounded-lg bg-primary-3/20 ring-2 ring-primary-6',
            )}
          >
            <div className="border-b border-primary-6 pb-2 text-lg font-bold text-primary-12">
              {d.title}
            </div>
            <Handles editable={d.editable === true} {...d.requiredHandles} />
          </div>
        </ErrorBoundary>
      );
    },
};

/*//////////////////////////////////////////////////
CANVAS
//////////////////////////////////////////////////*/

/**
 * Synchronises _node and edge state with layout and handle metadata.
 *
 * @param v - Flow nodes to sync.
 * @param r - Flow edges to sync.
 * @param d - Whether nodes rank top-to-bottom (`TB`) or left-to-right (`LR`).
 * @param p - Connection rule that lets nearby graph nodes link automatically in sync graph.
 * @param c - Editability flag controlling whether sync graph accepts changes.
 * @param a - Arc controls input supplied to sync graph's operation.
 * @param o - Callback fired after a group node resize is committed.
 *
 * @return Node and edge arrays after layout, handle assignment, and grouping metadata are applied.
 *
 * @remarks
 * This centralises the derived handle logic so the component tree stays thin.
 */
function syncGraph(
  v: FlowNode[],
  r: Edge[],
  d: 'TB' | 'LR',
  p: boolean,
  c: boolean,
  a: boolean,
  o?: (id: string, params: { x: number; y: number; width: number; height: number }) => void,
): { nodes: FlowNode[]; edges: Edge[] } {
  const sNodes = Array.isArray(v) ? v : [];
  const nodesById = new Map(sNodes.map((_node) => [_node.id, _node]));
  const handlesByNodeId = new Map<string, { sources: Set<Pos>; tgts: Set<Pos> }>();
  const syncedGraph = {
    edges: (Array.isArray(r) ? r : [])
      .filter((_e) => nodesById.has(_e.source) && nodesById.has(_e.target))
      .map((e) => {
        const edgeData: Record<string, unknown> & {
          color?: string;
          label?: string;
          srcHandleOverride?: string;
          tgtHandleOverride?: string;
        } = e.data ?? {};
        const l = isRec(e) ? (e as Record<string, unknown>) : {};
        const arrowHead = edgeData.arrowHead ?? (l['arrowHead'] as boolean) ?? false;
        const srcOverride = edgeData.srcHandleOverride ?? (l['srcHandleOverride'] as Pos);
        const tgtOverride = edgeData.tgtHandleOverride ?? (l['tgtHandleOverride'] as Pos);
        const strokeStyle = edgeData.strokeStyle ?? 'solid';
        const markerEnd: EdgeMarkerType | undefined = arrowHead
          ? { type: MarkerType.ArrowClosed, width: 20, height: 20 }
          : undefined;
        let srcHandle: string;
        let tgtHandle: string;
        if (a) {
          // Arc nodes use named ports, not the positional ports used by docs flowcharts.
          srcHandle =
            e.sourceHandle && !HANDLES.includes(e.sourceHandle as Pos) ? e.sourceHandle : 'default';
          tgtHandle = 'inbound';
        } else if (p) {
          const dx =
            (nodesById.get(e.target)!.position?.x ?? 0) -
            (nodesById.get(e.source)!.position?.x ?? 0);
          const dy =
            (nodesById.get(e.target)!.position?.y ?? 0) -
            (nodesById.get(e.source)!.position?.y ?? 0);
          const horizontal = Math.abs(dx) > Math.abs(dy);
          srcHandle = horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top';
          tgtHandle = horizontal ? (dx > 0 ? 'left' : 'right') : dy > 0 ? 'top' : 'bottom';
        } else if (!p && d === 'TB') {
          srcHandle = srcOverride ?? 'bottom';
          tgtHandle = tgtOverride ?? 'top';
        } else {
          srcHandle = srcOverride ?? (d === 'LR' ? 'right' : 'bottom');
          tgtHandle = tgtOverride ?? (d === 'LR' ? 'left' : 'top');
        }
        if (!a) {
          if (!handlesByNodeId.has(e.source))
            handlesByNodeId.set(e.source, {
              sources: new Set(),
              tgts: new Set(),
            });
          if (!handlesByNodeId.has(e.target))
            handlesByNodeId.set(e.target, {
              sources: new Set(),
              tgts: new Set(),
            });
          handlesByNodeId.get(e.source)!.sources.add(srcHandle as Pos);
          handlesByNodeId.get(e.target)!.tgts.add(tgtHandle as Pos);
        }
        const updatedEdge: Edge = {
          ...e,
          data: {
            ...edgeData,
            arrowHead,
            srcHandleOverride: srcOverride,
            tgtHandleOverride: tgtOverride,
            strokeStyle,
          },
          sourceHandle: srcHandle,
          targetHandle: tgtHandle,
          style: {
            ...e.style,
            strokeDasharray:
              strokeStyle === 'dashed' ? '5 5' : strokeStyle === 'dotted' ? '2 2' : undefined,
          },
        };
        if (markerEnd) updatedEdge.markerEnd = markerEnd;
        return updatedEdge;
      }),
    nodes: sNodes.map((n) => {
      const handles = handlesByNodeId.get(n.id);
      const resGroupId = getGroupId(n);
      const flatNode = { ...n };
      delete flatNode.parentId;
      return {
        ...flatNode,
        className: cn(
          validateType(['string'], n.className) || Array.isArray(n.className)
            ? n.className
            : undefined,
          n.type === 'group' &&
            'rounded-lg border !border-primary-6 !bg-primary-2 !text-primary-12',
        ),
        zIndex: n.type === 'group' ? -10 : 10,
        nodeOrigin: n.type === 'group' ? ([0, 0] as const) : ([0.5, 0.5] as const),
        data: {
          ...(n.data && validateType(['object'], n.data) ? n.data : { title: '', attributes: [] }),
          id: n.id,
          editable: c,
          ...(resGroupId ? { groupId: resGroupId } : {}),
          ...(o ? { onResizeEnd: o } : {}),
          requiredHandles: {
            sources: c ? HANDLES : Array.from(handles?.sources ?? []),
            targets: c ? HANDLES : Array.from(handles?.tgts ?? []),
          },
        },
      };
    }),
  };
  return {
    nodes: [
      ...syncedGraph.nodes.filter((n) => n.type === 'group'),
      ...syncedGraph.nodes.filter((n) => n.type !== 'group'),
    ],
    edges: syncedGraph.edges,
  };
}
const FLOW_COMPONENTS = {
  nodeTypes: NODE_TYPES,
  /**
   * Renders the interactive flow canvas and context menus for n editing, grouping, and layout.
   *
   * @param flow - Flow graph data rendered into canvas's canvas.
   * @param nodeTypes - Node renderer map that draws graph nodes in canvas.
   * @param edgeTypes - Edge renderer map that draws graph connections in canvas.
   * @param nodeLabels - Node label map shown alongside canvas's graph nodes.
   * @param onNodeClick - Callback invoked when a user selects a node in canvas.
   * @param onNodesChange - Callback invoked with the updated node changes from canvas.
   * @param onEdgesChange - Callback invoked with the updated edge changes from canvas.
   * @param onConnect - Callback invoked with a new connection created in canvas.
   * @param onEdgeDoubleClick - Callback invoked for edge double click.
   * @param onAddNode - Callback invoked for add node.
   * @param onAddContent - Callback invoked for add content.
   * @param lockedTypes - Node types that canvas must keep read-only.
   * @param allowedTypes - Node types that canvas permits users to create.
   * @param onGroupNodes - Callback invoked for group nodes.
   * @param onUngroupNodes - Callback invoked for ungroup nodes.
   * @param onDeleteSelected - Callback invoked for delete selected.
   * @param onAlignNodes - Callback invoked for align nodes.
   * @param onDistributeNodes - Callback invoked for distribute nodes.
   * @param onRenameNode - Callback invoked for rename node.
   * @param onChangeNodeType - Callback invoked for change node type.
   * @param onChangeEdgeStyle - Callback invoked for change edge style.
   * @param onDeleteEdge - Callback invoked for delete edge.
   * @param onAutoLayout - Callback invoked for auto layout.
   * @param onReady - Callback invoked when canvas finishes initialising its graph surface.
   * @param interactive - Interaction flag that controls whether canvas accepts graph input.
   * @param editable - Editability flag controlling whether canvas accepts changes.
   * @param isFocused - Boolean flag controlling canvas's is focused behaviour.
   * @param height - Viewport height reserved for canvas's graph surface.
   * @param showBg - Visibility flag for canvas's graph background.
   * @param showCtrls - Visibility flag for canvas's graph controls.
   * @param arcControls - Arc controls input supplied to canvas's operation.
   * @param readyWhenEmpty - Readiness rule that lets canvas finish with no graph nodes.
   *
   * @return Interactive React Flow canvas and its context-menu actions.
   *
   * @remarks
   * This component stays intentionally thin and delegates all graph mutation logic to the helper
   * functions above.
   */
  Canvas({
    flow,
    nodeTypes,
    edgeTypes,
    nodeLabels,
    onNodeClick,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgeDoubleClick,
    onAddNode,
    onAddContent,
    lockedTypes,
    allowedTypes,
    onGroupNodes,
    onUngroupNodes,
    onDeleteSelected,
    onAlignNodes,
    onDistributeNodes,
    onRenameNode,
    onChangeNodeType,
    onChangeEdgeStyle,
    onDeleteEdge,
    onAutoLayout,
    onReady,
    interactive,
    editable,
    isFocused,
    height,
    showBg,
    showCtrls,
    arcControls,
    readyWhenEmpty,
  }: {
    flow: { nodes: FlowNode[]; edges: Edge[] };
    nodeTypes: Record<string, React.ComponentType<NodeProps<FlowNode>>>;
    edgeTypes?: NodesProps['edgeTypes'];
    nodeLabels: Partial<Record<keyof typeof NODE_TYPES, string>>;
    onNodeClick?: ((n: FlowNode) => void) | undefined;
    onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
    onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
    onConnect: (params: Connection) => void;
    onEdgeDoubleClick: (_e: React.MouseEvent, e: Edge) => void;
    onAddNode: (type: keyof typeof NODE_TYPES, position: XYPosition) => void;
    onAddContent?: (position: XYPosition) => void;
    lockedTypes: (keyof typeof NODE_TYPES)[];
    allowedTypes: (keyof typeof NODE_TYPES)[];
    onGroupNodes: (groupNode: FlowNode, selectedNodes: FlowNode[], x: number, y: number) => void;
    onUngroupNodes: (nodes: FlowNode[]) => void;
    onDeleteSelected: (nodes: FlowNode[]) => void;
    onAlignNodes: (
      nodes: FlowNode[],
      alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
    ) => void;
    onDistributeNodes: (nodes: FlowNode[], type: string) => void;
    onRenameNode: (id: string) => void;
    onChangeNodeType: (id: string, type: keyof typeof NODE_TYPES) => void;
    onChangeEdgeStyle: (id: string, style: 'solid' | 'dashed' | 'dotted') => void;
    onDeleteEdge: (id: string) => void;
    onAutoLayout: () => void;
    onReady?: () => void;
    interactive: boolean;
    editable: boolean;
    isFocused: boolean;
    height: number;
    showBg: boolean;
    showCtrls: boolean;
    arcControls: boolean;
    readyWhenEmpty: boolean;
  }): React.JSX.Element {
    // STATES
    const {
      fitView,
      getViewport,
      screenToFlowPosition: screenToFlowPos,
      getIntersectingNodes,
      setViewport,
      updateNodeData,
      getNodes,
      zoomIn,
      zoomOut,
    } = useReactFlow();
    const nodesInit = useNodesInitialized();
    const hasInitialLayout = useRef(false);
    const lastFit = useRef('');
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const dragTgtGroup = useRef<string | null>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(readyWhenEmpty && flow.nodes.length === 0);
    const [isExporting, setIsExporting] = useState(false);
    const notified = useRef(false);
    const [menuCtx, setMenuCtx] = useState<FlowMenuContext>({
      type: 'pane',
      id: null,
    });

    // INIT
    useEffect(() => {
      if (!flow.nodes.length) {
        if (readyWhenEmpty) setReady(true);
        return;
      }
      if (!nodesInit) return;
      const key = `${height}:${flow.nodes.map((_node) => _node.id).join(',')}`;
      if (lastFit.current === key) return;
      const frame = { id: 0 };
      frame.id = requestAnimationFrame(() => {
        lastFit.current = key;
        void fitView({ padding: 0.1 });
        if (!hasInitialLayout.current) {
          hasInitialLayout.current = true;
          setReady(true);
        }
      });
      return () => {
        cancelAnimationFrame(frame.id);
      };
    }, [height, fitView, flow.nodes, nodesInit]);
    useEffect(() => {
      reactFlowWrapper.current?.querySelector('.react-flow.light')?.classList.remove('light');
    }, []);
    useEffect(() => {
      if (!ready || notified.current) return;
      notified.current = true;
      onReady?.();
    }, [onReady, ready]);

    // HELPERS
    const selNodes = flow.nodes.filter((n) => n.selected);
    const nodesMap = React.useMemo(() => new Map(flow.nodes.map((n) => [n.id, n])), [flow.nodes]);
    const tgtNode = React.useMemo(
      () => (menuCtx.type === '_node' && menuCtx.id ? nodesMap.get(menuCtx.id) : undefined),
      [nodesMap, menuCtx.type, menuCtx.id],
    );

    /**
     * Checks whether the n is locked.
     *
     * @param n - Value passed to the helper.
     *
     * @return True when the n is missing or its type is blocked from editing.
     */
    const locked = (n: FlowNode | undefined): boolean => {
      if (!n) {
        logWarn('AuthNodes', 'menu.n-missing', {
          menuCtx,
          nodeCount: flow.nodes.length,
        });
        return true;
      }
      return lockedTypes.includes(n.type as keyof typeof NODE_TYPES);
    };
    const isTgtLocked = React.useMemo(() => {
      if (menuCtx.type !== '_node' || menuCtx.id === null) return false;
      if (!tgtNode) {
        logWarn('AuthNodes', 'menu.n-missing', {
          menuCtx,
          nodeCount: flow.nodes.length,
        });
        return true;
      }
      return locked(tgtNode);
    }, [flow.nodes.length, lockedTypes, menuCtx, tgtNode]);
    const exportAction = {
      disabled: isExporting || !ready,
      run: useCallback(async (): Promise<void> => {
        const wrapper = reactFlowWrapper.current;
        if (!wrapper || isExporting || !ready) return;
        const restore: {
          viewport: ReturnType<typeof getViewport>;
          handleVisibility: string[];
        } = { viewport: getViewport(), handleVisibility: [] };
        const handles = wrapper.querySelectorAll<HTMLElement>('.flow-node-handle');
        restore.handleVisibility = Array.from(handles, (handle) => handle.style.visibility);
        setIsExporting(true);
        try {
          await fitView({ padding: 0.15, duration: 0 });
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          handles.forEach((handle) => {
            handle.style.visibility = 'hidden';
          });
          ((dataUrl: string) => {
            const link = document.createElement('a');
            link.download = 'diagram.png';
            link.href = dataUrl;
            link.click();
          })(
            await toPng(wrapper, {
              cacheBust: true,
              pixelRatio: 2,
              backgroundColor: '#fff',
              style: { backgroundColor: '#fff', color: '#111827' },
              filter: (node) =>
                ![
                  'react-flow__controls',
                  'react-flow__background',
                  'react-flow__attribution',
                  'react-flow__handle',
                ].some((className) => node.classList?.contains(className)),
            }),
          );
        } catch (err) {
          logErr('Nodes', 'export.failed', err);
        } finally {
          handles.forEach((handle, i) => {
            handle.style.visibility = restore.handleVisibility[i] ?? '';
          });
          await setViewport(restore.viewport, { duration: 0 }).catch((error) => {
            logErr('Nodes', 'export.viewport-restore.failed', error);
          });
          setIsExporting(false);
        }
      }, [fitView, getViewport, isExporting, ready, setViewport]),
    };

    // RENDER
    return (
      <ContextMenu
        onOpenChange={(o) => {
          trace('menu.state', { open: o, context: menuCtx });
        }}
      >
        <ContextMenuTrigger
          asChild
          onContextMenu={(_e) => {
            lastPos.current = { x: _e.clientX, y: _e.clientY };
            trace('menu.open.request', { position: lastPos.current });
          }}
        >
          <div className="relative z-20 size-full" ref={reactFlowWrapper}>
            {!ready && (
              <div
                className="pointer-events-none absolute inset-0 z-10 rounded-md border border-primary-6 bg-primary-1/95"
                aria-label="Loading nodes"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-8">
                    <SkeletonCard />
                    <SkeletonCard className="translate-x-16 animate-pulse opacity-75" />
                    <SkeletonCard className="-translate-x-12 animate-pulse opacity-50" />
                  </div>
                </div>
              </div>
            )}
            <ReactFlow<FlowNode, Edge>
              nodes={flow.nodes}
              edges={flow.edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeDoubleClick={onEdgeDoubleClick}
              onNodeContextMenu={(_e, _node) => {
                trace('menu.n', { id: _node.id, type: _node.type });
                setMenuCtx({ type: '_node', id: _node.id });
              }}
              {...(onNodeClick
                ? {
                    onNodeClick: (_e, n) => {
                      onNodeClick(n);
                    },
                  }
                : {})}
              onEdgeContextMenu={(_e, v) => {
                trace('menu.e', { id: v.id });
                setMenuCtx({ type: 'e', id: v.id });
              }}
              onPaneContextMenu={() => {
                trace('menu.pane', {
                  nodeCount: flow.nodes.length,
                  edgeCount: flow.edges.length,
                });
                setMenuCtx({ type: 'pane', id: null });
              }}
              onNodeDrag={(_e, _node, d) => {
                if (!editable) return;
                const primaryNode = d[0] || _node;
                if (primaryNode.type === 'group') return;
                const groupId =
                  getIntersectingNodes(primaryNode).find((n) => n.type === 'group')?.id ?? null;
                if (groupId !== dragTgtGroup.current) {
                  if (dragTgtGroup.current)
                    updateNodeData(dragTgtGroup.current, {
                      isDragTarget: false,
                    });
                  if (groupId) updateNodeData(groupId, { isDragTarget: true });
                  dragTgtGroup.current = groupId;
                }
              }}
              onNodeDragStop={(_e, _node, d) => {
                if (!editable) return;
                if (dragTgtGroup.current) {
                  const tgtGroupId = dragTgtGroup.current;
                  updateNodeData(tgtGroupId, { isDragTarget: false });
                  dragTgtGroup.current = null;
                  const groupNode = getNodes().find((n) => n.id === tgtGroupId);
                  const nodesToGroup = d.filter((n) => n.type !== 'group' && n.id !== tgtGroupId);
                  if (groupNode && nodesToGroup.length > 0)
                    onGroupNodes(
                      groupNode as FlowNode,
                      nodesToGroup,
                      groupNode.position.x,
                      groupNode.position.y,
                    );
                } else {
                  const nodesToUngroup = d.filter((n) => getGroupId(n) && n.type !== 'group');
                  if (nodesToUngroup.length > 0) onUngroupNodes(nodesToUngroup);
                }
              }}
              nodeTypes={nodeTypes}
              {...(edgeTypes ? { edgeTypes: edgeTypes as never } : {})}
              fitView
              minZoom={0.1}
              zoomOnScroll={false}
              panOnScroll={isFocused}
              zoomOnPinch={true}
              preventScrolling={false}
              nodesDraggable={interactive || editable}
              nodesConnectable={editable}
              elementsSelectable={true}
              panOnDrag={false}
              selectionOnDrag={true}
              elevateNodesOnSelect={false}
            >
              {showBg && <Background />}
              {showCtrls && arcControls ? (
                <>
                  <Controls
                    position="top-left"
                    showFitView={false}
                    showInteractive={false}
                    showZoom={false}
                  >
                    <ButtonGroup>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled
                        aria-label="Undo"
                        title="Undo"
                      >
                        <UndoIcon aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled
                        aria-label="Redo"
                        title="Redo"
                      >
                        <RedoIcon aria-hidden="true" />
                      </Button>
                    </ButtonGroup>
                  </Controls>
                  <Controls
                    position="top-right"
                    showFitView={false}
                    showInteractive={false}
                    showZoom={false}
                  >
                    <ButtonGroup>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Arrange nodes"
                        title="Arrange nodes"
                        onClick={onAutoLayout}
                      >
                        <WandIcon aria-hidden="true" />
                      </Button>
                    </ButtonGroup>
                  </Controls>
                  <ErrorBoundary name="ZoomControls">
                    <Controls
                      position="bottom-right"
                      showZoom={false}
                      showFitView={false}
                      showInteractive={false}
                    >
                      <ButtonGroup>
                        {(
                          [
                            {
                              label: 'Zoom in',
                              icon: <ZoomInIcon aria-hidden="true" />,
                              onClick: zoomIn,
                            },
                            {
                              label: 'Zoom out',
                              icon: <ZoomOutIcon aria-hidden="true" />,
                              onClick: zoomOut,
                            },
                            {
                              label: 'Fit view',
                              icon: <FitToScreenIcon aria-hidden="true" />,
                              onClick: fitView,
                            },
                          ] as const
                        ).map(({ label: l, icon: i, onClick: o }) => (
                          <Button
                            key={l}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={l}
                            title={l}
                            onClick={() => void o()}
                          >
                            {i}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </Controls>
                  </ErrorBoundary>
                </>
              ) : (
                showCtrls && (
                  <Controls
                    position="bottom-left"
                    showInteractive={false}
                    className="!m-3 [&_*]:!border-primary-6 [&_*]:!bg-primary-3"
                  >
                    {editable && (
                      <ControlButton
                        aria-label="Auto-layout nodes"
                        title="Auto-layout nodes"
                        onClick={onAutoLayout}
                      >
                        <WandIcon aria-hidden="true" />
                      </ControlButton>
                    )}
                    <ControlButton
                      aria-label="Full screen"
                      title="Full screen"
                      onClick={() =>
                        document.fullscreenElement
                          ? void document.exitFullscreen()
                          : void reactFlowWrapper.current?.requestFullscreen()
                      }
                    >
                      <MaximizeIcon aria-hidden="true" />
                    </ControlButton>
                    {!editable && (
                      <ControlButton
                        aria-label="Export diagram as PNG"
                        title="Export diagram as PNG"
                        disabled={exportAction.disabled}
                        onClick={() => void exportAction.run()}
                      >
                        <DownloadIcon aria-hidden="true" />
                      </ControlButton>
                    )}
                  </Controls>
                )
              )}
            </ReactFlow>
          </div>
        </ContextMenuTrigger>
        {editable && (
          <ContextMenuContent className={MENU_CLASS.content}>
            {selNodes.length > 1 ? (
              <>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Align</ContextMenuSubTrigger>
                  <ContextMenuSubContent className={MENU_CLASS.subContent}>
                    {NODE_MENUS.align.map((m) =>
                      m.label === 'sep' ? (
                        <ContextMenuSeparator key={m.val} />
                      ) : (
                        <ContextMenuItem
                          key={m.val}
                          onClick={() => {
                            onAlignNodes(
                              selNodes,
                              m.val as 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
                            );
                          }}
                        >
                          {m.Icon && <m.Icon className={MENU_CLASS.icon} />} {m.label}
                        </ContextMenuItem>
                      ),
                    )}
                  </ContextMenuSubContent>
                </ContextMenuSub>
                {selNodes.length > 2 && (
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>Distribute</ContextMenuSubTrigger>
                    <ContextMenuSubContent className={MENU_CLASS.subContent}>
                      {NODE_MENUS.distribute.map((m) =>
                        m.label === 'sep' ? (
                          <ContextMenuSeparator key={m.val} />
                        ) : (
                          <ContextMenuItem
                            key={m.val}
                            onClick={() => {
                              onDistributeNodes(selNodes, m.val);
                            }}
                          >
                            {m.Icon && <m.Icon className={MENU_CLASS.icon} />} {m.label}
                          </ContextMenuItem>
                        ),
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="cursor-pointer focus:!bg-primary-3 focus:!text-primary-12"
                  onClick={() => {
                    const minX = Math.min(
                      ...selNodes.map((n) => n.position.x - getNodeSize(n).w / 2),
                    );
                    const minY = Math.min(
                      ...selNodes.map((n) => n.position.y - getNodeSize(n).h / 2),
                    );
                    const padding = 40;
                    const gWidth =
                      Math.max(...selNodes.map((n) => n.position.x + getNodeSize(n).w / 2)) -
                      minX +
                      padding * 2;
                    const gHeight =
                      Math.max(...selNodes.map((n) => n.position.y + getNodeSize(n).h / 2)) -
                      minY +
                      padding * 2;
                    const gX = minX - padding + gWidth / 2;
                    const gY = minY - padding + gHeight / 2;
                    onGroupNodes(
                      {
                        id: `group-${Date.now().toString(36)}`,
                        type: 'group',
                        position: { x: gX, y: gY },
                        style: { width: gWidth, height: gHeight },
                        data: {
                          attributes: [],
                          customPosition: { x: gX, y: gY },
                          title: 'Group',
                        },
                      },
                      selNodes,
                      gX,
                      gY,
                    );
                  }}
                >
                  <GroupIcon className={MENU_CLASS.icon} /> Create Group
                </ContextMenuItem>
                <ContextMenuItem
                  intent="destructive"
                  onClick={() => {
                    onDeleteSelected(selNodes.filter((n) => !locked(n)));
                  }}
                  disabled={selNodes.every(locked)}
                >
                  <TrashIcon className={MENU_CLASS.icon} /> Delete Selected
                </ContextMenuItem>
              </>
            ) : menuCtx.type === '_node' && menuCtx.id ? (
              <>
                <ContextMenuItem
                  disabled={isTgtLocked}
                  onClick={() => {
                    onRenameNode(menuCtx.id!);
                  }}
                >
                  <EditIcon className={MENU_CLASS.icon} /> Rename Node
                </ContextMenuItem>
                <ContextMenuSub>
                  <ContextMenuSubTrigger disabled={isTgtLocked}>
                    <TypeIcon className={MENU_CLASS.icon} /> Change Type
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className={MENU_CLASS.content}>
                    {allowedTypes.map((t) => {
                      const { Icon, label, colorCls } = NODE_CFG[t];
                      return (
                        <ContextMenuItem
                          key={t}
                          disabled={isTgtLocked}
                          onClick={() => {
                            onChangeNodeType(menuCtx.id!, t);
                          }}
                        >
                          <Icon className={cn('size-4 shrink-0', colorCls)} />
                          <span>{nodeLabels[t] || label}</span>
                        </ContextMenuItem>
                      );
                    })}
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
                <ContextMenuItem
                  disabled={isTgtLocked}
                  intent="destructive"
                  onClick={() => tgtNode && onDeleteSelected([tgtNode])}
                >
                  <TrashIcon className={MENU_CLASS.icon} /> Delete Node
                </ContextMenuItem>
              </>
            ) : menuCtx.type === 'e' && menuCtx.id ? (
              <>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <TypeIcon className={MENU_CLASS.icon} /> Change Style
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className={MENU_CLASS.content}>
                    {NODE_MENUS.edges.map((m) => (
                      <ContextMenuItem
                        key={m.val}
                        onClick={() => {
                          onChangeEdgeStyle(menuCtx.id!, m.val);
                        }}
                      >
                        <svg
                          className="size-4 shrink-0 text-primary-11"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={m.dash}
                          strokeLinecap={m.cap}
                        >
                          <line x1="0" y1="8" x2="16" y2="8" />
                        </svg>
                        <span>{m.label}</span>
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
                <ContextMenuItem
                  intent="destructive"
                  onClick={() => {
                    onDeleteEdge(menuCtx.id!);
                  }}
                >
                  <TrashIcon className={MENU_CLASS.icon} /> Delete Edge
                </ContextMenuItem>
              </>
            ) : menuCtx.type === 'pane' ? (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <TypeIcon className={MENU_CLASS.icon} /> Add Node
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className={MENU_CLASS.content}>
                  {allowedTypes.map((t) => {
                    const { Icon, label, colorCls } = NODE_CFG[t];
                    return (
                      <ContextMenuItem
                        key={t}
                        onClick={() => {
                          try {
                            if (!lastPos.current) {
                              logWarn('AuthNodes', 'menu.add.missing-position', { type: t });
                              return;
                            }
                            const pos = screenToFlowPos(lastPos.current);
                            trace('menu.add', { type: t, position: pos });
                            if (t === 'process' && onAddContent) onAddContent(pos);
                            else onAddNode(t, pos);
                          } catch (err: unknown) {
                            logErr('AuthNodes', `menu.add.failed: ${t}`, {
                              error: err instanceof Error ? err.message : String(err),
                            });
                          }
                        }}
                      >
                        <Icon className={cn('size-4 shrink-0', colorCls)} />
                        <span>{nodeLabels[t] || label}</span>
                      </ContextMenuItem>
                    );
                  })}
                </ContextMenuSubContent>
              </ContextMenuSub>
            ) : null}
          </ContextMenuContent>
        )}
      </ContextMenu>
    );
  },
};
/** Supported node keys shared by the node renderer registry and flow controls. */
type FlowNodeType = keyof typeof NODE_TYPES;

/*//////////////////////////////////////////////////
COMPONENT
//////////////////////////////////////////////////*/

/**
 * Renders the Docs flow canvas and coordinates graph layout, editing, selection, and toolbar actions.
 *
 * @param className - Extra classes applied to the outer flow wrapper.
 * @param onCommit - Callback that receives the fully normalised flow after each change.
 * @param initialNodes Nodes loaded into the wrapper's initial committed graph state.
 * @param initialEdges Connections loaded into the wrapper's initial committed graph state.
 * @param nodeSep - Horizontal gap between graph nodes, in pixels.
 * @param rankSep - Vertical gap between graph ranks, in pixels.
 * @param height - Viewport height reserved for the flow graph.
 * @param onAddContent - Callback invoked when the user adds content from the graph.
 * @param onNodeClick - Callback invoked when the user selects a node.
 * @param customNodeTypes Additional renderers that override or extend the built-in node types.
 * @param nodeLabels - Node label map shown alongside nodes's graph nodes.
 * @param lockedTypes - Node types that nodes must keep read-only.
 * @param allowedTypes - Node types that nodes permits users to create.
 * @param disabled - Disabled state controlling whether nodes accepts interaction.
 * @param clipboardKey - Clipboard key that enables graph copy and paste in nodes.
 * @param arcControls - Whether the canvas shows arc layout controls.
 * @param edgeTypes - Edge renderer map that draws graph connections in nodes.
 * @param readyWhenEmpty - Readiness rule that lets nodes finish with no graph nodes.
 * @param onReady - Callback invoked after the graph surface finishes initializing.
 * @param style - Inline style values merged into nodes.
 * @param rest - Remaining DOM attributes and focus handlers forwarded to the flow viewport.
 * @param dir - Layout direction used when the graph is arranged automatically.
 * @param interactive - Whether the canvas accepts graph navigation and selection input.
 * @param editable - Whether the canvas accepts graph mutations.
 * @param proximityConnect - Whether nearby graph nodes may be connected automatically.
 * @param showBg - Whether to display the graph background.
 * @param showCtrls - Whether to display the graph controls.
 *
 * @return Docs flow editor wrapper with derived height, toolbar controls, and drag state.
 *
 * @remarks
 * This is the public entrypoint; the rest of the file exists to keep the canvas state manageable.
 */
export default function Nodes({
  nodes: initialNodes = [],
  edges: initialEdges = [],
  className,
  direction: dir = 'TB',
  nodeSep = 50,
  rankSep = 5,
  proximityConnect = false,
  interactive = false,
  height,
  onCommit,
  onAddContent,
  onNodeClick,
  nodeTypes: customNodeTypes = {},
  nodeLabels = {},
  lockedTypes = [],
  allowedTypes = Object.keys(NODE_TYPES) as (keyof typeof NODE_TYPES)[],
  editable = false,
  disabled = !editable,
  clipboardKey = editable ? 'terra.flow.docs' : undefined,
  showBg = true,
  showCtrls = true,
  arcControls = false,
  edgeTypes,
  readyWhenEmpty = true,
  onReady,
  style,
  ...rest
}: NodesProps): React.JSX.Element {
  // STATES
  const [graph, setGraph] = useState<{ nodes: FlowNode[]; edges: Edge[] }>({
    nodes: initialNodes,
    edges: initialEdges,
  });
  const [flow, setFlow] = useState<{ nodes: FlowNode[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });
  const [isFocused, setIsFocused] = useState(false);
  const [internalHeight, setInternalHeight] = useState(384);
  const graphRef = useRef(graph);
  const flowRef = useRef(flow);
  const permitted = editable && !disabled;
  const normLockedTypes = lockedTypes.filter((t): t is FlowNodeType => t in NODE_TYPES);
  const normAllowedTypes = allowedTypes.filter((t): t is FlowNodeType => t in NODE_TYPES);
  const fns = useRef({ onCommit, onAddContent });
  fns.current = { onCommit, onAddContent };

  // INIT
  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);
  useEffect(() => {
    flowRef.current = flow;
  }, [flow]);

  // HELPERS
  const writeGraph = useCallback(
    (
      v:
        | { nodes: FlowNode[]; edges: Edge[] }
        | ((curr: { nodes: FlowNode[]; edges: Edge[] }) => {
            nodes: FlowNode[];
            edges: Edge[];
          }),
      c = true,
    ) => {
      const n = typeof v === 'function' ? v(graphRef.current) : v;
      graphRef.current = n;
      setGraph(n);
      if (c) fns.current.onCommit?.(n);
    },
    [],
  );
  const editorAdapter: FlowEditorAdapter = {
    ...(clipboardKey ? { clipboardKey } : {}),
    cloneNode: (n: FlowNode, i: string) => ({
      ...n,
      id: i,
      data: {
        ...n.data,
        ...(typeof (n.data as { graphKey?: unknown }).graphKey === 'string' ? { graphKey: i } : {}),
      },
    }),
    editableNode: (n: FlowNode) => !normLockedTypes.includes(n.type as FlowNodeType),
    read: flow,
    write: useCallback(
      (n: { nodes: FlowNode[]; edges: Edge[] }): void => {
        flowRef.current = n;
        setFlow(n);
        writeGraph((c) => {
          const currEntities = {
            nodes: new Map(c.nodes.map((i) => [i.id, i])),
            edges: new Map(c.edges.map((i) => [i.id, i])),
          };
          return {
            nodes: n.nodes.map((n) => {
              const data = { ...n.data };
              for (const key of [
                'editable',
                'groupId',
                'id',
                'isDragTarget',
                'onResizeEnd',
                'requiredHandles',
              ] as const)
                Reflect.deleteProperty(data, key);
              return {
                ...(currEntities.nodes.get(n.id) ?? {}),
                id: n.id,
                type: n.type,
                position: n.position,
                ...(n.style === undefined ? {} : { style: n.style }),
                data,
              };
            }),
            edges: n.edges.map((e) => {
              return {
                ...currEntities.edges.get(e.id),
                id: e.id,
                source: e.source,
                target: e.target,
                ...(e.sourceHandle === undefined ? {} : { sourceHandle: e.sourceHandle }),
                ...(e.targetHandle === undefined ? {} : { targetHandle: e.targetHandle }),
                ...(e.label === undefined ? {} : { label: e.label }),
                ...(e.data === undefined ? {} : { data: e.data }),
              };
            }),
          };
        });
      },
      [writeGraph],
    ),
  };
  const [editorEls, setEditorEls] = useState(editorAdapter.read);
  const editorRef = useRef(editorEls);
  editorRef.current = editorEls;
  useEffect((): void => {
    setEditorEls(editorAdapter.read);
  }, [editorAdapter.read]);
  const editorWrite = useCallback(
    (n: { nodes: FlowNode[]; edges: Edge[] }): void => {
      editorRef.current = n;
      setEditorEls(n);
      editorAdapter.write(n);
    },
    [editorAdapter],
  );
  const editorEditable = useCallback(
    (n: FlowNode): boolean => editorAdapter.editableNode?.(n) ?? true,
    [editorAdapter],
  );
  const editorSelection = useCallback((): {
    version: 1;
    nodes: FlowNode[];
    edges: Edge[];
  } | null => {
    const selectedNodes = editorRef.current.nodes.filter(
      (node) => node.selected && editorEditable(node),
    );
    if (!selectedNodes.length) return null;
    const ids = new Set(selectedNodes.map((node) => node.id));
    return {
      version: 1,
      nodes: selectedNodes,
      edges: editorRef.current.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    };
  }, [editorEditable]);
  const editorCopy = useCallback((): void => {
    const value = editorSelection();
    if (!value || !editorAdapter.clipboardKey || typeof window === 'undefined') return;
    window.localStorage.setItem(editorAdapter.clipboardKey, JSON.stringify(value));
  }, [editorAdapter.clipboardKey, editorSelection]);
  const editorDeleteSelection = useCallback((): void => {
    if (disabled) return;
    const ids = new Set(
      editorRef.current.nodes
        .filter((node) => node.selected && editorEditable(node))
        .map((node) => node.id),
    );
    if (!ids.size) return;
    editorWrite({
      nodes: editorRef.current.nodes.filter((node) => !ids.has(node.id)),
      edges: editorRef.current.edges.filter(
        (edge) => !ids.has(edge.source) && !ids.has(edge.target),
      ),
    });
  }, [disabled, editorEditable, editorWrite]);
  const editorCut = useCallback((): void => {
    if (disabled) return;
    editorCopy();
    editorDeleteSelection();
  }, [editorCopy, editorDeleteSelection, disabled]);
  const editorPaste = useCallback((): void => {
    if (disabled || !editorAdapter.clipboardKey || typeof window === 'undefined') return;
    try {
      const raw: unknown = JSON.parse(
        window.localStorage.getItem(editorAdapter.clipboardKey) ?? 'null',
      );
      if (
        !isRec(raw) ||
        raw.version !== 1 ||
        !Array.isArray(raw.nodes) ||
        !Array.isArray(raw.edges)
      )
        return;
      const value = raw as { version: 1; nodes: FlowNode[]; edges: Edge[] };
      const ids = new Map(value.nodes.map((node) => [node.id, `n-${crypto.randomUUID()}`]));
      editorWrite({
        nodes: [
          ...editorRef.current.nodes.map((node) => ({ ...node, selected: false })),
          ...value.nodes.map((node) => ({
            ...(editorAdapter.cloneNode?.(node, ids.get(node.id)!) ?? {
              ...node,
              id: ids.get(node.id)!,
            }),
            position: { x: node.position.x + 40, y: node.position.y + 40 },
            selected: true,
          })),
        ],
        edges: [
          ...editorRef.current.edges,
          ...value.edges.map((edge) => ({
            ...edge,
            id: `e-${crypto.randomUUID()}`,
            source: ids.get(edge.source)!,
            target: ids.get(edge.target)!,
          })),
        ],
      });
    } catch {
      // Ignore stale or malformed local clipboard payloads.
    }
  }, [editorAdapter.clipboardKey, disabled, editorWrite]);
  const editorDuplicate = useCallback((): void => {
    if (disabled) return;
    const value = editorSelection();
    if (!value) return;
    const ids = new Map(value.nodes.map((node) => [node.id, `n-${crypto.randomUUID()}`]));
    editorWrite({
      nodes: [
        ...editorRef.current.nodes.map((node) => ({ ...node, selected: false })),
        ...value.nodes.map((node) => ({
          ...(editorAdapter.cloneNode?.(node, ids.get(node.id)!) ?? {
            ...node,
            id: ids.get(node.id)!,
          }),
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          selected: true,
        })),
      ],
      edges: [
        ...editorRef.current.edges,
        ...value.edges.map((edge) => ({
          ...edge,
          id: `e-${crypto.randomUUID()}`,
          source: ids.get(edge.source)!,
          target: ids.get(edge.target)!,
        })),
      ],
    });
  }, [editorAdapter, disabled, editorSelection, editorWrite]);
  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return;
    /**
     * Routes copy, cut, paste, and duplicate shortcuts to the active flow editor.
     * @param event Browser key event to inspect and handle.
     * @returns No value; matching shortcuts are prevented and delegated to the editor.
     */
    const keydown = (event: KeyboardEvent): void => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement | null)?.isContentEditable
      )
        return;
      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        editorCopy();
      } else if (event.key.toLowerCase() === 'x') {
        event.preventDefault();
        editorCut();
      } else if (event.key.toLowerCase() === 'v') {
        event.preventDefault();
        editorPaste();
      } else if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        editorDuplicate();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
    };
  }, [editorCopy, editorCut, editorDuplicate, editorPaste]);
  useCallback(
    (c: EdgeChange<Edge>[]): void => {
      const permittedChanges = disabled ? c.filter((change) => change.type === 'select') : c;
      if (permittedChanges.length)
        editorWrite({
          ...editorRef.current,
          edges: applyEdgeChanges(permittedChanges, editorRef.current.edges),
        });
    },
    [disabled, editorWrite],
  );
  useCallback(
    (c: NodeChange<FlowNode>[]): void => {
      const permittedChanges = disabled ? c.filter((change) => change.type === 'select') : c;
      if (permittedChanges.length)
        editorWrite({
          ...editorRef.current,
          nodes: applyNodeChanges(permittedChanges, editorRef.current.nodes),
        });
    },
    [disabled, editorWrite],
  );
  useCallback(
    (s: FlowNode[]): void => {
      editorWrite({
        ...editorRef.current,
        nodes: editorRef.current.nodes.map((node) => ({
          ...node,
          selected: new Set(s.map((i) => i.id)).has(node.id),
        })),
      });
    },
    [editorWrite],
  );
  const handleResizeEnd = useCallback(
    (i: string, p: { x: number; y: number; width: number; height: number }) => {
      writeGraph((c) => ({
        ...c,
        nodes: c.nodes.map((n) =>
          n.id === i
            ? {
                ...n,
                position: { x: p.x, y: p.y },
                style: { ...n.style, width: p.width, height: p.height },
                data: { ...n.data, customPosition: { x: p.x, y: p.y } },
              }
            : n,
        ),
      }));
    },
    [writeGraph],
  );
  useEffect(() => {
    const layout = new Dagre.graphlib.Graph({ compound: true });
    layout.setGraph({ rankdir: dir, nodesep: nodeSep, ranksep: rankSep });
    layout.setDefaultEdgeLabel(() => ({}));
    graph.nodes.forEach((node) => {
      const size = getNodeSize(
        node,
        { width: 175, height: 60, groupWidth: 160, groupHeight: 100, erdWidth: 224, erdHeight: 60 },
        (candidate) => {
          if (candidate.type !== 'erd') return;
          const attrs =
            candidate.data &&
            validateType(['object'], candidate.data) &&
            'attributes' in candidate.data
              ? (candidate.data as { attributes?: unknown[] }).attributes
              : undefined;
          return 60 + (Array.isArray(attrs) ? attrs.length : 0) * 20;
        },
      );
      if (node.type === 'group')
        layout.setNode(node.id, {
          paddingLeft: 40,
          paddingRight: 40,
          paddingTop: 60,
          paddingBottom: 40,
        });
      else layout.setNode(node.id, { width: size.w, height: size.h });
    });
    graph.nodes.forEach((node) => {
      const parentId = getGroupId(node);
      if (parentId && layout.hasNode(parentId)) layout.setParent(node.id, parentId);
    });
    const groupNodeIds = new Set(
      graph.nodes.filter((node) => node.type === 'group').map((node) => node.id),
    );
    graph.edges.forEach((edge) => {
      if (
        edge.source !== edge.target &&
        !groupNodeIds.has(edge.source) &&
        !groupNodeIds.has(edge.target)
      )
        layout.setEdge(edge.source, edge.target);
    });
    Dagre.layout(layout);
    const graphHeight = (layout.graph() as { height?: number }).height ?? 0;
    if (graphHeight && height === undefined) setInternalHeight(graphHeight + 40);
    const { nodes, edges } = syncGraph(
      graph.nodes.map((node) => {
        const persisted =
          node.data &&
          isRec(node.data) &&
          'customPosition' in node.data &&
          isRec(node.data.customPosition) &&
          typeof node.data.customPosition.x === 'number' &&
          Number.isFinite(node.data.customPosition.x) &&
          typeof node.data.customPosition.y === 'number' &&
          Number.isFinite(node.data.customPosition.y)
            ? { x: node.data.customPosition.x, y: node.data.customPosition.y }
            : undefined;
        const dagreNode = layout.node(node.id);
        if (node.type === 'group') {
          const calcW = dagreNode?.width ?? 200;
          const calcH = dagreNode?.height ?? 150;
          const width = persisted ? (node.style?.width ?? calcW) : calcW;
          const height = persisted ? (node.style?.height ?? calcH) : calcH;
          return {
            ...node,
            position: persisted ?? {
              x: (dagreNode?.x ?? 0) - Number(width) / 2,
              y: (dagreNode?.y ?? 0) - Number(height) / 2,
            },
            style: { ...node.style, width, height },
          };
        }
        return {
          ...node,
          position: persisted ?? { x: dagreNode?.x ?? 0, y: dagreNode?.y ?? 0 },
        };
      }),
      graph.edges,
      dir,
      proximityConnect,
      permitted,
      arcControls,
      handleResizeEnd,
    );
    setFlow({
      nodes: nodes.map((node) => ({
        ...node,
        selected: flowRef.current.nodes.some(
          (selectedNode) => selectedNode.id === node.id && selectedNode.selected,
        ),
      })),
      edges,
    });
  }, [
    graph,
    dir,
    nodeSep,
    rankSep,
    proximityConnect,
    permitted,
    arcControls,
    height,
    handleResizeEnd,
  ]);
  useEffect(() => {
    writeGraph({ nodes: initialNodes, edges: initialEdges }, false);
  }, [initialNodes, initialEdges, writeGraph]);

  // HELPERS

  // RENDER
  return (
    <ErrorBoundary name="Nodes">
      <div
        style={{ height: height ?? internalHeight, ...style }}
        className={cn(
          'docs-flow size-full overflow-hidden rounded-md border border-primary-6',
          interactive && 'scrim-primary-1 scrim-20',
          className,
        )}
        tabIndex={rest.tabIndex ?? 0}
        onFocus={(e) => {
          setIsFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          rest.onBlur?.(e);
        }}
      >
        <ReactFlowProvider>
          <FLOW_COMPONENTS.Canvas
            flow={flow}
            nodeTypes={
              {
                ...FLOW_COMPONENTS.nodeTypes,
                ...customNodeTypes,
              } as unknown as Record<string, React.ComponentType<NodeProps<FlowNode>>>
            }
            {...(edgeTypes ? { edgeTypes } : {})}
            nodeLabels={nodeLabels}
            {...(onNodeClick === undefined ? {} : { onNodeClick })}
            onNodesChange={
              /* prettier-ignore */ useCallback((r: NodeChange[]) => {
		const typedChanges = r as NodeChange<FlowNode>[];
		const nodeChanges = { byId: new Map(flowRef.current.nodes.map(n => [n.id, n])), positionIds: new Set(typedChanges.filter(c => c.type === 'position').map(c => c.id)) };
		const childrenByGroupMap = new Map<string, FlowNode[]>();
		flowRef.current.nodes.forEach(n => {
			const gId = getGroupId(n);
			if (gId) {
				const children = childrenByGroupMap.get(gId) ?? [];
				children.push(n);
				childrenByGroupMap.set(gId, children);
			}
		});
		const extraChanges: NodeChange<FlowNode>[] = [];
		typedChanges.forEach(v => {
			if (v.type === 'position') {
				const n = nodeChanges.byId.get(v.id);
				if (n && n.type === 'group') {
					(childrenByGroupMap.get(n.id) ?? []).forEach(c => {
						if (!nodeChanges.positionIds.has(c.id)) {
							const childChange: NodeChange<FlowNode> = { type: 'position', id: c.id };
							if (v.position) {
								childChange.position = { x: c.position.x + (v.position.x - n.position.x), y: c.position.y + (v.position.y - n.position.y) };
							}
							if (v.dragging !== undefined) childChange.dragging = v.dragging;
							if (childChange.position || childChange.dragging !== undefined) extraChanges.push(childChange);
						}
					});
				}
			}
		});
		const allChanges = [...typedChanges, ...extraChanges];
		const isDragFinished = editable && allChanges.some(c => c.type === 'position' && c.dragging === false);
		const hasRemoval = editable && allChanges.some(c => c.type === 'remove');
		const nNodes = applyNodeChanges<FlowNode>(allChanges, flowRef.current.nodes);
		let fNodes = nNodes;
		let fEdges = flowRef.current.edges;
		if (proximityConnect || isDragFinished) {
			const synced = syncGraph(nNodes, flowRef.current.edges, dir, proximityConnect, editable, arcControls, handleResizeEnd);
			fNodes = synced.nodes;
			fEdges = synced.edges;
		}
		setFlow({ nodes: fNodes, edges: fEdges });
		flowRef.current = { nodes: fNodes, edges: fEdges };
		if (isDragFinished || hasRemoval) {
			writeGraph(v => {
				let nNodes = v.nodes;
				const nodeUpdates = {
					removedIds: hasRemoval ? new Set(allChanges.filter(c => c.type === 'remove').map(c => (c as { id: string }).id)) : undefined,
					draggedById: isDragFinished ? new Map(fNodes.map(n => [n.id, n])) : undefined,
				};
				if (hasRemoval) {
					nNodes = nNodes.filter(n => !nodeUpdates.removedIds?.has(n.id));
				}
				if (isDragFinished) {
					nNodes = nNodes.map(n => {
						const dragged = nodeUpdates.draggedById?.get(n.id);
						if (!dragged) return n;
						// use gracefully checked positions to avoid TypeErrors when nodes don't have static initial positions
						const prevPos = n.position;
						if (!prevPos || dragged.position.x !== prevPos.x || dragged.position.y !== prevPos.y) return {...n,position: dragged.position,data: { ...(n.data ?? { title: '', attributes: [] }), customPosition: dragged.position },};
						return n;
					});
				}
				return { ...v, nodes: nNodes };
			});
		}
	}, [dir, proximityConnect, editable, arcControls, handleResizeEnd, writeGraph])
            }
            onEdgesChange={useCallback(
              (v: EdgeChange<Edge>[]) => {
                const nEdges = applyEdgeChanges<Edge>(v, flowRef.current.edges);
                setFlow({ ...flowRef.current, edges: nEdges });
                flowRef.current = { ...flowRef.current, edges: nEdges };
                if (editable && v.some((c) => c.type === 'remove')) {
                  const remEdgeIds = new Set(v.filter((c) => c.type === 'remove').map((c) => c.id));
                  writeGraph((c) => ({
                    ...c,
                    edges: remEdgeIds.size
                      ? c.edges.filter((_e) => !remEdgeIds.has(_e.id))
                      : c.edges,
                  }));
                }
              },
              [editable, writeGraph],
            )}
            onConnect={useCallback(
              (p: Connection) => {
                if (!editable) return;
                writeGraph((c) => ({
                  ...c,
                  edges: [
                    ...c.edges,
                    {
                      id: `_e-${p.source}-${p.target}-${Date.now().toString(36)}`,
                      source: p.source,
                      target: p.target,
                      sourceHandle: p.sourceHandle,
                      targetHandle: p.targetHandle,
                      labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
                      data: {
                        srcHandleOverride: p.sourceHandle as Pos,
                        tgtHandleOverride: p.targetHandle as Pos,
                        arrowHead: true,
                      },
                    },
                  ],
                }));
              },
              [editable, writeGraph],
            )}
            onEdgeDoubleClick={useCallback(
              (_e: React.MouseEvent, r: Edge) => {
                if (!editable) return;
                const nLabel = window.prompt('Enter edge label:', (r.label as string) || '');
                if (nLabel === null) return;
                writeGraph((g) => ({
                  ...g,
                  edges: g.edges.map((e) =>
                    e.id === r.id
                      ? {
                          ...e,
                          label: nLabel,
                          labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
                        }
                      : e,
                  ),
                }));
              },
              [editable, writeGraph],
            )}
            onAddNode={useCallback(
              (t: keyof typeof NODE_TYPES, p: XYPosition) => {
                writeGraph((c) => ({
                  ...c,
                  nodes: [
                    ...c.nodes,
                    {
                      id: `${t}-${Date.now().toString(36)}`,
                      type: t,
                      position: p,
                      data: {
                        attributes: [],
                        customPosition: p,
                        title: `${NODE_CFG[t].label} ${c.nodes.length + 1}`,
                      },
                    },
                  ],
                }));
              },
              [writeGraph],
            )}
            lockedTypes={normLockedTypes}
            allowedTypes={normAllowedTypes}
            {...(fns.current.onAddContent === undefined
              ? {}
              : { onAddContent: fns.current.onAddContent })}
            onGroupNodes={useCallback(
              (g: FlowNode, v: FlowNode[]) => {
                const group = {
                  node: g,
                  targetIds: new Set(v.map((s) => s.id)),
                };
                writeGraph((c) => {
                  const nNodes = c.nodes.map((n) => {
                    if (group.targetIds.has(n.id)) {
                      const rest = { ...n };
                      Reflect.deleteProperty(rest, 'parentId');
                      Reflect.deleteProperty(rest, 'extent');
                      return { ...rest, data: { ...n.data, groupId: g.id } };
                    }
                    return n;
                  });
                  return {
                    ...c,
                    nodes: nNodes.some((n) => n.id === group.node.id)
                      ? nNodes
                      : [group.node, ...nNodes],
                  };
                });
              },
              [writeGraph],
            )}
            onUngroupNodes={useCallback(
              (v: FlowNode[]) => {
                const ungroupMap = new Map(v.map((u) => [u.id, u]));
                writeGraph((c) => ({
                  ...c,
                  nodes: c.nodes.map((n) => {
                    if (ungroupMap.has(n.id)) {
                      if (!getGroupId(ungroupMap.get(n.id)!)) return n;
                      const rest = { ...n };
                      Reflect.deleteProperty(rest, 'parentId');
                      Reflect.deleteProperty(rest, 'extent');
                      const restData = {
                        ...((rest.data as Record<string, unknown>) ?? {}),
                      };
                      Reflect.deleteProperty(restData, 'groupId');
                      return { ...rest, data: restData as NodeData };
                    }
                    return n;
                  }),
                }));
              },
              [writeGraph],
            )}
            onDeleteSelected={useCallback(
              (s: FlowNode[]) => {
                writeGraph((c) => {
                  const selIds = new Set(s.map((n) => n.id));
                  return {
                    ...c,
                    nodes: c.nodes.filter((n) => !selIds.has(n.id)),
                    edges: c.edges.filter((_e) => !selIds.has(_e.source) && !selIds.has(_e.target)),
                  };
                });
              },
              [writeGraph],
            )}
            onAlignNodes={useCallback(
              (v: FlowNode[], t: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
                if (v.length < 2) return;
                const selNodesMap = new Map(v.map((s) => [s.id, s]));
                writeGraph((c) => {
                  const absPos = v.map((n) => ({ n, abs: n.position }));
                  const minX = Math.min(...absPos.map((p) => p.abs.x - getNodeSize(p.n).w / 2));
                  const maxX = Math.max(...absPos.map((p) => p.abs.x + getNodeSize(p.n).w / 2));
                  const minY = Math.min(...absPos.map((p) => p.abs.y - getNodeSize(p.n).h / 2));
                  const maxY = Math.max(...absPos.map((p) => p.abs.y + getNodeSize(p.n).h / 2));
                  return {
                    ...c,
                    nodes: c.nodes.map((n) => {
                      if (selNodesMap.has(n.id)) {
                        const flowNode = selNodesMap.get(n.id)!;
                        const size = getNodeSize(flowNode);
                        let nAbsX = flowNode.position.x;
                        let nAbsY = flowNode.position.y;
                        switch (t) {
                          case 'left':
                            nAbsX = minX + size.w / 2;
                            break;
                          case 'center':
                            nAbsX = (minX + maxX) / 2;
                            break;
                          case 'right':
                            nAbsX = maxX - size.w / 2;
                            break;
                          case 'top':
                            nAbsY = minY + size.h / 2;
                            break;
                          case 'middle':
                            nAbsY = (minY + maxY) / 2;
                            break;
                          case 'bottom':
                            nAbsY = maxY - size.h / 2;
                            break;
                        }
                        const nPos = { x: nAbsX, y: nAbsY };
                        return {
                          ...n,
                          position: nPos,
                          data: { ...n.data, customPosition: nPos },
                        };
                      }
                      return n;
                    }),
                  };
                });
              },
              [writeGraph],
            )}
            onDistributeNodes={useCallback(
              (v: FlowNode[], t: string) => {
                if (v.length < 3) return;
                writeGraph((c) => {
                  const isHoriz = t.startsWith('horizontal');
                  const sizeKey = isHoriz ? 'w' : 'h';

                  /**
                   * Handles get edge.
                   *
                   * @param p - Graph node whose position should be rendered.
                   *
                   * @return
                   */
                  const getEdge = (p: { n: FlowNode; abs: { x: number; y: number } }) => {
                    const basePos = p.abs[isHoriz ? 'x' : 'y'];
                    const size = getNodeSize(p.n)[sizeKey];
                    if (t.endsWith('left') || t.endsWith('top')) return basePos - size / 2;
                    if (t.endsWith('center')) return basePos;
                    return basePos + size / 2;
                  };
                  const sorted = [...v.map((n) => ({ n, abs: n.position }))].sort(
                    (a, b) => getEdge(a) - getEdge(b),
                  );
                  const min = getEdge(sorted[0]!);
                  const layoutLookup = {
                    nodes: new Map(v.map((s) => [s.id, s])),
                    indices: new Map(sorted.map((s, i) => [s.n.id, i])),
                  };
                  return {
                    ...c,
                    nodes: c.nodes.map((n) => {
                      if (layoutLookup.nodes.has(n.id)) {
                        const tEdge =
                          min +
                          ((getEdge(sorted[sorted.length - 1]!) - min) / (sorted.length - 1)) *
                            layoutLookup.indices.get(n.id)!;
                        const flowNode = layoutLookup.nodes.get(n.id)!;
                        const size = getNodeSize(flowNode)[sizeKey];
                        let nAbsVal = tEdge;
                        if (t.endsWith('left') || t.endsWith('top')) nAbsVal = tEdge + size / 2;
                        else if (t.endsWith('right') || t.endsWith('bottom'))
                          nAbsVal = tEdge - size / 2;
                        const newPos = {
                          x: isHoriz ? nAbsVal : flowNode.position.x,
                          y: isHoriz ? flowNode.position.y : nAbsVal,
                        };
                        return {
                          ...n,
                          position: newPos,
                          data: { ...n.data, customPosition: newPos },
                        };
                      }
                      return n;
                    }),
                  };
                });
              },
              [writeGraph],
            )}
            onRenameNode={useCallback(
              (i: string) => {
                let _node: FlowNode | undefined;
                for (const n of flowRef.current.nodes) {
                  if (n.id === i) {
                    _node = n;
                    break;
                  }
                }
                if (!_node) return;
                const nTitle = window.prompt('Enter new name:', _node.data.title);
                if (!nTitle) return;
                writeGraph((c) => ({
                  ...c,
                  nodes: c.nodes.map((n) =>
                    n.id === i ? { ...n, data: { ...n.data, title: nTitle } } : n,
                  ),
                }));
              },
              [writeGraph],
            )}
            onChangeNodeType={useCallback(
              (i: string, t: keyof typeof NODE_TYPES) => {
                writeGraph((c) => ({
                  ...c,
                  nodes: c.nodes.map((n) => (n.id === i ? { ...n, type: t } : n)),
                }));
              },
              [writeGraph],
            )}
            onChangeEdgeStyle={useCallback(
              (i: string, s: 'solid' | 'dashed' | 'dotted') => {
                writeGraph((c) => ({
                  ...c,
                  edges: c.edges.map((e) =>
                    e.id === i ? { ...e, data: { ...e.data, strokeStyle: s } } : e,
                  ),
                }));
              },
              [writeGraph],
            )}
            onDeleteEdge={useCallback(
              (i: string) => {
                writeGraph((c) => ({
                  ...c,
                  edges: c.edges.filter((_e) => _e.id !== i),
                }));
              },
              [writeGraph],
            )}
            onAutoLayout={useCallback(() => {
              writeGraph((c) => {
                const validNodeIds = new Set(c.nodes.map((n) => n.id));
                return {
                  ...c,
                  nodes: c.nodes.map((n) => {
                    const rest = { ...n };
                    Reflect.deleteProperty(rest, 'parentId');
                    Reflect.deleteProperty(rest, 'extent');
                    return {
                      ...rest,
                      data: Object.fromEntries(
                        Object.entries(rest.data ?? {}).filter(([k]) => k !== 'customPosition'),
                      ) as NodeData,
                    };
                  }),
                  edges: c.edges.filter(
                    (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target),
                  ),
                };
              });
            }, [writeGraph])}
            interactive={interactive}
            editable={permitted}
            isFocused={isFocused}
            height={typeof height === 'number' && Number.isFinite(height) ? height : internalHeight}
            showBg={showBg}
            showCtrls={showCtrls}
            arcControls={arcControls}
            readyWhenEmpty={readyWhenEmpty}
            {...(onReady === undefined ? {} : { onReady })}
          />
        </ReactFlowProvider>
      </div>
    </ErrorBoundary>
  );
}

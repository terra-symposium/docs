/**
 * src/components/terra/editor/docs/_Nodes.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { cn } from '../../../../lib/terra/runtime/runtime.js';
import { decodeNodesPayload } from '../../../../lib/terra/runtime/nodes.js';

// COMPONENTS
import Canvas from '../../flow/Nodes.js';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { DocsBlock } from '../types.js';
import type { Edge, FlowNode, NodesProps } from '../../../../lib/terra/runtime/types.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Decodes Docs graph data and renders a filtered React Flow preview.
 *
 * @param diagramOptions Graph data, layout options, and presentation props for the flow canvas.
 * @param diagramOptions.className Additional classes merged into the Docs and canvas containers.
 * @param diagramOptions.nodes Serialized or typed nodes to decode and validate before rendering.
 * @param diagramOptions.edges Serialized or typed edges to decode and validate before rendering.
 * @param diagramOptions.direction Optional top-to-bottom or left-to-right graph layout.
 * @param diagramOptions.height Graph viewport height in pixels; defaults to 384 when omitted or invalid.
 * @param diagramOptions.nodeSep Optional horizontal separation between sibling nodes in the layout.
 * @param diagramOptions.rankSep Optional separation between graph ranks in the layout.
 * @param diagramOptions.proximityConnect Whether the layout may connect eligible nearby nodes automatically.
 * @param diagramOptions.showBg Whether to display the graph background grid.
 * @param diagramOptions.showCtrls Whether to display graph controls.
 *
 * @return A Docs diagram container with the validated graph and requested layout options.
 */
function NodesRenderer(diagramOptions: NodesProps & { className?: string }): JSX.Element {
  const {
    className,
    nodes: rawNodes,
    edges: rawEdges,
    direction,
    height,
    nodeSep,
    rankSep,
    proximityConnect,
    ...rest
  } = diagramOptions;
  const resolvedHeight = Number.isFinite(Number(height)) ? Number(height) : 384;
  return (
    <ErrorBoundary name="Nodes">
      <div
        className={cn(
          'block not-prose relative my-0 flow-root transition-all duration-200 [&>:first-child]:!mt-0 [&>:last-child]:!mb-0 [&_.flow-node-handle]:invisible',
          className,
        )}
        data-docs-editor-block="Nodes"
        style={{ height: resolvedHeight, width: '100%' }}
        contentEditable={false}
        suppressContentEditableWarning
      >
        <Canvas
          {...rest}
          height={resolvedHeight}
          {...(direction === undefined ? {} : { direction })}
          {...(nodeSep === undefined ? {} : { nodeSep })}
          {...(rankSep === undefined ? {} : { rankSep })}
          {...(proximityConnect === undefined ? {} : { proximityConnect })}
          nodes={decodeNodesPayload(rawNodes).filter((n): n is FlowNode => {
            if (!n || typeof n !== 'object') return false;
            const val = n as Record<string, unknown>;
            return typeof val.id === 'string' && Boolean(val.data && typeof val.data === 'object');
          })}
          edges={decodeNodesPayload(rawEdges).filter((e): e is Edge => {
            if (!e || typeof e !== 'object') return false;
            const val = e as Record<string, unknown>;
            return (
              typeof val.id === 'string' &&
              typeof val.source === 'string' &&
              typeof val.target === 'string'
            );
          })}
          className={className}
        />
      </div>
    </ErrorBoundary>
  );
}

/**
 * Renders a Portable Text nodes block through the Docs flow canvas.
 *
 * @param block Portable Text nodes block with graph data and optional layout settings.
 *
 * @return The nodes block inside its rendering error boundary.
 *
 * @docsId diagrams
 * @docsUseWhen A process, dependency, or decision is clearer as connected nodes than as a short list.
 * @docsConstraint Use a diagram only when its connections clarify the idea.
 * @docsConstraint Keep explanatory prose outside the diagram.
 * @docsConstraint In Markdown, provide valid JSON arrays for `nodes` and `edges`.
 * @docsConstraint Every edge must point to an existing source and target node.
 * @docsDo Match each node type to its role.
 * @docsDo Keep each node and edge on one line.
 * @docsDo Preview labels and connections.
 * @docsDont Do not add a diagram when it only repeats labels or a linear list.
 * @docsDont Do not point edges to missing nodes.
 * @docsDont Do not use empty node or edge arrays.
 * @docsDont Do not use a node type for the wrong role.
 * @docsTip Prefer a list for a short sequence.
 * @docsRenderKind nodes
 * @docsTip Use a table for repeated attributes.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/insert-nodes.png | Docs Insert content menu with Nodes highlighted
 * @docsInsertionStep Choose + Insert content → Nodes.
 * @docsInsertionStep Add nodes and connect each edge to an existing node.
 * @docsInsertionStep Preview labels and connections.
 * @docsSyntax
 * ```mdx
 * <Nodes
 *   nodes={[
 *     { "id": "edit", "type": "origin", "data": { "title": "Docs receives edit" } },
 *     { "id": "save", "type": "terminator", "data": { "title": "Host saves value" } }
 *   ]}
 *   edges={[{ "id": "edit-save", "source": "edit", "target": "save" }]}
 * />
 * ```
 * @docsRenderedExample
 * The relationship is shown as a flow: Docs receives edit → Host saves value.
 */
export function NodesBlock({
  block,
}: {
  block: /**
   * Sanity Portable Text graph data and its visualization settings.
   */ DocsBlock<'nodes'>;
}): JSX.Element {
  const height = Number(block.height);
  return (
    <ErrorBoundary name="NodesBlock">
      <NodesRenderer
        {...(block.nodes === undefined
          ? {}
          : {
              nodes: block.nodes as unknown as NonNullable<NodesProps['nodes']>,
            })}
        {...(block.edges === undefined
          ? {}
          : {
              edges: block.edges as unknown as NonNullable<NodesProps['edges']>,
            })}
        {...(block.direction === 'TB' || block.direction === 'LR'
          ? { direction: block.direction }
          : {})}
        {...(Number.isFinite(height) ? { height } : {})}
        {...(block.nodeSep === undefined ? {} : { nodeSep: block.nodeSep })}
        {...(block.proximityConnect === undefined
          ? {}
          : { proximityConnect: block.proximityConnect })}
        {...(block.rankSep === undefined ? {} : { rankSep: block.rankSep })}
        {...(typeof block.showBg === 'boolean' ? { showBg: block.showBg } : {})}
        {...(typeof block.showCtrls === 'boolean' ? { showCtrls: block.showCtrls } : {})}
        {...(typeof block.className === 'string' ? { className: block.className } : {})}
      />
    </ErrorBoundary>
  );
}
Object.assign(NodesRenderer, { displayName: 'DocsNodesRenderer' });
Object.assign(NodesBlock, { displayName: 'DocsNodesBlock' });

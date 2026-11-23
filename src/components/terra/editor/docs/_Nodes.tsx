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
          'block not-prose relative my-0 flow-root transition-all duration-200 [&>:first-child]:!mt-0 [&>:last-child]:!mb-0',
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
 * @docsConstraint Use a diagram for a process, hierarchy, dependency, or decision only when its connections explain more than a short list or table.
 * @docsConstraint Keep prose outside the diagram; include complete node and edge arrays in the directive.
 * @docsConstraint In `.md` files, write `nodes` and `edges` as JSON arrays inside braces: quote every key and string with double quotes, and omit trailing commas. The Markdown renderer does not evaluate JavaScript expressions.
 * @docsConstraint Every edge must point to an existing source and target node.
 * @docsDo Use origin for a start, process for an action, terminator for an outcome, and terminal for a hard stop.
 * @docsDo Use decision for meaningful alternatives, data for an input/output, note for short context, group for one stage, and ERD for entities.
 * @docsDo Put each node or edge object on one line, then inspect labels, direction, spacing, and controls.
 * @docsDont Do not add a diagram when it only repeats labels or a linear list.
 * @docsDont Do not point edges to missing nodes or replace required data with empty arrays.
 * @docsDont Do not use a node type for a different semantic role (for example, an origin for every intermediate step).
 * @docsTip Prefer a list for a short linear sequence and a table for repeated attributes.
 * @docsRenderKind nodes
 * @docsTip Origin marks a start; process an action; terminator an outcome; terminal a hard stop; decision a meaningful branch; data an input/output; note short context; group one stage; ERD an entity.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/insert-nodes.png | Docs Insert content menu with Nodes highlighted
 * @docsInsertionStep In Edit mode, place the cursor where the relationships belong and choose + Insert content → Nodes.
 * @docsInsertionStep Add complete node and edge arrays; connect each edge to an existing node.
 * @docsInsertionStep Preview labels, direction, spacing, and graph controls.
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
      />
    </ErrorBoundary>
  );
}
Object.assign(NodesRenderer, { displayName: 'DocsNodesRenderer' });
Object.assign(NodesBlock, { displayName: 'DocsNodesBlock' });

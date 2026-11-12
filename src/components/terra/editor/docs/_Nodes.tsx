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
          'docs-block not-prose relative my-0 flow-root transition-all duration-200 [&>:first-child]:!mt-0 [&>:last-child]:!mb-0',
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
 */
export function NodesBlock({
  block,
}: {
  block: /** Sanity Portable Text graph data and its visualization settings. */ DocsBlock<'nodes'>;
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

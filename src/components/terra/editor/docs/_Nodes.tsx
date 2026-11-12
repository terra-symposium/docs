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
import type { JSX } from 'react';
import type { DocsBlock } from '../types.js';
import type { Edge, FlowNode, NodesProps } from '../../../../lib/terra/runtime/types.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Adapts persisted Docs graph data to the interactive flow canvas renderer.
 *
 * @param className Optional classes applied to the graph wrapper and canvas.
 * @param rawNodes Serialized node records validated before entering React Flow.
 * @param rawEdges Serialized edge records validated before entering React Flow.
 * @param direction Optional layout direction accepted by the shared flow canvas.
 * @param height Requested canvas height, defaulted when it is not finite.
 * @param nodeSep Optional horizontal spacing between graph nodes.
 * @param rankSep Optional spacing between graph ranks.
 * @param proximityConnect Whether nearby nodes may connect automatically.
 * @param rest Remaining flow and DOM options forwarded to the canvas.
 * @return A Docs wrapper containing the normalized React Flow graph.
 */
function NodesRenderer({
  className,
  nodes: rawNodes,
  edges: rawEdges,
  direction,
  height,
  nodeSep,
  rankSep,
  proximityConnect,
  ...rest
}: NodesProps & { className?: string }): JSX.Element {
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
          {...(direction === 'TB' || direction === 'LR' ? { direction } : {})}
          height={resolvedHeight}
          {...(typeof nodeSep === 'number' ? { nodeSep } : {})}
          {...(typeof rankSep === 'number' ? { rankSep } : {})}
          {...(typeof proximityConnect === 'boolean' ? { proximityConnect } : {})}
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
 * Renders a Portable Text graph block using the shared interactive canvas.
 *
 * @param block Authored Docs nodes block containing graph data and visualization settings.
 *
 * @returns The validated graph preview wrapped in an error boundary.
 */
export function NodesBlock({
  block,
}: {
  block: /** Sanity Portable Text graph data and its visualization settings. */ DocsBlock<'nodes'>;
}): JSX.Element {
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
        {...(typeof block.height === 'number' ? { height: block.height } : {})}
        {...(typeof block.nodeSep === 'number' ? { nodeSep: block.nodeSep } : {})}
        {...(typeof block.proximityConnect === 'boolean'
          ? { proximityConnect: block.proximityConnect }
          : {})}
        {...(typeof block.rankSep === 'number' ? { rankSep: block.rankSep } : {})}
      />
    </ErrorBoundary>
  );
}
Object.assign(NodesRenderer, { displayName: 'DocsNodesRenderer' });
Object.assign(NodesBlock, { displayName: 'DocsNodesBlock' });

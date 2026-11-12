/**
 * src/components/terra/flow/_chrome.tsx
 * Shared React Flow presentation primitives.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { cn, isRec } from '../../../lib/terra/runtime/runtime.js';

// COMPONENTS
import { ErrorBoundary } from '../ui.js';
import { Handle, Position as HandlePos } from '@xyflow/react';

// TYPES
import type { ComponentPropsWithoutRef, ElementType, JSX } from 'react';
import type { FlowNodeLike, FlowSize, Pos } from '../../../lib/terra/runtime/types.js';

/*//////////////////////////////////////////////////
LAYOUT
//////////////////////////////////////////////////*/

/**
 * Resolves a node's structural group id from its parent or embedded data.
 *
 * @param n - Node-like value with optional parent metadata.
 *
 * @return The resolved group id when present, otherwise `undefined`.
 */
export function getGroupId(n: { parentId?: string | null; data?: unknown }): string | undefined {
  return (
    n.parentId || (isRec(n.data) && typeof n.data.groupId === 'string' ? n.data.groupId : undefined)
  );
}

/**
 * Measures a flow node using persisted dimensions, runtime measurements, or defaults.
 *
 * @param n - Node whose size is being resolved.
 * @param defaults - Fallback dimensions used when the node has not been measured.
 * @param extraHeight - Optional height override for nodes with dynamic content.
 *
 * @return The computed width and height used by layout.
 */
export function getNodeSize(
  n: FlowNodeLike,
  defaults: {
    width: number;
    height: number;
    groupWidth?: number;
    groupHeight?: number;
    erdWidth?: number;
    erdHeight?: number;
  } = {
    width: 175,
    height: 60,
    groupWidth: 160,
    groupHeight: 100,
    erdWidth: 224,
    erdHeight: 60,
  },
  extraHeight?: (n: FlowNodeLike) => number | undefined,
): FlowSize {
  const style: Record<string, unknown> = isRec(n.style) ? (n.style as Record<string, unknown>) : {};
  const width = Number(
    n.measured?.width ??
      style.width ??
      (n.type === 'group'
        ? (defaults.groupWidth ?? defaults.width)
        : n.type === 'erd'
          ? (defaults.erdWidth ?? defaults.width)
          : defaults.width),
  );
  const height =
    extraHeight?.(n) ??
    Number(
      n.measured?.height ??
        style.height ??
        (n.type === 'group' ? (defaults.groupHeight ?? defaults.height) : defaults.height),
    );
  return {
    w: Number.isFinite(width) ? width : defaults.width,
    h: Number.isFinite(height) ? height : defaults.height,
  };
}

/*//////////////////////////////////////////////////
NODE CHROME
//////////////////////////////////////////////////*/

/**
 * Renders all handles for a node based on editability and required directions.
 *
 * @param editable - Whether each handle accepts connections.
 * @param srcs - Source-side positions that remain visible on a read-only node.
 * @param tgts - Target-side positions that remain visible on a read-only node.
 *
 * @return The full handle set for a node.
 */
export function Handles({
  editable = false,
  sources: srcs = [],
  tgts = [],
}: {
  editable?: boolean;
  sources?: Pos[];
  tgts?: Pos[];
}): JSX.Element {
  return (
    <ErrorBoundary name="Handles">
      {(['target', 'source'] as const).map((t) =>
        (
          [
            { id: 'top', pos: HandlePos.Top },
            { id: 'right', pos: HandlePos.Right },
            { id: 'bottom', pos: HandlePos.Bottom },
            { id: 'left', pos: HandlePos.Left },
          ] satisfies { id: Pos; pos: HandlePos }[]
        ).map((p) => (
          <Handle
            key={`${t}-${p.id}`}
            id={p.id}
            type={t}
            position={p.pos}
            className={cn('flow-node-handle shadow-sm')}
            style={{
              opacity: editable || (t === 'target' ? tgts : srcs).includes(p.id) ? 1 : 0,
              pointerEvents: editable ? 'auto' : 'none',
              boxSizing: 'border-box',
              width: 8,
              height: 8,
              minWidth: 8,
              minHeight: 8,
              maxWidth: 8,
              maxHeight: 8,
              border: '2px solid #000',
              borderRadius: 0,
              background: '#000',
            }}
          />
        )),
      )}
    </ErrorBoundary>
  );
}

/**
 * Renders the compact skeleton card used while a flow is resolving.
 *
 * @param as - HTML element used as the skeleton card root, defaulting to a `div`.
 * @param className - Additional classes merged with the skeleton presentation.
 * @param style - Inline styles that override default dimensions and colors.
 * @param htmlAttrs - Native attributes forwarded to the selected element, including accessibility labels and handlers.
 *
 * @return The loading skeleton card.
 */
export function SkeletonCard<T extends ElementType = 'div'>({
  as = 'div' as T,
  className,
  style,
  ...htmlAttrs
}: { as?: T; className?: string } & Omit<
  ComponentPropsWithoutRef<T>,
  'as' | 'className' | 'children'
>): JSX.Element {
  const Element = as as ElementType;
  return (
    <ErrorBoundary name="SkeletonCard">
      <Element
        {...htmlAttrs}
        className={cn(
          'relative flex h-16 items-center justify-center overflow-visible rounded-md border-2 px-3 py-2 shadow-sm',
          className,
        )}
        style={{
          backgroundColor: '#eaf8f9',
          borderColor: '#16899d',
          width: 208,
          ...style,
        }}
      >
        <div
          className="absolute left-1/2 top-0 z-10 h-2 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm"
          style={{ backgroundColor: '#f7ffff', borderColor: '#16899d' }}
        />
        <div className="flex w-full animate-pulse flex-col items-center gap-2">
          <div className="h-4 w-[92%] rounded-md" style={{ backgroundColor: '#5db9c6' }} />
          <div className="mr-2 h-2.5 w-20 rounded-md" style={{ backgroundColor: '#91d3db' }} />
        </div>
      </Element>
    </ErrorBoundary>
  );
}

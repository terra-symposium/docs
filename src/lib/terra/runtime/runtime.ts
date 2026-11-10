/**
 * src/lib/terra/runtime/runtime.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { cn as stylingCn } from '@terra-symposium/styling/ui';
import { getDocsHostAdapter } from '../../host-runtime.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export const cn = stylingCn;
/**
 * Narrows a non-array object to the record shape used for host payload inspection.
 * @param value Unknown input to inspect.
 * @returns Whether it is a non-null, non-array object.
 */
export const isRec = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
/**
 * Narrows unknown input to a string without coercing other values.
 * @param value Unknown input to inspect.
 * @returns Whether the input is a string.
 */
export const isString = (value: unknown): value is string => typeof value === 'string';
/**
 * Narrows unknown input to a finite number accepted by Docs metadata.
 * @param value Unknown input to inspect.
 * @returns Whether it is a finite number.
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
/**
 * Checks an input's JavaScript type against an allowed list.
 * @param types Allowed JavaScript type names.
 * @param value Value whose type is checked.
 * @returns Whether its type appears in `types`.
 */
export const validateType = (types: readonly string[], value: unknown): boolean =>
  types.includes(typeof value);
/**
 * Writes a tagged diagnostic to the browser console without changing control flow.
 * @param tag Subsystem label.
 * @param message Diagnostic text.
 * @param detail Optional structured context.
 * @returns Nothing.
 */
export const warn = (tag: string, message: string, detail?: unknown): void =>
  console.warn(`[${tag}] ${message}`, detail ?? '');
/**
 * Writes a tagged error diagnostic to the browser console without swallowing the error.
 * @param tag Subsystem label.
 * @param message Error text.
 * @param detail Optional structured context.
 * @returns Nothing.
 */
export const logErr = (tag: string, message: string, detail?: unknown): void =>
  console.error(`[${tag}] ${message}`, detail ?? '');
/**
 * Extracts a useful message from common thrown values or falls back to caller text.
 * @param reason Thrown value or host error record.
 * @param fallback Message used when no readable error text exists.
 * @returns The extracted or fallback message.
 */
export const errorMessage = (reason: unknown, fallback: string): string =>
  reason instanceof Error
    ? reason.message
    : isRec(reason) && typeof reason.message === 'string'
      ? reason.message
      : fallback;
/**
 * Creates a debug logger scoped to one subsystem and enabled by the caller's trace flag.
 * @param scope Prefix included in debug output.
 * @param enabled Whether calls emit logs.
 * @returns A logger that accepts an event and optional details.
 */
export const createTrace =
  (scope: string, enabled: boolean) =>
  (event: string, detail?: unknown): void => {
    if (enabled) console.debug(`[${scope}] ${event}`, detail ?? '');
  };
/**
 * Dispatches the shared Docs error-notification event when a browser document is available.
 * @param reason Error passed by the failed operation.
 * @param fallback User-facing message when the reason is not an Error.
 * @returns Nothing; dispatches `docs:notify` only in a browser document.
 */
export const notify = ({ error: reason, fallback }: { error: unknown; fallback: string }): void => {
  if (typeof document !== 'undefined')
    document.dispatchEvent(
      new CustomEvent('docs:notify', {
        detail: { message: reason instanceof Error ? reason.message : fallback, variant: 'error' },
      }),
    );
};
/**
 * Produces a lowercase route-safe ID while preserving letters, digits, underscores, and hyphens.
 * @param value Source label or identifier.
 * @returns Trimmed lowercase ID with unsupported characters replaced by hyphens.
 */
export const canonicalId = (value: string): string =>
  value
    .trim()
    .replace(/[^a-z0-9_-]/gi, '-')
    .toLowerCase();
/**
 * Retains the graph type for call sites whose graph payload already has a validated shape.
 * @param graph Graph value already validated by the caller.
 * @returns The same graph reference and type.
 */
export const normArcGraph = <T>(graph: T): T => graph;
/** Minimal node fields inspected when filtering graph edges for visible nodes. */
type ArcNode = Record<string, unknown> & { _key?: string; hidden?: boolean; type?: string };
/** Minimal edge fields used to validate graph connections. */
type ArcEdge = Record<string, unknown> & { _key?: string; source?: string; target?: string };
/**
 * Reports whether the document root currently carries Styling's dark theme class.
 * @returns `true` when `document.documentElement` has the `dark` class.
 */
export const isDarkMode = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Drops edges with missing endpoints and connects unconnected content nodes to a terminal node.
 *
 * @param graph Untrusted graph payload containing optional node and edge arrays.
 *
 * @return Edges whose source and target remain visible, including generated terminal connections.
 */
export function resolvedEdges(graph: unknown): ArcEdge[] {
  const record = isRec(graph) ? graph : {};
  const nodes: ArcNode[] = Array.isArray(record.nodes)
    ? record.nodes.filter((n): n is ArcNode => isRec(n) && !n.hidden)
    : [];
  const keys = new Set(nodes.flatMap((n) => (typeof n._key === 'string' ? [n._key] : [])));
  const edges: ArcEdge[] = (Array.isArray(record.edges) ? record.edges : []).filter(
    (e): e is ArcEdge =>
      isRec(e) &&
      typeof e.source === 'string' &&
      typeof e.target === 'string' &&
      keys.has(e.source) &&
      keys.has(e.target),
  );
  const terminalKey = nodes.find((n) => n.type === 'terminal')?._key;
  if (typeof terminalKey !== 'string') return edges;
  return [
    ...edges,
    ...nodes.flatMap((n) => {
      if (
        n.type !== 'content' ||
        typeof n._key !== 'string' ||
        edges.some((edge) => edge.source === n._key)
      )
        return [];
      return [
        {
          _key: `terminal:${n._key}`,
          _type: 'edge',
          source: n._key,
          target: terminalKey as string,
        },
      ];
    }),
  ];
}

/**
 * Sets the browser title using the active host's site title as its suffix.
 *
 * @param title Current document title, or an empty string for the host title alone.
 */
export function setDocumentTitle(title: string): void {
  const siteTitle = getDocsHostAdapter()?.siteTitle ?? 'Terra Symposium';
  document.title = title ? `${title} | ${siteTitle}` : siteTitle;
}

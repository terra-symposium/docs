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
 * Narrows host values to non-array records used by the workspace model.
 *
 * @param value Candidate value from a host or serialized document.
 *
 * @return Whether the value can be read as a string-keyed object.
 */
export const isRec = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
/**
 * Tests a value's primitive type without coercion.
 *
 * @param value Value to inspect.
 *
 * @return Whether JavaScript reports the value as a string.
 */
export const isString = (value: unknown): value is string => typeof value === 'string';
/**
 * Tests whether a value is a finite JavaScript number.
 *
 * @param value Value to inspect.
 *
 * @return Whether the value is not `NaN` or either infinity.
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
/**
 * Checks a primitive value against a list of `typeof` results.
 *
 * @param types Allowed results from JavaScript's `typeof` operator.
 * @param value Value to inspect.
 *
 * @return Whether `typeof value` occurs in `types`.
 */
export const validateType = (types: readonly string[], value: unknown): boolean =>
  types.includes(typeof value);
/**
 * Writes a tagged warning to the browser or server console.
 *
 * @param tag Subsystem label included in the message prefix.
 * @param message Short explanation for the warning.
 * @param detail Optional diagnostic value printed after the message.
 *
 * @returns No value; the warning is written to the console.
 */
export const warn = (tag: string, message: string, detail?: unknown): void =>
  console.warn(`[${tag}] ${message}`, detail ?? '');
/**
 * Writes a tagged error to the browser or server console.
 *
 * @param tag Subsystem label included in the message prefix.
 * @param message Short explanation for the error.
 * @param detail Optional diagnostic value printed after the message.
 *
 * @returns No value; the error is written to the console.
 */
export const logErr = (tag: string, message: string, detail?: unknown): void =>
  console.error(`[${tag}] ${message}`, detail ?? '');
/**
 * Extracts a readable message from a thrown value or uses the caller's fallback.
 *
 * @param reason Thrown value or host error record.
 * @param fallback Message used when the thrown value has no readable message.
 *
 * @return The extracted message or fallback text.
 */
export const errorMessage = (reason: unknown, fallback: string): string =>
  reason instanceof Error
    ? reason.message
    : isRec(reason) && typeof reason.message === 'string'
      ? reason.message
      : fallback;
/** Creates a trace function that emits events only when its scope is enabled.
 *
 * @param scope Prefix identifying the traced subsystem.
 * @param enabled Whether calls to the returned function should log.
 *
 * @return A callback that writes an event and optional detail to `console.debug`.
 */
export const createTrace =
  (scope: string, enabled: boolean) =>
  (event: string, detail?: unknown): void => {
    if (enabled) console.debug(`[${scope}] ${event}`, detail ?? '');
  };
/**
 * Dispatches the workspace error notification when a browser document is available.
 *
 * @param err Failure value supplied by the notification caller.
 * @param fallback User-facing message for non-Error failures.
 */
export const notify = ({ error: err, fallback }: { error: unknown; fallback: string }): void => {
  if (typeof document !== 'undefined')
    document.dispatchEvent(
      new CustomEvent('docs:notify', {
        detail: { message: err instanceof Error ? err.message : fallback, variant: 'error' },
      }),
    );
};
/**
 * Normalizes an identifier for use in routes and DOM-facing keys.
 *
 * @param value Source identifier.
 *
 * @return Lowercase identifier with unsupported runs replaced by hyphens.
 */
export const canonicalId = (value: string): string =>
  value
    .trim()
    .replace(/[^a-z0-9_-]/gi, '-')
    .toLowerCase();
/**
 * Retains the graph-normalization API while preserving the graph value unchanged.
 *
 * @param graph Graph value supplied by the host.
 *
 * @return The same value and inferred type, unchanged.
 */
export const normArcGraph = <T>(graph: T): T => graph;
/** Graph node fields used when filtering edges for rendering. */
type ArcNode = Record<string, unknown> & { _key?: string; hidden?: boolean; type?: string };
/** Graph edge fields required to connect two visible nodes. */
type ArcEdge = Record<string, unknown> & { _key?: string; source?: string; target?: string };
/**
 * Reports whether the current Docs document uses the shared dark theme.
 *
 * @return Whether the root HTML element has the `dark` class in a browser context.
 */
export const isDarkMode = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Filters invalid links and connects unlinked content nodes to a terminal node.
 *
 * @param graph Untrusted graph payload from Docs content.
 *
 * @return Edges whose endpoints are visible nodes, plus synthesized terminal links.
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
 * Sets the tab title using the host-provided site name when available.
 *
 * @param title Current document title, without the site suffix.
 */
export function setDocumentTitle(title: string): void {
  const siteTitle = getDocsHostAdapter()?.siteTitle ?? 'Terra Symposium';
  document.title = title ? `${title} | ${siteTitle}` : siteTitle;
}

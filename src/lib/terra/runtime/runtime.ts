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
 * Checks whether a value is a non-array object.
 *
 * @param value Candidate value to narrow.
 *
 * @return Whether the value is a record.
 */
export const isRec = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
/**
 * Checks whether a value is a string.
 *
 * @param value Candidate value to inspect.
 *
 * @return Whether the value is a string.
 */
export const isString = (value: unknown): value is string => typeof value === 'string';
/**
 * Checks whether a value is a finite number.
 *
 * @param value Candidate value to inspect.
 *
 * @return Whether the value is a finite number.
 */
export const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
/**
 * Checks whether a value's JavaScript type is listed in the accepted types.
 *
 * @param types Accepted JavaScript type names.
 * @param value Candidate value to inspect.
 *
 * @return Whether the value's type is listed.
 */
export const validateType = (types: readonly string[], value: unknown): boolean => types.includes(typeof value);
/**
 * Writes a tagged warning and optional detail to the browser console.
 *
 * @param tag Category displayed with the warning.
 * @param message Warning text.
 * @param detail Optional structured detail to log.
 *
 * @return Nothing.
 */
export const warn = (tag: string, message: string, detail?: unknown): void => console.warn(`[${tag}] ${message}`, detail ?? '');
/**
 * Writes an error-level message with the Docs runtime tag.
 * @param tag - Category displayed with the error.
 * @param message - Error text.
 * @param detail - Optional structured detail to log.
 * @return Nothing.
 */
export const error = (tag: string, message: string, detail?: unknown): void => console.warn(`[${tag}] ${message}`, detail ?? '');
/**
 * Preserves the legacy named logger while sharing the runtime warning format.
 * @param tag - Category displayed with the message.
 * @param message - Message text.
 * @param detail - Optional structured detail to log.
 * @return Nothing.
 */
export const errorLog = (tag: string, message: string, detail?: unknown): void => warn(tag, message, detail);
/**
 * Creates a scoped debug logger that emits only when enabled.
 *
 * @param scope Prefix attached to each event.
 * @param enabled Whether debug output is enabled.
 *
 * @return A logger for events in the scope.
 */
export const createTrace =
	(scope: string, enabled: boolean) =>
	(event: string, detail?: unknown): void => {
		if (enabled) console.debug(`[${scope}] ${event}`, detail ?? '');
	};
/**
 * Dispatches an error notification event for the active Docs UI.
 *
 * @param reason Error whose message should be shown.
 * @param fallback Message used when the error is not an Error instance.
 *
 * @return Nothing.
 */
export const notify = ({ error: reason, fallback }: { error: unknown; fallback: string }): void => {
	if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('docs:notify', { detail: { message: reason instanceof Error ? reason.message : fallback, variant: 'error' } }));
};
/**
 * Converts an identifier to lowercase kebab-like form for stable route keys.
 *
 * @param value Identifier to normalize.
 *
 * @return Normalized identifier.
 */
export const canonicalId = (value: string): string =>
	value
		.trim()
		.replace(/[^a-z0-9_-]/gi, '-')
		.toLowerCase();
// terra-quality-ignore single-use -- Keep the exported normArcGraph module value available to external consumers; its one local reference does not replace that contract.
/**
 * Returns an arc graph unchanged for generic graph normalization call sites.
 *
 * @param graph Graph to preserve.
 *
 * @return The same graph value.
 */
export const normArcGraph = <T>(graph: T): T => graph;
/** Minimal node fields used while resolving visible arc edges. */
type ArcNode = Record<string, unknown> & { _key?: string; hidden?: boolean; type?: string };
/** Minimal edge fields used while validating graph connections. */
type ArcEdge = Record<string, unknown> & { _key?: string; source?: string; target?: string };
/**
 * Checks whether the document root currently has dark mode enabled.
 *
 * @return Whether the document root has the dark class.
 */
export const isDarkMode = (): boolean => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

// terra-quality-ignore single-use -- Keep the exported isDevOrigin callable API available to external consumers; its one local reference does not replace that contract.
/**
 * Determines whether a URL belongs to a local development origin.
 *
 * @param value URL or URL string to inspect.
 *
 * @return Whether the origin is localhost, loopback, or host-approved for development.
 */
export function isDevOrigin(value: string | URL): boolean {
	const hostCheck = getDocsHostAdapter()?.isDevelopmentOrigin;
	if (hostCheck) return hostCheck(String(value));
	try {
		const host = new URL(value).hostname;
		return host === 'localhost' || host === '127.0.0.1' || host === '::1';
	} catch {
		return false;
	}
}

// terra-quality-ignore single-use -- Keep the exported resolvedEdges callable API available to external consumers; its one local reference does not replace that contract.
/**
 * Removes hidden nodes and invalid edges, then links disconnected content to the terminal node.
 *
 * @param graph Candidate graph value to validate.
 *
 * @return Edges that connect visible nodes, including generated terminal links.
 */
export function resolvedEdges(graph: unknown): ArcEdge[] {
	const record = isRec(graph) ? graph : {};
	const nodes: ArcNode[] = Array.isArray(record.nodes) ? record.nodes.filter((n): n is ArcNode => isRec(n) && !n.hidden) : [];
	const keys = new Set(nodes.flatMap(n => (typeof n._key === 'string' ? [n._key] : [])));
	const edges: ArcEdge[] = (Array.isArray(record.edges) ? record.edges : []).filter(
		(e): e is ArcEdge => isRec(e) && typeof e.source === 'string' && typeof e.target === 'string' && keys.has(e.source) && keys.has(e.target),
	);
	const terminalKey = nodes.find(n => n.type === 'terminal')?._key;
	if (typeof terminalKey !== 'string') return edges;
	const sources = new Set(edges.flatMap(e => (e.source ? [e.source] : [])));
	return [
		...edges,
		...nodes.flatMap(n => {
			if (n.type !== 'content' || typeof n._key !== 'string' || sources.has(n._key)) return [];
			return [{ _key: `terminal:${n._key}`, _type: 'edge', source: n._key, target: terminalKey }];
		}),
	];
}

/**
 * Sets the browser title with the configured Terra site title as a suffix.
 *
 * @param title Page title to display, or an empty string for the site title alone.
 */
export function setDocumentTitle(title: string): void {
	const siteTitle = getDocsHostAdapter()?.siteTitle ?? 'Terra Symposium';
	document.title = title ? `${title} | ${siteTitle}` : siteTitle;
}

import { cn as stylingCn } from '@terra-symposium/styling/ui';
import { getDocsHostAdapter } from '../../host-runtime.js';

export const cn = stylingCn;
export const isRec = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
export const validateType = (types: readonly string[], value: unknown): boolean =>
  types.includes(typeof value);
export const warn = (tag: string, message: string, detail?: unknown): void =>
  console.warn(`[${tag}] ${message}`, detail ?? '');
export const logErr = (tag: string, message: string, detail?: unknown): void =>
  console.error(`[${tag}] ${message}`, detail ?? '');
export const createTrace =
  (scope: string, enabled: boolean) =>
  (event: string, detail?: unknown): void => {
    if (enabled) console.debug(`[${scope}] ${event}`, detail ?? '');
  };
export const notify = ({ error: reason, fallback }: { error: unknown; fallback: string }): void => {
  if (typeof document !== 'undefined')
    document.dispatchEvent(
      new CustomEvent('docs:notify', {
        detail: { message: reason instanceof Error ? reason.message : fallback, variant: 'error' },
      }),
    );
};
export const canonicalId = (value: string): string =>
  value
    .trim()
    .replace(/[^a-z0-9_-]/gi, '-')
    .toLowerCase();
export const normArcGraph = <T>(graph: T): T => graph;
type ArcNode = Record<string, unknown> & { _key?: string; hidden?: boolean; type?: string };
type ArcEdge = Record<string, unknown> & { _key?: string; source?: string; target?: string };

export function resolvedEdges(graph: unknown): ArcEdge[] {
  const record = isRec(graph) ? graph : {};
  const nodes: ArcNode[] = Array.isArray(record.nodes)
    ? record.nodes.filter((node): node is ArcNode => isRec(node) && !node.hidden)
    : [];
  const keys = new Set(nodes.flatMap((node) => (typeof node._key === 'string' ? [node._key] : [])));
  const edges: ArcEdge[] = (Array.isArray(record.edges) ? record.edges : []).filter(
    (edge): edge is ArcEdge =>
      isRec(edge) &&
      typeof edge.source === 'string' &&
      typeof edge.target === 'string' &&
      keys.has(edge.source) &&
      keys.has(edge.target),
  );
  const terminalKey = nodes.find((node) => node.type === 'terminal')?._key;
  if (typeof terminalKey !== 'string') return edges;
  return [
    ...edges,
    ...nodes.flatMap((node) => {
      if (
        node.type !== 'content' ||
        typeof node._key !== 'string' ||
        edges.some((edge) => edge.source === node._key)
      )
        return [];
      return [
        {
          _key: `terminal:${node._key}`,
          _type: 'edge',
          source: node._key,
          target: terminalKey as string,
        },
      ];
    }),
  ];
}
export function setDocumentTitle(title: string): void {
  const siteTitle = getDocsHostAdapter()?.siteTitle ?? 'Terra Symposium';
  document.title = title ? `${title} | ${siteTitle}` : siteTitle;
}
export const isDarkMode = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

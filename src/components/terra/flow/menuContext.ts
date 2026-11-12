/**
 * src/components/terra/flow/menuContext.ts
 */

/** Context-menu target and its optional node or edge identifier. */
export type FlowMenuContext = { type: 'pane' | '_node' | 'e'; id: string | null };

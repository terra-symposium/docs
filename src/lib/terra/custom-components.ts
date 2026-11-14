/**
 * src/lib/terra/custom-components.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { DocsCustomBlock } from '../host.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Mutated in place by a host before the workspace renders. */
export const components: DocsCustomBlock[] = [];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

// terra-quality-ignore single-use -- Keep the exported setDocsCustomComponents callable API available to external consumers; its one local reference does not replace that contract.
/**
 * Replaces the custom block renderers registered by the current host.
 *
 * @param n Host-provided Portable Text block definitions.
 *
 * @return Nothing.
 */
export function setDocsCustomComponents(n: DocsCustomBlock[]): void {
	components.splice(0, components.length, ...n);
}

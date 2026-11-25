/**
 * src/lib/host-runtime.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { configureDocsActionProxy } from './terra/runtime/action-proxy.js';
import { setDocsCustomComponents } from './terra/custom-components.js';

// TYPES
import type { DocsActionOperation, DocsActionResult, DocsCustomBlock, DocsHostAdapter } from './host.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Returns the currently configured host adapter, if one has been installed.
 *
 * @return Active host adapter, or `undefined` before configuration.
 */
export function getDocsHostAdapter(): DocsHostAdapter | undefined {
	return aHost;
}

/**
 * Installs host-owned storage, permissions, custom blocks, and action handling.
 *
 * @param host Adapter that supplies routes, capabilities, and storage operations.
 * @param customBlocks Optional host-defined Portable Text block renderers.
 *
 * @return Nothing.
 */
export function configureDocsHost(host: DocsHostAdapter, customBlocks: DocsCustomBlock[] = []): void {
	aHost = host;
	setDocsCustomComponents(customBlocks);
	configureDocsActionProxy(async <T>(o: DocsActionOperation, i?: unknown): Promise<DocsActionResult<T>> => {
		if (o.startsWith('write.') && !host.capabilities.write) return { error: new Error('This Docs instance is read-only.') };
		if (o.startsWith('write.attachment.') && !host.capabilities.attachments) return { error: new Error('Attachment changes are disabled for this Docs instance.') };
		if (o.startsWith('write.doc.reorder') && !host.capabilities.reorder) return { error: new Error('Reordering is disabled for this Docs instance.') };
		if (o.includes('.versions.') && !host.capabilities.history) return { error: new Error('History is disabled for this Docs instance.') };
		return host.invoke<T>(o, i);
	});
}
let aHost: DocsHostAdapter | undefined;

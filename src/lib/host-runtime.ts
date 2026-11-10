/**
 * src/lib/host-runtime.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { actionProxy } from './terra/runtime/action-proxy.js';
import { components } from './terra/custom-components.js';

// TYPES
import type {
  DocsActionOperation,
  DocsActionResult,
  DocsCustomBlock,
  DocsHostAdapter,
} from './host.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Returns the host adapter currently used by shared Docs components.
 *
 * @returns The adapter installed by `configureDocsHost`, or `undefined` before the host mounts Docs.
 */
export function getDocsHostAdapter(): DocsHostAdapter | undefined {
  return aHost;
}

/**
 * Install host-owned storage and capability checks before mounting the Docs surface.
 *
 * @param host Storage, authorization, route, and capability implementation supplied by the consumer.
 * @param customBlocks Optional host-specific block renderers registered alongside shared blocks.
 *
 * @returns No value; replaces the active host adapter and custom component registry.
 */
export function configureDocsHost(
  host: DocsHostAdapter,
  customBlocks: DocsCustomBlock[] = [],
): void {
  aHost = host;
  components.splice(0, components.length, ...customBlocks);
  actionProxy.invoke = async <T>(
    op: DocsActionOperation,
    input?: unknown,
  ): Promise<DocsActionResult<T>> => {
    if (op.startsWith('write.') && !host.capabilities.write)
      return { error: new Error('This Docs instance is read-only.') };
    if (op.startsWith('write.attachment.') && !host.capabilities.attachments)
      return { error: new Error('Attachment changes are disabled for this Docs instance.') };
    if (op.startsWith('write.doc.reorder') && !host.capabilities.reorder)
      return { error: new Error('Reordering is disabled for this Docs instance.') };
    if (op.includes('.versions.') && !host.capabilities.history)
      return { error: new Error('History is disabled for this Docs instance.') };
    return host.invoke<T>(op, input);
  };
}
let aHost: DocsHostAdapter | undefined;

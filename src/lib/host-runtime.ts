import { actionProxy } from './terra/runtime/action-proxy.js';
import { components } from './terra/custom-components.js';
import type {
  DocsActionOperation,
  DocsActionResult,
  DocsCustomBlock,
  DocsHostAdapter,
} from './host.js';

let aHost: DocsHostAdapter | undefined;

export function getDocsHostAdapter(): DocsHostAdapter | undefined {
  return aHost;
}

/** Install host-owned storage and capability checks before mounting the Docs surface. */
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

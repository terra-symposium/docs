/**
 * src/lib/terra/runtime/action-proxy.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { DocsActionOperation, DocsActionResult } from '../../host.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Callable proxy that also exposes nested host actions through property access. */
type ActionProxy = ((...args: unknown[]) => Promise<DocsActionResult<unknown>>) & {
	[key: string]: ActionProxy;
};
/** Single host action call with an optional input payload. */
type ActionCall<T> = (input?: unknown) => Promise<DocsActionResult<T>>;

/** Internal compatibility bridge for the original UI's nested host-action calls. */
export const actions = action('') as unknown as {
	read: {
		asset: {
			get: ActionCall<ArrayBuffer>;
		};
		doc: {
			attachments: ActionCall<unknown[]>;
			get: ActionCall<Record<string, unknown>>;
			list: ActionCall<string[]>;
		};
		external: {
			pdf: ActionCall<{
				pdfBase64?: string;
			}>;
			youtube: ActionCall<{
				title?: unknown;
				transcript?: unknown;
			}>;
		};
		tsdocs: ActionCall<{
			docs?: unknown;
		}>;
		util: {
			pathname: ActionCall<string>;
		};
	};
	write: {
		asset: {
			upload: ActionCall<{
				message?: unknown;
				path?: string;
				src?: string;
				compressedSize?: number;
				name?: string;
			}>;
		};
	};
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

// terra-quality-ignore single-use -- Keep the exported configureDocsActionProxy callable API available to external consumers; its one local reference does not replace that contract.
/**
 * Installs the host invocation function used by nested Docs action calls.
 *
 * @param handler Host operation dispatcher and its result mapper.
 *
 * @return Nothing.
 */
export function configureDocsActionProxy(handler: <T = unknown>(op: DocsActionOperation, input?: unknown) => Promise<DocsActionResult<T>>): void {
	invoke = handler;
}

/**
 *
 * @param path
 *
 * @return
 */
function action(path: string): ActionProxy {
	return new Proxy(((...args: unknown[]) => invoke(path as DocsActionOperation, args[0])) as ActionProxy, {
		get(_target, key) {
			if (typeof key !== 'string') return undefined;
			return action(path ? `${path}.${key}` : key);
		},
	});
}
let invoke: <T = unknown>(op: DocsActionOperation, input?: unknown) => Promise<DocsActionResult<T>> = async op => ({
	error: new Error(`Docs host action is not configured: ${op}`),
});

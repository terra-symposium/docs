/**
 * src/lib/terra/runtime/action-proxy.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { DocBody, DocVer, Md, Sister, Tree } from './types.js';
import type {
  DocsActionOperation,
  DocsActionResult,
  DocsHostAttachment,
  DocsHostDocument,
} from '../../host.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export const actionProxy = {
  invoke: async <T = unknown>(
    o: DocsActionOperation,
    i?: unknown,
  ): Promise<DocsActionResult<T>> => {
    void i;
    return { error: new Error(`Docs host action is not configured: ${o}`) };
  },
};
const actionPath: unique symbol = Symbol('docsActionPath');
/** Dynamic action handle whose property accesses build a dotted host operation path. */
type ActionProxy = ((...args: unknown[]) => Promise<DocsActionResult<unknown>>) & {
  [key: string]: ActionProxy;
  [actionPath]: string;
};
/** Callable leaf in the dynamic proxy, with the result type expected by its consumer. */
type ActionCall<T> = (input?: unknown) => Promise<DocsActionResult<T>>;
/** Accepted identifier fields returned by legacy save operations. */
type WriteResult = { _id?: string; id?: string; path?: string; title?: string };
/** Legacy attachment result shape accepted by the Docs host adapter. */
type AttachmentResult = DocsHostAttachment & { id?: string; title?: string; type?: string };
/** Internal compatibility bridge for the original UI's nested host-action calls. */
export const actions = new Proxy(
  Object.assign(
    /**
     * Invokes the root action path when a caller uses the proxy as a function.
     * @param a Arguments passed to the root proxy invocation.
     * @returns The host action result for the root operation.
     */
    function callable(...a: unknown[]) {
      return actionProxy.invoke('' as DocsActionOperation, a[0]);
    },
    { [actionPath]: '' },
  ) as ActionProxy,
  {
    /**
     * Extends the current operation path for each property access.
     * @param this Proxy handler used as the handler for the next nested proxy.
     * @param target Proxy function whose current action path is extended.
     * @param key Property name appended to that path.
     * @returns A nested callable proxy for the extended action path.
     */
    get(this: ProxyHandler<ActionProxy>, target, key) {
      if (typeof key !== 'string') return undefined;
      const path = target[actionPath] ? `${target[actionPath]}.${key}` : key;
      return new Proxy(
        Object.assign(
          /**
           * Invokes the host action at the property path built by the proxy chain.
           * @param a Arguments passed to this nested action proxy.
           * @returns The result returned by the configured host action adapter.
           */
          function callable(...a: unknown[]) {
            return actionProxy.invoke(path as DocsActionOperation, a[0]);
          },
          { [actionPath]: path },
        ) as ActionProxy,
        this,
      );
    },
  },
) as unknown as {
  read: {
    asset: { get: ActionCall<ArrayBuffer> };
    doc: {
      attachments: ActionCall<Sister[]>;
      get: ActionCall<
        | (Md & { title: string; source?: string; content?: string | DocBody | null })
        | DocsHostDocument
        | null
      >;
      list: {
        (input: {
          type: 'nav';
          pathname: string;
          full?: boolean;
        }): Promise<DocsActionResult<Tree[]>>;
        (input: { type: 'folderEntries'; path: string }): Promise<DocsActionResult<string[]>>;
        (input?: Record<string, unknown>): Promise<DocsActionResult<Tree[] | string[]>>;
      };
      resolvePath: ActionCall<{ path: string; dir?: string }>;
    };
    external: {
      pdf: ActionCall<{ pdfBase64?: string }>;
      website: ActionCall<{
        description?: string;
        source?: string;
        text?: string;
        title?: string;
        url?: string;
      }>;
      youtube: ActionCall<{ title?: string; transcript?: string; description?: string }>;
    };
    source: { body: ActionCall<DocBody> };
    tsdocs: ActionCall<{
      docs?: Array<{ slug: string; title: string; body: string }>;
      scopes?: Array<{ path: string; type: 'folder' | 'file' }>;
    }>;
    util: {
      node: {
        (input: { op: 'name'; val: string }): Promise<DocsActionResult<string>>;
        (
          input: Record<string, unknown>,
        ): Promise<DocsActionResult<{ title?: string; origName?: string; type?: string } | null>>;
      };
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
      delete: ActionCall<unknown>;
      raw: ActionCall<unknown>;
    };
    attachment: {
      add: ActionCall<AttachmentResult>;
      docRef: ActionCall<AttachmentResult>;
      link: ActionCall<AttachmentResult>;
      move: ActionCall<AttachmentResult>;
      remoteFile: ActionCall<AttachmentResult>;
      rename: ActionCall<AttachmentResult>;
      rm: ActionCall<unknown>;
      youtube: ActionCall<AttachmentResult>;
    };
    doc: {
      asset: ActionCall<unknown>;
      commit: ActionCall<Md | WriteResult>;
      createGroup: ActionCall<WriteResult>;
      createSection: ActionCall<WriteResult>;
      editor: ActionCall<Md | WriteResult>;
      hue: ActionCall<unknown>;
      reorder: ActionCall<unknown>;
      retitle: ActionCall<unknown>;
      retargetSources: ActionCall<boolean>;
      rm: ActionCall<unknown>;
      save: ActionCall<Md | WriteResult>;
      versions: { get: ActionCall<DocVer[]> };
    };
  };
};

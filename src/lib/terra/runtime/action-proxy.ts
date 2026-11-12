/**
 * src/lib/terra/runtime/action-proxy.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type {
  DocsActionOperation,
  DocsActionResult,
  DocsHostAttachment,
  DocsHostDocument,
  DocsHostTreeNode,
} from '../../host.js';
import type { DocBody, DocVer, Md, Sister, Tree } from './types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Placeholder action handler replaced when a host configures the Docs surface. */
export const actionProxy = {
  invoke: async <T = unknown>(
    o: DocsActionOperation,
    i?: unknown,
  ): Promise<DocsActionResult<T>> => {
    // Keep the host-operation signature even before a real adapter is configured.
    void i;
    return { error: new Error(`Docs host action is not configured: ${o}`) };
  },
};

/** Calls one named host operation with its documented request and response shape. */
type ActionCall<TInput, TOutput> = (input: TInput) => Promise<DocsActionResult<TOutput>>;

/** List modes used by the navigation tree and by attachment inventory. */
type DocListInput =
  | { type: 'nav'; pathname: string; full?: boolean; edit?: boolean }
  | { type: 'folderEntries'; path: string };

/** Result of creating a reference from another document. */
type AttachmentResult = Partial<DocsHostAttachment> & {
  id?: string;
  title?: string;
  sourceUrl?: string;
  type?: string;
};

/** Metadata written when Docs creates or updates a document. */
type WrittenDocument = DocsHostDocument & { _id?: string; _type?: string };

/** Symbol used by nested action proxies to retain their accumulated path. */
const actionPath: unique symbol = Symbol('docsActionPath');
/** Function-like proxy whose properties extend the host operation path. */
type ActionProxy = ((...args: unknown[]) => Promise<DocsActionResult<unknown>>) & {
  [key: string]: ActionProxy;
  [actionPath]: string;
};

/** Public nested action paths retained for compatibility with legacy Docs callers. */
export const actions = new Proxy(
  Object.assign(
    /**
     * Forwards a root-level action call to the configured host adapter.
     *
     * @param a - Positional arguments supplied by the legacy UI; the first value is the host payload.
     *
     * @returns The result from the configured host adapter, or an error when no adapter exists.
     */
    function callable(...a: unknown[]) {
      return actionProxy.invoke('' as DocsActionOperation, a[0]);
    },
    { [actionPath]: '' },
  ) as ActionProxy,
  {
    /**
     * Builds a nested action path when consumers access an operation property.
     *
     * @param this - Proxy handler reused by nested proxies to keep extending the same operation path.
     * @param target - Action proxy whose accumulated operation path is extended.
     * @param key - Property name appended to that path; symbol properties are not proxied.
     *
     * @returns A nested action proxy for string properties, or `undefined` for symbols.
     */
    get(this: ProxyHandler<ActionProxy>, target, key) {
      if (typeof key !== 'string') return undefined;
      const path = target[actionPath] ? `${target[actionPath]}.${key}` : key;
      return new Proxy(
        Object.assign(
          /**
           * Invokes the host action represented by this accumulated property path.
           *
           * @param a - Positional arguments supplied by the legacy UI; the first value is the host payload.
           *
           * @returns The result from the configured host adapter, or an error when no adapter exists.
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
    asset: { get: ActionCall<{ path: string }, ArrayBuffer> };
    doc: {
      attachments: ActionCall<
        { path: string } | { paths: string[] },
        DocsHostAttachment[] | Sister[] | Record<string, DocsHostAttachment[] | Sister[]>
      >;
      get: ActionCall<
        { access?: unknown; id?: string; path?: string; pathname?: string },
        WrittenDocument | Md | null
      >;
      list: {
        (
          input: Extract<DocListInput, { type: 'nav' }>,
        ): Promise<DocsActionResult<DocsHostTreeNode[] | Tree[]>>;
        (
          input: Extract<DocListInput, { type: 'folderEntries' }>,
        ): Promise<DocsActionResult<string[]>>;
        (
          input: Record<string, unknown>,
        ): Promise<DocsActionResult<DocsHostTreeNode[] | Tree[] | string[]>>;
      };
      resolvePath: ActionCall<{ path: string; title?: string }, { dir: string; path: string }>;
    };
    external: {
      pdf: ActionCall<{ url: string }, { pdfBase64?: string }>;
      website: ActionCall<
        { url: string; description?: string; source?: string; text?: string; title?: string },
        { title: string; text: string }
      >;
      youtube: ActionCall<
        { url: string },
        { title?: string; transcript?: string; description?: string }
      >;
    };
    source: { body: ActionCall<{ source?: string }, DocBody> };
    tsdocs: ActionCall<
      { scope?: string },
      {
        docs?: { slug: string; title: string; body: string }[];
        scopes?: { path: string; type: 'folder' | 'file' }[];
      }
    >;
    util: {
      node: {
        (input: { op: 'name'; val: string }): Promise<DocsActionResult<string>>;
        (input: {
          op: 'fmt';
          val: string;
        }): Promise<DocsActionResult<{ title?: string; origName?: string; type?: string } | null>>;
      };
      pathname: ActionCall<{ path: string }, string>;
    };
  };
  write: {
    asset: {
      delete: ActionCall<{ url: string }, boolean>;
      raw: ActionCall<{ bytes: unknown; path: string }, boolean>;
      upload: ActionCall<
        FormData,
        { id?: string; path?: string; src?: string; compressedSize?: number; name?: string }
      >;
    };
    attachment: {
      add: ActionCall<{ files: Array<{ name: string }>; path: string }, unknown>;
      docRef: ActionCall<{ path: string; refId: string; title?: string }, AttachmentResult>;
      link: ActionCall<
        { path: string; url: string; type: string; title?: string },
        AttachmentResult
      >;
      move: ActionCall<
        { sourceDocPath: string; targetDocPath: string; attachmentKey: string },
        boolean | AttachmentResult
      >;
      remoteFile: ActionCall<
        { path: string; url: string; type: string; title?: string },
        AttachmentResult
      >;
      rename: ActionCall<
        { docPath: string; attachmentKey: string; newName: string },
        boolean | AttachmentResult
      >;
      rm: ActionCall<{ docPath: string; attachmentKey: string }, boolean>;
      youtube: ActionCall<{ path: string; url: string }, AttachmentResult>;
    };
    doc: {
      asset: ActionCall<
        { component: string; description?: string; path: string; title?: string },
        WrittenDocument
      >;
      commit: ActionCall<
        {
          content?: unknown[] | undefined;
          cur: string;
          next: string;
          source?: string | undefined;
          title?: string | undefined;
          description?: string | undefined;
        },
        WrittenDocument | Md | null
      >;
      createGroup: ActionCall<
        { title: string; path: string; sectionId: string },
        (DocsHostTreeNode | Tree) & { _id?: string }
      >;
      createSection: ActionCall<
        { title: string },
        | { group: WrittenDocument; leaf: WrittenDocument; section: WrittenDocument }
        | { _id?: string; id?: string; path?: string; title?: string }
      >;
      editor: ActionCall<
        {
          source?: string | undefined;
          description?: string | undefined;
          fmt?: boolean | undefined;
          path: string;
          title?: string | undefined;
          type?: string | undefined;
          sourceUrl?: string | undefined;
          parentId?: string | undefined;
        },
        WrittenDocument
      >;
      hue: ActionCall<{ id: string; hue: number }, boolean>;
      reorder: ActionCall<
        { id: string; field?: string; items: Array<Record<string, unknown>> },
        DocsHostTreeNode[] | null
      >;
      retargetSources: ActionCall<{ sourceIds: string[]; targetId: string }, boolean>;
      retitle: ActionCall<{ id: string; title: string }, boolean>;
      rm: ActionCall<{ assets?: boolean; path: string; type: 'asset' | 'doc' | 'folder' }, boolean>;
      save: ActionCall<
        {
          content?: unknown[] | undefined;
          source?: string | undefined;
          path: Record<string, string> | string | string[];
          src?: string | undefined;
          title?: string | undefined;
          description?: string | undefined;
          type?: string | undefined;
          sourceUrl?: string | undefined;
          parentId?: string | undefined;
        },
        WrittenDocument
      >;
      versions: { get: ActionCall<{ path: string }, DocVer[]> };
    };
  };
};

import type { DocsActionOperation, DocsActionResult } from '../../host.js';

export const actionProxy = {
  invoke: async <T = unknown>(
    op: DocsActionOperation,
    _input?: unknown,
  ): Promise<DocsActionResult<T>> => ({
    error: new Error(`Docs host action is not configured: ${op}`),
  }),
};

const actionPath: unique symbol = Symbol('docsActionPath');
type ActionProxy = ((...args: unknown[]) => Promise<DocsActionResult<unknown>>) & {
  [key: string]: ActionProxy;
  [actionPath]: string;
};
type ActionCall<T> = (input?: unknown) => Promise<DocsActionResult<T>>;

/** Internal compatibility bridge for the original UI's nested host-action calls. */
export const actions = new Proxy(
  Object.assign(
    function callable(...args: unknown[]) {
      return actionProxy.invoke('' as DocsActionOperation, args[0]);
    },
    { [actionPath]: '' },
  ) as ActionProxy,
  {
    get(this: ProxyHandler<ActionProxy>, target, key) {
      if (typeof key !== 'string') return undefined;
      const path = target[actionPath] ? `${target[actionPath]}.${key}` : key;
      return new Proxy(
        Object.assign(
          function callable(...args: unknown[]) {
            return actionProxy.invoke(path as DocsActionOperation, args[0]);
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
      attachments: ActionCall<unknown[]>;
      get: ActionCall<Record<string, unknown>>;
      list: ActionCall<string[]>;
    };
    external: {
      pdf: ActionCall<{ pdfBase64?: string }>;
      youtube: ActionCall<{ title?: unknown; transcript?: unknown }>;
    };
    tsdocs: ActionCall<{ docs?: unknown }>;
    util: { pathname: ActionCall<string> };
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

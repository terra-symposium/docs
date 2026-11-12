/**
 * src/components/EditorHarness.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { configureDocsHost } from '../lib/host-runtime.js';
import { useState } from 'react';

// COMPONENTS
import { ContentEditor } from './terra/editor/ContentEditor.js';
import { StrictMode } from 'react';

// TYPES
import type { DocsActionOperation, DocsHostAttachment } from '../lib/host.js';
import type { DocsBlockOptions } from './blocks.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Recursively copies a fixture value while preserving Portable Text type tags.
 * Browser fixtures use the copy to avoid mutating the window-owned test data.
 *
 * @param v - Fixture value to copy; arrays and record fields are traversed recursively.
 * @returns A detached value with its `_type` fields preserved.
 */
function mapContent(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(mapContent);
  if (!v || typeof v !== 'object') return v;
  const node = v as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(node).map(([k, e]) => [k, k === '_type' ? node._type : mapContent(e)]),
  );
}

/**
 * Mounts the editor with browser-provided fixture data and mock host actions.
 * When a persistence key is present, edits are saved to session storage so a
 * browser test can inspect the resulting content after interacting with it.
 *
 * @returns A themed editor harness for Docs component tests and previews.
 */
export default function EditorHarness(): JSX.Element {
  configureDocsHost({
    capabilities: {
      read: true,
      write: true,
      attachments: true,
      reorder: true,
      export: true,
      history: true,
      publish: true,
    },
    /**
     * Resolves a mocked host action and clones its configured response for the editor.
     *
     * @param op - Host operation whose test fixture response should be returned.
     * @param input - Optional operation input used to select a source-specific fixture value.
     * @returns The cloned response data or the configured error as an `Error` instance.
     */
    async invoke<T = unknown>(
      op: DocsActionOperation,
      input?: unknown,
    ): Promise<{ data?: T; error?: unknown }> {
      const mock = typeof window === 'undefined' ? undefined : window.__docsMockResponses?.[op];
      if (mock?.error) return { error: new Error(mock.error) };
      const inputKey =
        input && typeof input === 'object' && 'source' in input
          ? String((input as { source: unknown }).source)
          : '';
      return {
        data: mapContent(
          inputKey ? (mock?.dataByInput?.[inputKey] ?? mock?.data) : mock?.data,
        ) as T,
      };
    },
  });
  const [readOnly] = useState(() =>
    typeof window === 'undefined' ? false : (window.__contentOptions?.readOnly ?? false),
  );
  const [options] = useState(() =>
    typeof window === 'undefined' ? {} : (window.__contentOptions ?? {}),
  );
  const [content, setContent] = useState(() => {
    const saved = options.persistKey ? sessionStorage.getItem(options.persistKey) : null;
    if (saved) return JSON.parse(saved) as unknown[];
    return (
      (mapContent(
        typeof window === 'undefined' ? [] : (window.__contentFixture ?? []),
      ) as unknown[]) ?? []
    );
  });
  return (
    <StrictMode>
      <div className="docs-theme-scope">
        <main className="docs-workspace mx-auto min-h-svh max-w-5xl p-6">
          <ContentEditor
            content={content}
            {...(options.attachments ? { docsAttachments: options.attachments } : {})}
            {...(options.blocks ? { blocks: options.blocks } : {})}
            nested={options.nested ?? false}
            toolbar={options.toolbar ?? true}
            readOnly={readOnly}
            onChange={(v) => {
              setContent(v);
              if (options.persistKey) sessionStorage.setItem(options.persistKey, JSON.stringify(v));
            }}
          />
          <pre data-testid="editor-output" className="sr-only">
            {JSON.stringify(content)}
          </pre>
        </main>
      </div>
    </StrictMode>
  );
}
declare global {
  /** Values exposed by the editor browser harness to fixture pages and tests. */
  interface Window {
    __contentFixture?: unknown[];
    __contentOptions?: {
      attachments?: DocsHostAttachment[];
      blocks?: DocsBlockOptions;
      nested?: boolean;
      persistKey?: string;
      readOnly?: boolean;
      toolbar?: boolean;
    };
    __docsMockResponses?: Record<
      string,
      { data?: unknown; dataByInput?: Record<string, unknown>; error?: string }
    >;
  }
}

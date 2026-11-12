/**
 * src/components/terra/editor/docs/_DocsCode.tsx
 * Docs code block renderer with view and edit modes.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEditor } from '@portabletext/editor';
import { useEffect, useRef, useState } from 'react';
import { DOCS_LAYOUT_CLASSES } from '../../../../lib/terra/layout-classes.js';

// COMPONENTS
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@terra-symposium/styling/ui';
import { CodeBlock } from './_CodeBlock.js';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { BlockTgt } from '../../../../lib/terra/runtime/types.js';
import type {
  DocsBlock,
  PortableTextBlockEditorProps,
  PortableTextBlockRendererProps,
} from '../types.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Sanity Portable Text code-block fields used by the docs editor. */
type CodeBlockData = DocsBlock<'code'>;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a Docs code block from its authored block.
 *
 * @param block Authored code block containing source text, language, and optional endpoint.
 *
 * @return The authored code block and its preview.
 */
function Code({ block }: { block: CodeBlockData }): JSX.Element {
  return (
    <ErrorBoundary name="Code">
      <CodeBlock
        code={typeof block.value === 'string' ? block.value : ''}
        language={block.language ?? 'text'}
        {...(block.source !== undefined ? { source: block.source } : {})}
        tone="view"
      />
    </ErrorBoundary>
  );
}

/**
 * Adapts Portable Text's block-object contract to the code renderer.
 *
 * @param attrs DOM attributes supplied by the Portable Text renderer.
 * @param children Nested editor content associated with the code block.
 * @param node Code block fields used by either the static preview or editor.
 * @param path Portable Text path targeted by code and language edits.
 * @param readOnly Selects the static code preview when editing is disabled.
 *
 * @return The code block renderer in editable or read-only mode.
 */
export function renderCode({
  attributes: attrs,
  children,
  node,
  path,
  readOnly,
}: PortableTextBlockRendererProps<CodeBlockData>): JSX.Element {
  return readOnly ? (
    <Code block={node} />
  ) : (
    <CodeEditor attributes={attrs} children={children} node={node} path={path} />
  );
}

/**
 * Connects the code block's local controls to its Portable Text state.
 *
 * @param attrs DOM attributes supplied by the Portable Text editor.
 * @param children Nested editor content rendered after the CodeMirror surface.
 * @param node Code block whose source, language, and endpoint are being edited.
 * @param path Portable Text path targeted by code updates.
 *
 * @return The editable code block controls.
 */
function CodeEditor({
  attributes: attrs,
  children,
  node,
  path,
}: PortableTextBlockEditorProps<CodeBlockData>): JSX.Element {
  const editor = useEditor();
  const code = node;
  const [endpoint, setEndpoint] = useState(code.source ?? '');
  const [endpointDialog, setEndpointDialog] = useState<'change' | 'receive' | null>(null);
  const boundary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!boundary.current) return;
    /**
     * Stops code-editor input and focus events from triggering the parent Portable Text editor.
     * @param e DOM event originating within the code editor boundary.
     * @returns No value; the event is stopped before reaching the parent editor.
     */
    const stop = (e: Event): void => e.stopPropagation();
    const es = [
      'beforeinput',
      'input',
      'keydown',
      'keyup',
      'paste',
      'copy',
      'cut',
      'focusin',
      'focusout',
      'pointerdown',
      'pointerup',
    ];
    const element = boundary.current;
    for (const e of es) element.addEventListener(e, stop);
    return () => {
      for (const e of es) element.removeEventListener(e, stop);
    };
  }, [code.source]);
  useEffect(() => {
    if (!boundary.current) return;
    const block = boundary.current as BlockTgt;
    block.__blockActions = code.source
      ? [
          {
            text: 'Change API endpoint',
            onSelect: () => setEndpointDialog('change'),
          },
          {
            text: 'Convert to local definition',
            onSelect: () => {
              const received = boundary.current?.querySelector<HTMLElement>(
                '[data-docs-code-received][data-state="received"]',
              );
              if (!received) return;
              const localCode = { ...code };
              delete localCode.source;
              editor.send({
                type: 'set',
                at: path,
                value: {
                  ...localCode,
                  language: code.language ?? 'json',
                  value: received.textContent ?? '',
                },
              });
            },
          },
        ]
      : [
          {
            text: 'Convert to received value',
            onSelect: () => setEndpointDialog('receive'),
          },
        ];
    return () => {
      delete block.__blockActions;
    };
  }, [code.language, code.source, editor, path]);
  useEffect(() => setEndpoint(code.source ?? ''), [code.source]);
  /**
   * Writes the edited code and language while preserving the current API endpoint.
   * @param val New code text produced by the block editor.
   * @param lang Language label selected for syntax highlighting.
   * @returns No value; sends the changed block fields to the Portable Text editor.
   */
  const update = (val: string, lang = code.language ?? 'text'): void =>
    editor.send({
      type: 'block.set',
      at: path,
      props: { language: lang, source: code.source, value: val },
    });
  return (
    <ErrorBoundary name="CodeBlock">
      <>
        <div
          {...attrs}
          ref={boundary}
          contentEditable={false}
          data-block="code"
          data-docs-editor-block="code"
        >
          <CodeBlock
            code={typeof code.value === 'string' ? code.value : ''}
            expandAll
            language={code.language ?? 'text'}
            {...(code.source !== undefined ? { source: code.source } : {})}
            tone="edit"
            onCodeChange={(v) => update(v)}
            onCommit={(v, l) => update(v, l)}
            onLanguageChange={(l, v) => update(v, l)}
          />
          {children}
        </div>
        <Dialog open={endpointDialog !== null} onOpenChange={(o) => !o && setEndpointDialog(null)}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>
                {endpointDialog === 'receive' ? 'Convert to received value' : 'Change API endpoint'}
              </DialogTitle>
            </DialogHeader>
            <Label htmlFor="docs-code-endpoint">API endpoint</Label>
            <Input
              id="docs-code-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.currentTarget.value)}
            />
            <div className={DOCS_LAYOUT_CLASSES.dialogActions}>
              <Button variant="outline" onClick={() => setEndpointDialog(null)}>
                Cancel
              </Button>
              <Button
                disabled={!endpoint.trim()}
                onClick={() => {
                  const src = endpoint.trim();
                  if (!src) return;
                  editor.send({
                    type: 'set',
                    at: path,
                    value: {
                      ...code,
                      language: code.language ?? 'json',
                      source: src,
                      value: code.value ?? '',
                    },
                  });
                  setEndpointDialog(null);
                }}
              >
                {endpointDialog === 'receive' ? 'Receive value' : 'Change API endpoint'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    </ErrorBoundary>
  );
}
Object.assign(Code, { displayName: 'DocsCodePreview' });
Object.assign(renderCode, { displayName: 'DocsCodeRenderer' });
Object.assign(CodeEditor, { displayName: 'DocsCodeEditor' });

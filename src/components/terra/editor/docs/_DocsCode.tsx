/**
 * src/components/terra/editor/docs/_DocsCode.tsx
 */

/* Docs code block renderer with view and edit modes. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEditor } from '@portabletext/editor';
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';

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
 * @param block Authored code block with source text, language, and optional endpoint.
 *
 * @return The authored code block and its preview.
 */
function Code({ block }: { block: CodeBlockData }): JSX.Element {
  const source = typeof block.source === 'string' ? block.source : undefined;
  return (
    <ErrorBoundary name="Code">
      <CodeBlock
        code={typeof block.value === 'string' ? block.value : ''}
        language={typeof block.language === 'string' ? block.language : 'text'}
        {...(source === undefined ? {} : { source })}
        tone="view"
      />
    </ErrorBoundary>
  );
}

/**
 * Chooses a read-only preview or the editor-backed code block.
 *
 * @param attrs Portable Text attributes applied to the editor wrapper.
 * @param children Nested Portable Text content retained inside the wrapper.
 * @param node Authored code block to display or edit.
 * @param path Editor path used when code or endpoint data changes.
 * @param readOnly Whether the workspace displays or edits this block.
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
 * Connects code source and endpoint controls to the Portable Text editor.
 *
 * @param attrs Attributes applied to the editor wrapper.
 * @param children Nested Portable Text content retained below the code editor.
 * @param node Current code block data.
 * @param path Path of the code block in the document.
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
  const source = typeof code.source === 'string' ? code.source : undefined;
  const currentLang = typeof code.language === 'string' ? code.language : 'text';
  const value = typeof code.value === 'string' ? code.value : '';
  const [endpoint, setEndpoint] = useState(source ?? '');
  const [endpointDialog, setEndpointDialog] = useState<'change' | 'receive' | null>(null);
  const boundary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!boundary.current) return;
    /**
     * Stops Portable Text from handling browser input events inside this custom block.
     *
     * @param e - The native event bubbling from the code block surface.
     * @returns No value; the event no longer bubbles to the editor's handlers.
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
  }, [source]);
  useEffect(() => {
    if (!boundary.current) return;
    const block = boundary.current as BlockTgt;
    block.__blockActions = source
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
                  language: typeof code.language === 'string' ? code.language : 'json',
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
  }, [editor, currentLang, path, source]);
  useEffect(() => setEndpoint(source ?? ''), [source]);
  /**
   * Saves an edited source string and language at the current Portable Text block path.
   *
   * @param val - Code text to store in the block's `value` field.
   * @param lang - Language to store with the code; defaults to the block's current language.
   * @returns No value; the editor action updates the active block.
   */
  const update = (val: string, lang = currentLang): void =>
    editor.send({
      type: 'block.set',
      at: path,
      props: { language: lang, source, value: val },
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
            code={value}
            expandAll
            language={currentLang}
            {...(source === undefined ? {} : { source })}
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
            <div className="flex justify-end gap-2">
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

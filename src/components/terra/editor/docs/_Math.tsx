/**
 * src/components/terra/editor/docs/_Math.tsx
 */

/*
 * Docs math renderer with optional editing controls.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import katex from 'katex';
import { cn } from '../../../../lib/terra/runtime/runtime.js';
import {
  createElement as __terraQualityCreateElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor } from '@portabletext/editor';

// COMPONENTS
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Button, Popover, PopoverContent, Textarea } from '@terra-symposium/styling/ui';
import { Edit as EditIcon, FunctionMath as MathIcon } from '@carbon/icons-react';
import { ErrorBoundary } from '../../ui.js';
import type { JSX } from 'react';

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

/** Sanity Portable Text math expression block fields. */
type MathBlockData = DocsBlock<'math'>;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders the formula display and, when supplied, its edit popover.
 *
 * @param code LaTeX source rendered by KaTeX.
 * @param inline Whether to use inline or display layout.
 * @param className Optional classes added to the rendered math element.
 * @param write Optional callback used to save edited source or change display mode.
 *
 * @return The formatted math expression or editable math control.
 */
export function renderMath({
  code,
  inline,
  className,
  write,
}: {
  code: string;
  inline?: boolean;
  className?: string;
  write?: (code: string, inline?: boolean) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(code);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    setVal(code);
  }, [code]);
  useEffect(() => {
    if (!ref.current || !write) return;
    (ref.current as BlockTgt).__blockActions = [
      {
        text: 'Edit Formula',
        icon: <EditIcon className="mr-2 size-4" aria-hidden="true" />,
        onSelect: () => setOpen(true),
      },
      {
        text: `Set to ${inline ? 'Display' : 'Inline'}`,
        icon: <MathIcon className="mr-2 size-4" aria-hidden="true" />,
        onSelect: () => write(code, !inline),
      },
    ];
  }, [code, inline, write]);
  const math = __terraQualityCreateElement(inline ? 'span' : 'div', {
    className: cn(
      'docs-math',
      !inline && 'my-4 flex w-full justify-center overflow-x-auto',
      className,
    ),
    dangerouslySetInnerHTML: {
      __html: useMemo(() => {
        if (!code) return '';
        try {
          return katex.renderToString(code, {
            throwOnError: false,
            displayMode: !inline,
            strict: false,
          });
        } catch (err) {
          return `<span class="text-red-500">${String(err)}</span>`;
        }
      }, [code, inline]),
    },
  });
  if (!write) return math;
  return (
    <ErrorBoundary name="MathBlock">
      <Popover open={open} onOpenChange={setOpen}>
        <span
          ref={ref}
          className={cn(
            'docs-math-wrapper relative cursor-context-menu select-none outline-none ring-0',
            inline ? 'inline-block' : 'block',
          )}
          contentEditable={false}
          data-docs-editor-block="math"
          data-math-inline={inline ? 'true' : 'false'}
          data-math-code={code}
        >
          <PopoverPrimitive.Anchor
            className={cn('pointer-events-none', inline ? 'inline-block' : 'block')}
          >
            {math}
          </PopoverPrimitive.Anchor>
        </span>
        <PopoverContent
          align="center"
          className="not-prose z-[120] w-96 space-y-4"
          onClick={(e) => e.stopPropagation()}
          onInteractOutside={(e) => {
            if (
              (e.target as HTMLElement).closest(
                '[data-radix-popper-content-wrapper], [data-radix-menu-content]',
              )
            )
              e.preventDefault();
          }}
        >
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Edit LaTeX Formula</h4>
            <Textarea
              aria-label="LaTeX formula"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="f'(x) = ..."
              className="h-32 font-mono text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setVal(code);
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                write(val, inline);
                setOpen(false);
              }}
            >
              Save Formula
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </ErrorBoundary>
  );
}

/**
 * Renders an authored Docs math block without editor controls.
 *
 * @param block Math block containing the LaTeX source and inline-display flag.
 *
 * @return The rendered math expression.
 */
function MathBlock({ block }: { block: MathBlockData }): JSX.Element {
  return renderMath({
    code: typeof block.code === 'string' ? block.code : '',
    inline: Boolean(block.inline),
  });
}

/**
 * Chooses a read-only math preview or the editor-backed math control.
 *
 * @param attrs Portable Text attributes that belong on the renderer wrapper.
 * @param children Nested content supplied by the Portable Text renderer.
 * @param node Authored math block to display.
 * @param path Editor path used when a user updates the block.
 * @param readOnly Whether the workspace is displaying or editing the block.
 *
 * @return The math block renderer in editable or read-only mode.
 */
export function renderMathBlock({
  attributes: attrs,
  children,
  node,
  path,
  readOnly,
}: PortableTextBlockRendererProps<MathBlockData>): JSX.Element {
  return readOnly ? (
    <MathBlock block={node} />
  ) : (
    <MathEditor attributes={attrs} children={children} node={node} path={path} />
  );
}

/**
 * Connects the math block editor to the Portable Text editor context.
 *
 * @param attrs - Portable Text attributes applied to the editor wrapper.
 * @param children - Nested Portable Text content retained below the math controls.
 * @param node - Authored formula block and display mode.
 * @param path - Editor path used when a formula update is committed.
 *
 * @returns The editable math expression controls.
 */
function MathEditor({
  attributes: attrs,
  children,
  node,
  path,
}: PortableTextBlockEditorProps<MathBlockData>): JSX.Element {
  return (
    <MathEditorContent
      attributes={attrs}
      children={children}
      node={node}
      path={path}
      editor={useEditor()}
    />
  );
}

/**
 * Renders math controls and writes formula edits to the active Portable Text path.
 *
 * @param attrs Attributes applied to the editor wrapper.
 * @param children Nested Portable Text content retained below the math controls.
 * @param node Current math block data.
 * @param path Path of the math block in the document.
 * @param editor Portable Text editor used to commit changes.
 *
 * @return The math block controls and any nested editor content.
 */
function MathEditorContent({
  attributes: attrs,
  children,
  node,
  path,
  editor,
}: PortableTextBlockEditorProps<MathBlockData> & {
  editor: ReturnType<typeof useEditor>;
}): JSX.Element {
  const math = node as { code?: string; inline?: boolean };
  return (
    <div {...attrs} contentEditable={false} data-block="math">
      {renderMath({
        code: math.code ?? '',
        ...(math.inline === undefined ? {} : { inline: math.inline }),
        write: (c, i) =>
          editor.send({ type: 'block.set', at: path, props: { code: c, inline: i } }),
      })}
      {children}
    </div>
  );
}
Object.assign(MathBlock, { displayName: 'DocsMathPreview' });
Object.assign(renderMathBlock, { displayName: 'DocsMathRenderer' });
Object.assign(MathEditor, { displayName: 'DocsMathEditor' });
Object.assign(MathEditorContent, { displayName: 'DocsMathEditorContent' });

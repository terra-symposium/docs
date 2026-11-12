/**
 * src/components/terra/editor/docs/_Math.tsx
 * Docs math renderer with optional editing controls.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import katex from 'katex';
import { cn } from '../../../../lib/terra/runtime/runtime.js';
import { DOCS_LAYOUT_CLASSES } from '../../../../lib/terra/layout-classes.js';
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

/** Sanity Portable Text math expression block fields. */
type MathBlockData = DocsBlock<'math'>;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders the formula display and, when supplied, its edit popover.
 *
 * @param code LaTeX source passed to KaTeX.
 * @param inline Whether to render the formula inline instead of as a display block.
 * @param className Additional class applied to the rendered math element.
 * @param write Optional callback that persists changes from the edit popover.
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
        icon: <EditIcon className={DOCS_LAYOUT_CLASSES.iconBeforeLabel} aria-hidden="true" />,
        onSelect: () => setOpen(true),
      },
      {
        text: `Set to ${inline ? 'Display' : 'Inline'}`,
        icon: <MathIcon className={DOCS_LAYOUT_CLASSES.iconBeforeLabel} aria-hidden="true" />,
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
          <div className={DOCS_LAYOUT_CLASSES.dialogActions}>
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
 * Renders a Docs math block from its authored block.
 *
 * @param block Authored math block containing the expression and optional inline flag.
 *
 * @return The rendered math expression.
 */
function MathBlock({ block }: { block: MathBlockData }): JSX.Element {
  return renderMath({ code: block.code ?? '', inline: Boolean(block.inline) });
}

/**
 * Adapts Portable Text's block-object contract to the math renderer.
 *
 * @param attrs DOM attributes supplied by the Portable Text renderer.
 * @param children Nested editor content associated with the block.
 * @param node Math block data containing its LaTeX source.
 * @param path Portable Text path used to target the editable block.
 * @param readOnly Selects static KaTeX output when editing is unavailable.
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
 * Connects an editable Portable Text math block to the current editor state.
 *
 * @param mathOptions Portable Text editor attributes, nested content, math block data, and its update path.
 * @param mathOptions.attributes DOM attributes applied to the editable block container.
 * @param mathOptions.children Nested editor content rendered after the math controls.
 * @param mathOptions.node Math block whose source and display mode are edited.
 * @param mathOptions.path Portable Text path used to apply math block updates.
 *
 * @return Math expression controls and nested content connected to Portable Text updates.
 */
function MathEditor(mathOptions: PortableTextBlockEditorProps<MathBlockData>): JSX.Element {
  return <MathEditorContent {...mathOptions} editor={useEditor()} />;
}

/**
 * Renders math controls using the editor context supplied by the Portable Text boundary.
 *
 * @param attrs DOM attributes supplied by the Portable Text editor.
 * @param children Nested editor content rendered after the formula.
 * @param node Math block data containing source and display mode.
 * @param path Portable Text path targeted by the `block.set` update.
 * @param editor Editor instance used to persist formula edits.
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

/**
 * src/components/terra/editor/ContentEditor.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import * as selectors from '@portabletext/editor/selectors';
import { createElement, useEffect, useRef, useState } from 'react';
import { defaultDocsBlock, enabledDocsBlocks } from '../../blocks.js';
import {
  defineBlockObject,
  defineInlineObject,
  defineSchema,
  defineTextBlock,
  useEditor,
  useEditorSelector,
} from '@portabletext/editor';
import { docsValueToMarkdown } from '../../../lib/markdown-model.js';
import { DOCS_LAYOUT_CLASSES } from '../../../lib/terra/layout-classes.js';
import { renderCallout } from './docs/_Callout.js';
import { renderCode } from './docs/_DocsCode.js';
import { renderImage } from './docs/_DocsImage.js';
import { renderMathBlock } from './docs/_Math.js';
import { renderTable } from './docs/_Table.js';

// COMPONENTS
import * as TerraQualityRegex from '../../../lib/terra/regex.mjs';
import MathInline from './docs/_math_inline.js';
import {
  Add as AddIcon,
  Link as LinkIcon,
  TextBold as BoldIcon,
  TextItalic as ItalicIcon,
  TextStrikethrough as StrikethroughIcon,
  TextUnderline as UnderlineIcon,
} from '@carbon/icons-react';
import { BlockContext } from './docs/BlockContext.js';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@terra-symposium/styling/ui';
import { DocsHeading } from './docs/heading.js';
import { DocsQuizBlock } from '../../quiz.js';
import { EditorProvider, PortableTextEditable } from '@portabletext/editor';
import { Embed } from './docs/_Embed.js';
import { ErrorBoundary } from '../ui.js';
import { DocsMarkdown } from '../../MarkdownContent.js';
import { NodePlugin } from '@portabletext/editor/plugins';
import { NodesBlock } from './docs/_Nodes.js';
import { Raw } from './docs/_Raw.js';
import { TsDocs } from './docs/_TsDocs.js';

// DATA
import { DOCS_BLOCK_FIELDS, DOCS_BLOCK_TYPES } from '../../blocks.js';

// TYPES
import type {
  BlockObjectRenderProps,
  InlineObjectRenderProps,
  PortableTextBlock,
  TextBlockRenderProps,
} from '@portabletext/editor';
import type { DocsBlockOptions, DocsBlockType, DocsEditorBlockType } from '../../blocks.js';
import type { DocsHostAttachment } from '../../../lib/host.js';
import type { JSX, MouseEvent, MouseEventHandler, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** A typed Docs value member with an optional stable key and preserved custom fields. */
type ContentMember = Record<string, unknown> & { _key?: string; _type: string };
/** Portable Text block array after Docs-specific blocks have been adapted for the editor. */
type EditorValue = PortableTextBlock[];
const INLINE_CODE_MARK = 'terra-inline-code';
const imgFile = /\.(?:png|jpe?g|gif|webp|svg|avif)$/iu;
const DOCS_INSERTIONS: readonly {
  label: string;
  type: DocsEditorBlockType | 'attachment';
  value: string;
}[] = [
  { label: 'Math', type: 'math', value: 'docs:math' },
  { label: 'Code', type: 'code', value: 'docs:code' },
  { label: 'Receive value', type: 'code', value: 'docs:code-received' },
  { label: 'Add attachment', type: 'attachment', value: 'docs:attachment' },
  { label: 'Nodes', type: 'nodes', value: 'docs:nodes' },
  { label: 'Quiz generator', type: 'quiz', value: 'docs:quiz' },
  { label: 'TypeScript docs', type: 'tsDocs', value: 'docs:tsDocs' },
  { label: 'Raw', type: 'raw', value: 'docs:raw' },
  { label: 'Table', type: 'table', value: 'docs:table' },
  { label: 'Callout', type: 'callout', value: 'docs:callout' },
];
/** Type-erased renderer signature used to register heterogeneous custom block components. */
type BlockRenderer = (props: never) => JSX.Element | null;

/**
 * Adapts a typed custom-block renderer to the editor's shared renderer registry.
 * @param renderer Renderer whose props are inferred from its Portable Text block type.
 * @returns The same renderer under the registry's erased prop contract.
 */
const eraseBlockRenderer = <Props,>(
  renderer: (props: Props) => JSX.Element | null,
): BlockRenderer => renderer as unknown as BlockRenderer;
/** Props consumed by the editor change listener and its insertion dialogs. */
type ContentChangeListenerProps = {
  onChange: (content: unknown[]) => void;
  toolbar: boolean;
  actions?: ReactNode;
  attachments: DocsHostAttachment[];
  blocks: DocsBlockOptions;
  nested: boolean;
};

/**
 * Keeps host content synchronized with Portable Text and renders the optional insertion controls.
 * @param o Callback that receives normalized Portable Text after editor changes.
 * @param t Whether this editor surface exposes the Docs toolbar and insertion dialogs.
 * @param a Optional actions rendered beside the insertion controls.
 * @param v Attachments available for link or visual insertion.
 * @param b Rich blocks enabled for the current editor surface.
 * @param n Whether the editor is nested inside another rich block.
 * @returns Toolbar controls while enabled, or `null` when the surface hides the toolbar.
 */
function ContentChangeListener({
  onChange: o,
  toolbar: t,
  actions: a,
  attachments: v,
  blocks: b,
  nested: n,
}: ContentChangeListenerProps): JSX.Element | null {
  const editor = useEditor();
  const value = useEditorSelector(editor, (s) => s.context.value);
  const previous = useRef(value);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [receivedValueOpen, setReceivedValueOpen] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<'embed' | 'link'>('embed');
  const [attachmentPath, setAttachmentPath] = useState('');
  const enabled = new Set(enabledDocsBlocks(b));
  const attachment = v.find((i) => i.path === attachmentPath);
  const visualEmbedAvailable = attachment
    ? canEmbedAttachment(attachment, b)
    : v.some((i) => canEmbedAttachment(i, b));
  const selectedMode =
    attachmentMode === 'embed' &&
    visualEmbedAvailable &&
    (!attachment || canEmbedAttachment(attachment, b))
      ? 'embed'
      : 'link';
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    o(toContentValue(value as EditorValue));
  }, [o, value]);
  useEffect(() => {
    if (t) return;
    setAttachmentPickerOpen(false);
    setReceivedValueOpen(false);
    setEndpoint('');
    setInsertMenuOpen(false);
    setAttachmentMode('embed');
    setAttachmentPath('');
  }, [t]);
  /**
   * Commits the editor's current snapshot through the host value callback.
   * @returns No value; emits the converted content through the editor change callback.
   */
  const sync = (): void => o(toContentValue(editor.getSnapshot().context.value as EditorValue));
  /**
   * Runs a toolbar action and restores editor focus after its control closes.
   * @param event Button event whose default form submission must be prevented.
   * @param action Operation selected from the toolbar.
   * @returns No value; applies the action and returns focus to the editor.
   */
  const run = (event: MouseEvent<HTMLButtonElement>, action: () => void): void => {
    event.preventDefault();
    action();
    editor.send({ type: 'focus' });
  };
  /**
   * Inserts a new block of the requested type after the current editor selection.
   * @param type Docs block type selected from the insertion menu.
   * @param override Optional values that replace defaults for the inserted block.
   * @returns No value; sends the new block to the editor and synchronizes the host value.
   */
  const insertBlock = (type: DocsEditorBlockType, override?: Record<string, unknown>): void => {
    const blockValue: Record<string, unknown> = {
      ...defaultDocsBlock(type),
      _key: crypto.randomUUID(),
      ...(override ?? {}),
    };
    if (type === 'table') {
      /**
       * Creates a unique key for each new cell, row, and text member.
       * @returns A UUID suitable for a Portable Text `_key` value.
       */
      const key = (): string => crypto.randomUUID();
      /**
       * Builds a table cell containing one Portable Text paragraph.
       * @param text Initial text displayed in the new cell.
       * @returns A keyed cell object accepted by the table editor.
       */
      const cell = (text: string): Record<string, unknown> => ({
        _key: key(),
        _type: 'cell',
        content: [
          {
            _key: key(),
            _type: 'block',
            children: [{ _key: key(), _type: 'span', marks: [], text }],
            markDefs: [],
            style: 'normal',
          },
        ],
      });
      blockValue.header = 'Table';
      blockValue.rows = [
        { _key: key(), _type: 'row', cells: [cell('Header'), cell('Header')] },
        { _key: key(), _type: 'row', cells: [cell('Cell'), cell('Cell')] },
      ];
    }
    editor.send({
      type: 'insert.block object',
      blockObject: { name: type, value: blockValue },
      placement: 'after',
    } as never);
    sync();
    editor.send({ type: 'focus' });
  };
  /**
   * Applies an insertion-menu choice and dismisses the menu.
   * @param action Callback for the selected menu item.
   */
  const choose = (action: () => void): void => {
    action();
    setInsertMenuOpen(false);
  };
  return t ? (
    <div className="not-prose sticky top-3 z-20 mb-3">
      <ErrorBoundary name="ContentToolbar">
        <div
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-primary-7 bg-primary-3 px-3 py-2 shadow-lg shadow-primary-12/20 sm:px-4"
          role="toolbar"
          aria-label="Editor controls"
        >
          {a && (
            <>
              {a}
              <div className="hidden h-6 w-px bg-primary-5 sm:block" />
            </>
          )}
          <div className={DOCS_LAYOUT_CLASSES.compactRow}>
            <Select
              onValueChange={(s) => {
                editor.send({ type: 'style.toggle', style: s } as never);
                editor.send({ type: 'focus' });
              }}
            >
              <SelectTrigger className="w-32 sm:w-36" size="sm" aria-label="Block type">
                <SelectValue placeholder="Text" />
              </SelectTrigger>
              <SelectContent align="start">
                {[
                  { title: 'Normal', value: 'normal' },
                  { title: 'Heading 2', value: 'h2' },
                  { title: 'Heading 3', value: 'h3' },
                  { title: 'Heading 4', value: 'h4' },
                  { title: 'Heading 5', value: 'h5' },
                  { title: 'Heading 6', value: 'h6' },
                  { title: 'Quote', value: 'blockquote' },
                ].map(({ title: t, value: v }) => (
                  <SelectItem key={v} value={v}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mx-1 hidden h-6 w-px bg-primary-5 sm:block" />
            {[
              { Icon: BoldIcon, decorator: 'strong', label: 'Bold' },
              { Icon: ItalicIcon, decorator: 'em', label: 'Italic' },
              { Icon: UnderlineIcon, decorator: 'underline', label: 'Underline' },
              { Icon: StrikethroughIcon, decorator: 'strike-through', label: 'Strikethrough' },
            ].map(({ Icon, decorator: d, label: l }) => (
              <ToolbarButton
                key={l}
                label={l}
                onMouseDown={(event) =>
                  run(event, () => editor.send({ type: 'decorator.toggle', decorator: d } as never))
                }
              >
                <Icon className="size-4" aria-hidden="true" />
              </ToolbarButton>
            ))}
            <ToolbarButton
              label="Link"
              onMouseDown={(e) =>
                run(e, () => {
                  const href = window.prompt('Link URL');
                  if (href)
                    editor.send({
                      type: 'annotation.add',
                      annotation: { name: 'link', value: { href } },
                    } as never);
                })
              }
            >
              <LinkIcon className="size-4" aria-hidden="true" />
            </ToolbarButton>
          </div>
          <div className="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 sm:flex-none">
            <ErrorBoundary name="DocsAttachmentPicker">
              <Dialog
                open={attachmentPickerOpen}
                onOpenChange={(n) => {
                  setAttachmentPickerOpen(n);
                  if (!n) setAttachmentPath('');
                }}
              >
                <DialogContent size="xs" className="space-y-4">
                  <div>
                    <DialogTitle>Add attachment</DialogTitle>
                    <DialogDescription className="mt-2">
                      Select an existing document attachment, then choose how it should appear.
                    </DialogDescription>
                  </div>
                  <Select value={attachmentPath} onValueChange={setAttachmentPath}>
                    <SelectTrigger aria-label="Document attachment">
                      <SelectValue placeholder="Select an attachment" />
                    </SelectTrigger>
                    <SelectContent>
                      {v.map((i) => (
                        <SelectItem key={i.path} value={i.path}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div
                    className={DOCS_LAYOUT_CLASSES.controlRow}
                    aria-label="Attachment format"
                    role="group"
                  >
                    {visualEmbedAvailable && (
                      <Button
                        aria-pressed={selectedMode === 'embed'}
                        className="flex-1"
                        onClick={() => setAttachmentMode('embed')}
                        size="sm"
                        type="button"
                        variant={selectedMode === 'embed' ? 'default' : 'outline'}
                      >
                        Visual embed
                      </Button>
                    )}
                    <Button
                      aria-pressed={selectedMode === 'link'}
                      className="flex-1"
                      onClick={() => setAttachmentMode('link')}
                      size="sm"
                      type="button"
                      variant={selectedMode === 'link' ? 'default' : 'outline'}
                    >
                      Text link
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!attachment}
                    onClick={() => {
                      if (!attachment) return;
                      let member: Record<string, unknown>;
                      if (selectedMode === 'link') {
                        const linkKey = crypto.randomUUID();
                        member = {
                          _key: crypto.randomUUID(),
                          _type: 'block',
                          children: [
                            {
                              _key: crypto.randomUUID(),
                              _type: 'span',
                              marks: [linkKey],
                              text: attachment.name,
                            },
                          ],
                          markDefs: [
                            {
                              _key: linkKey,
                              _type: 'link',
                              href: attachment.path,
                            },
                          ],
                          style: 'normal',
                        };
                      } else if (imgFile.test(attachment.name)) {
                        member = {
                          _key: crypto.randomUUID(),
                          _type: 'docImage',
                          alt: attachment.name,
                          title: attachment.name,
                          url: attachment.path,
                        };
                      } else {
                        member = {
                          _key: crypto.randomUUID(),
                          _type: 'embed',
                          src: attachment.path,
                          title: attachment.name,
                        };
                      }
                      if (member._type === 'block') {
                        editor.send({
                          type: 'insert.block',
                          block: { ...member, _type: 'block' },
                          placement: 'after',
                        } as never);
                      } else {
                        editor.send({
                          type: 'insert.block object',
                          blockObject: { name: String(member._type), value: member },
                          placement: 'after',
                        } as never);
                      }
                      sync();
                      editor.send({ type: 'focus' });
                      setAttachmentPickerOpen(false);
                    }}
                  >
                    {selectedMode === 'embed' ? 'Insert visual attachment' : 'Insert text link'}
                  </Button>
                </DialogContent>
              </Dialog>
            </ErrorBoundary>
            <Popover open={insertMenuOpen} onOpenChange={setInsertMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="size-9 shrink-0 p-0"
                  aria-label="Insert content"
                  aria-expanded={insertMenuOpen}
                  title="Insert content"
                >
                  <AddIcon className="size-4" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-80 overflow-hidden p-0">
                <Command>
                  <CommandInput
                    autoFocus
                    className="border-b border-primary-5 py-3"
                    placeholder="Search content…"
                  />
                  <CommandList className="max-h-80 p-1.5">
                    <CommandEmpty>No content types found.</CommandEmpty>
                    {b.inlineMath !== false && (
                      <CommandGroup
                        heading="Inline"
                        className="px-1 py-2 [&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-2 [&_[cmdk-group-items]]:gap-1"
                      >
                        <CommandItem
                          className="min-w-0 px-3 py-2"
                          value="inline:docs:math"
                          keywords={['Docs', 'Math']}
                          onSelect={() =>
                            choose(() => {
                              editor.send({
                                type: 'insert.inline object',
                                inlineObject: {
                                  name: 'math',
                                  value: { code: 'E = mc^2', inline: true },
                                },
                              } as never);
                              sync();
                              editor.send({ type: 'focus' });
                            })
                          }
                        >
                          Math
                        </CommandItem>
                      </CommandGroup>
                    )}
                    <CommandGroup
                      heading="Block"
                      className="border-t border-primary-5 px-1 py-2 [&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-2 [&_[cmdk-group-items]]:gap-1"
                    >
                      {DOCS_INSERTIONS.filter((c) => {
                        if (c.value === 'docs:code-received') return enabled.has('code');
                        if (c.type === 'attachment') return true;
                        if (!enabled.has(c.type)) return false;
                        return !n || !['tabs', 'accordion', 'callout'].includes(c.type);
                      }).map((c) => (
                        <CommandItem
                          className="min-w-0 px-3 py-2"
                          key={c.value}
                          value={`block:${c.value}`}
                          keywords={['Docs', c.label, c.type]}
                          onSelect={() =>
                            choose(() => {
                              if (c.type === 'attachment') setAttachmentPickerOpen(true);
                              else if (c.value === 'docs:code-received') setReceivedValueOpen(true);
                              else {
                                const insertion = DOCS_INSERTIONS.find(
                                  (candidate) => candidate.value === c.value,
                                );
                                if (insertion && insertion.type !== 'attachment')
                                  insertBlock(insertion.type);
                              }
                            })
                          }
                        >
                          {c.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <Dialog
            open={receivedValueOpen}
            onOpenChange={(o) => {
              setReceivedValueOpen(o);
              if (!o) setEndpoint('');
            }}
          >
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Receive value</DialogTitle>
              </DialogHeader>
              <Label htmlFor="docs-received-code-endpoint">API endpoint</Label>
              <Input
                id="docs-received-code-endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.currentTarget.value)}
                placeholder="/api/docs?action=testimonials"
              />
              <div className={DOCS_LAYOUT_CLASSES.dialogActions}>
                <Button variant="outline" onClick={() => setReceivedValueOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!endpoint.trim()}
                  onClick={() => {
                    const src = endpoint.trim();
                    if (!src) return;
                    insertBlock('code', { language: 'json', source: src, value: '' });
                    setEndpoint('');
                    setReceivedValueOpen(false);
                  }}
                >
                  Receive value
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ErrorBoundary>
    </div>
  ) : null;
}
const editorNodeComponents: {
  renderers: Record<string, BlockRenderer>;
  /** Synchronizes editor snapshots with the host and exposes insertion controls when this editor allows them. */
  ContentChangeListener: (props: ContentChangeListenerProps) => JSX.Element | null;
} = {
  renderers: {
    callout: eraseBlockRenderer(renderCallout),
    code: eraseBlockRenderer(renderCode),
    docImage: eraseBlockRenderer(renderImage),
    embed: eraseBlockRenderer(
      ({ attributes: a, children: c, node: n }: BlockObjectRenderProps): JSX.Element => (
        <div {...a} data-docs-editor-block="Embed">
          <Embed block={n as unknown as import('./types.js').DocsBlock<'embed'>} />
          {c}
        </div>
      ),
    ),
    math: eraseBlockRenderer(renderMathBlock),
    nodes: eraseBlockRenderer(
      ({ attributes: a, children: c, node: n }: BlockObjectRenderProps): JSX.Element => (
        <div {...a} data-docs-editor-block="Diagram">
          <NodesBlock block={n as unknown as import('./types.js').DocsBlock<'nodes'>} />
          {c}
        </div>
      ),
    ),
    quiz: eraseBlockRenderer(
      ({ attributes: a, children: c }: BlockObjectRenderProps): JSX.Element => (
        <div {...a} data-docs-editor-block="Quiz generator">
          <DocsQuizBlock />
          {c}
        </div>
      ),
    ),
    raw: eraseBlockRenderer(
      ({
        attributes: a,
        children: c,
        node: n,
        readOnly: r,
        blocks: b,
      }: BlockObjectRenderProps & { blocks: DocsBlockOptions }): JSX.Element => (
        <div {...a} data-docs-editor-block="Raw Markdown">
          {r ? (
            <DocsMarkdown markdown={typeof n.markdown === 'string' ? n.markdown : ''} options={b} />
          ) : (
            <Raw block={n as unknown as import('./types.js').DocsBlock<'raw'>} />
          )}
          {c}
        </div>
      ),
    ),
    table: eraseBlockRenderer(renderTable),
    tsDocs: eraseBlockRenderer(
      ({ attributes: a, children: c, node: n }: BlockObjectRenderProps) => (
        <div {...a} data-docs-editor-block="TypeScript docs">
          <TsDocs block={n as unknown as import('./types.js').DocsBlock<'tsDocs'>} />
          {c}
        </div>
      ),
    ),
  },
  ContentChangeListener,
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Determines whether an attachment should use the image or embed block type.
 *
 * @param attachment - Attachment whose filename determines its visual block type.
 * @param blocks - Enabled block configuration for the current document.
 *
 * @returns `true` when the matching image or embed block is enabled.
 */
function canEmbedAttachment(attachment: DocsHostAttachment, blocks: DocsBlockOptions): boolean {
  return imgFile.test(attachment.name) ? blocks.docImage !== false : blocks.embed !== false;
}

/**
 * Renders an icon button that keeps toolbar focus while forwarding its mouse action.
 *
 * @param children - Icon or other content displayed inside the button.
 * @param label - Accessible name and tooltip text for the button.
 * @param onMouseDown - Handler invoked before the button changes editor focus.
 *
 * @returns The labeled toolbar button.
 */
function ToolbarButton({
  children,
  label,
  onMouseDown,
}: {
  children: ReactNode;
  label: string;
  onMouseDown: MouseEventHandler<HTMLButtonElement>;
}): JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onMouseDown={onMouseDown}
    >
      {children}
    </Button>
  );
}

/**
 * Checks whether a value is a structured Docs content member.
 *
 * @param v - Value to inspect.
 *
 * @returns `true` when the value is a non-array object with a string `_type`.
 */
function isMember(v: unknown): v is ContentMember {
  return Boolean(
    v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    typeof (v as { _type?: unknown })._type === 'string',
  );
}

/**
 * Checks whether a Docs content member has the key required for preservation.
 *
 * @param value - Value to inspect.
 *
 * @returns `true` when the member has a string `_key`.
 */
function isPreservedMember(value: unknown): value is ContentMember {
  return isMember(value) && typeof value._key === 'string';
}

/**
 * Converts nested Docs content arrays to the editor's Portable Text shape.
 *
 * @param value - Stored nested content or another preserved value.
 * @param options - Block options applied while normalizing nested content.
 *
 * @returns Editor-ready content for arrays, or the original value otherwise.
 */
function normNestedContent(value: unknown, options: DocsBlockOptions): unknown {
  return Array.isArray(value) ? toEditorValue(value, options) : value;
}

/**
 * Adapts stored text children and custom inline objects to editor-safe members.
 * @param value Stored child value, including legacy strings or Portable Text members.
 * @param options Enabled block capabilities used to retain supported inline math.
 * @param blockKey Optional parent key used to create a stable child key for legacy text.
 * @returns Child members with unsupported source preserved behind editor aliases.
 */
function normTextChildren(value: unknown, options: DocsBlockOptions, blockKey?: string): unknown[] {
  if (typeof value === 'string') {
    value = value
      ? [
          {
            _key: `${blockKey ?? 'docs-block'}-text`,
            _type: 'span',
            marks: [],
            text: value,
          },
        ]
      : [];
  }
  if (!Array.isArray(value)) return [];
  return value.map((c) => {
    if (!isMember(c)) return c;
    if (c._type === 'span')
      return {
        ...c,
        marks: (Array.isArray(c.marks) ? c.marks : []).map((mark: unknown) =>
          mark === 'code' ? INLINE_CODE_MARK : mark,
        ),
      };
    if (c._type === 'todoInline') return c;
    if (c._type === 'math' && options.inlineMath !== false) return c;
    return {
      ...(c._key ? { _key: c._key } : {}),
      _type: 'todoInline',
      source: c,
    };
  });
}

/**
 * Restores preserved inline source and the stored spelling of Docs marks.
 * @param value Editor child value after user edits.
 * @returns Original preserved children, with temporary aliases removed.
 */
function restoreTextChildren(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((c) => {
    if (!isMember(c)) return c;
    if (c._type === 'todoInline' && isPreservedMember(c.source)) return c.source;
    if (c._type === 'span' && Array.isArray(c.marks))
      return {
        ...c,
        marks: c.marks.map((mark: unknown) => (mark === INLINE_CODE_MARK ? 'code' : mark)),
      };
    return c;
  });
}

/**
 * Translate the stored Terra text-block alias into Portable Text's editor member.
 *
 * @param value - Stored Docs content to convert into editor blocks.
 * @param options - Block options that control nested content conversion.
 *
 * @returns Portable Text members ready for the Docs editor.
 */
function toEditorValue(value: unknown[], options: DocsBlockOptions = {}): EditorValue {
  return value.filter(isMember).map((m) => {
    if (m._type === 'tabs' || m._type === 'accordion')
      return {
        _key: m._key,
        _type: 'raw',
        markdown: docsValueToMarkdown([m] as unknown as Parameters<typeof docsValueToMarkdown>[0]),
      } as unknown as PortableTextBlock;
    if (m._type === 'block' || m._type === 'block') {
      const { c, children, ...rest } = m;
      return {
        ...rest,
        _type: 'block',
        children: normTextChildren(
          typeof children === 'string'
            ? children
            : Array.isArray(children) && children.length > 0
              ? children
              : c,
          options,
          typeof m._key === 'string' ? m._key : undefined,
        ),
      } as unknown as PortableTextBlock;
    }
    if (m._type === 'todoBlock') return m as unknown as PortableTextBlock;
    if (DOCS_BLOCK_TYPES.includes(m._type as DocsBlockType)) {
      if (options[m._type as DocsBlockType] === false)
        return {
          _key: m._key,
          _type: 'todoBlock',
          source: m,
        } as unknown as PortableTextBlock;
      if (m._type === 'callout')
        return {
          ...m,
          content: normNestedContent(m.content, options),
        } as unknown as PortableTextBlock;
      if (m._type === 'table')
        return {
          ...m,
          rows: Array.isArray(m.rows)
            ? m.rows.map((row: unknown) =>
                isMember(row)
                  ? {
                      ...row,
                      cells: Array.isArray(row.cells)
                        ? row.cells.map((cell: unknown) =>
                            isMember(cell)
                              ? {
                                  ...cell,
                                  content: normNestedContent(cell.content, options),
                                }
                              : cell,
                          )
                        : row.cells,
                    }
                  : row,
              )
            : m.rows,
        } as unknown as PortableTextBlock;
      return m as unknown as PortableTextBlock;
    }
    return {
      _key: m._key,
      _type: 'todoBlock',
      source: m,
    } as unknown as PortableTextBlock;
  });
}

/**
 * Restores editor aliases and recursively returns preserved nested Portable Text source to the host model.
 * @param value Editor block array after user edits.
 * @returns Docs content with temporary aliases removed and nested callout/table content restored.
 */
function toContentValue(value: EditorValue): unknown[] {
  return value.map((b) => {
    const member = b as unknown as ContentMember;
    if (member._type === 'block')
      return {
        ...member,
        _type: 'block',
        children: restoreTextChildren(member.children),
      };
    if (member._type === 'todoBlock' && isPreservedMember(member.source)) return member.source;
    if (member._type === 'callout')
      return {
        ...member,
        content: Array.isArray(member.content)
          ? toContentValue(member.content as EditorValue)
          : member.content,
      };
    if (member._type === 'table')
      return {
        ...member,
        rows: Array.isArray(member.rows)
          ? member.rows.map((row: unknown) =>
              isMember(row)
                ? {
                    ...row,
                    cells: Array.isArray(row.cells)
                      ? row.cells.map((cell: unknown) =>
                          isMember(cell)
                            ? {
                                ...cell,
                                content: Array.isArray(cell.content)
                                  ? toContentValue(cell.content as EditorValue)
                                  : cell.content,
                              }
                            : cell,
                        )
                      : row.cells,
                  }
                : row,
            )
          : member.rows,
      };
    return member;
  });
}

/**
 * Renders a Portable Text style as its semantic HTML element or Docs heading component.
 * @param style Stored block style such as `normal`, `blockquote`, or `h2`.
 * @param children Rendered inline children for the block.
 * @param readOnly Whether viewer-mode heading anchors should be added.
 * @returns The selected heading, blockquote, or paragraph element.
 */
function renderTextStyle(style: unknown, children: ReactNode, readOnly: boolean): JSX.Element {
  if (style === 'blockquote') return <blockquote>{children}</blockquote>;
  if (typeof style === 'string' && TerraQualityRegex.REGEX_H_2_6_REGEX().test(style) && readOnly)
    return <DocsHeading level={style as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'}>{children}</DocsHeading>;
  if (typeof style === 'string' && TerraQualityRegex.REGEX_H_1_6_U_REGEX().test(style))
    return createElement(style, {}, children);
  return <p>{children}</p>;
}

/**
 * Renders a Portable Text paragraph with Docs heading, list, and blockquote semantics.
 * @param attrs Portable Text attributes that must remain on the editable root.
 * @param children Rendered inline content for the paragraph.
 * @param node Text block fields controlling style, list marker, and nesting level.
 * @param readOnly Whether viewer-mode heading anchors should be included.
 * @returns The styled paragraph or list wrapper while preserving editor attributes.
 */
function ContentTextBlock({
  attributes: attrs,
  children,
  node,
  readOnly,
}: TextBlockRenderProps): JSX.Element {
  const content = renderTextStyle(node.style, children, readOnly);
  if (!node.listItem)
    return (
      <div {...attrs} data-level={node.level} data-style={node.style}>
        {content}
      </div>
    );
  return (
    <div {...attrs} data-level={node.level ?? 1} data-list-item={node.listItem}>
      {node.listItem === 'number' ? (
        <OrderedListItem block={node} level={node.level ?? 1}>
          {content}
        </OrderedListItem>
      ) : (
        <ul
          className="list-outside list-disc pl-6 leading-6"
          data-docs-list-level={node.level ?? 1}
          style={{
            marginInlineStart: `${Math.max(0, (node.level ?? 1) - 1) * 1.5}rem`,
          }}
        >
          <li data-level={node.level ?? 1} data-list-item={node.listItem}>
            {content}
          </li>
        </ul>
      )}
    </div>
  );
}

/**
 * Keeps an unsupported block visible and retains its source for a later editor round trip.
 * @param attrs Portable Text DOM attributes to preserve on the wrapper.
 * @param children Nested editor children associated with the unsupported member.
 * @param node Unsupported block with its original payload in `source` when available.
 * @returns A non-editable notice and JSON source preview.
 */
function UnsupportedBlock({
  attributes: attrs,
  children,
  node,
}: BlockObjectRenderProps): JSX.Element {
  const source = isPreservedMember(node.source) ? node.source : (node as unknown as ContentMember);
  return (
    <div {...attrs} contentEditable={false} data-docs-unsupported-block={source._type}>
      <p className="text-sm text-primary-10">
        Unsupported document block ({source._type}) retained in source.
      </p>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-primary-5 p-3 text-xs">
        {JSON.stringify(source, null, 2)}
      </pre>
      {children}
    </div>
  );
}

/**
 * Keeps unsupported inline content readable while preserving its original source value.
 * @param attrs Portable Text DOM attributes to preserve on the wrapper.
 * @param children Nested inline content associated with the unsupported member.
 * @param node Unsupported inline member with its original payload in `source` when available.
 * @returns A non-editable span using the stored text or a visible type label.
 */
function UnsupportedInline({
  attributes: attrs,
  children,
  node,
}: InlineObjectRenderProps): JSX.Element {
  const source = isPreservedMember(node.source) ? node.source : (node as unknown as ContentMember);
  return (
    <span {...attrs} contentEditable={false} data-docs-unsupported-inline={source._type}>
      {typeof source.text === 'string' ? source.text : `[Unsupported ${source._type}]`}
      {children}
    </span>
  );
}

/**
 * Rejects tabs, accordions, or callouts nested inside another group or callout.
 * @param v Editor value or nested object to inspect recursively.
 * @param d Number of enclosing group/callout blocks already encountered.
 * @returns `true` for valid content or the nesting error message.
 */
function validNesting(v: unknown, d = 0): true | string {
  if (Array.isArray(v)) {
    for (const item of v) {
      const result = validNesting(item, d);
      if (result !== true) return result;
    }
  } else if (v && typeof v === 'object') {
    const member = v as Record<string, unknown>;
    const nDepth =
      d +
      (typeof member._type === 'string' && ['accordion', 'callout', 'tabs'].includes(member._type)
        ? 1
        : 0);
    if (nDepth > 1)
      return 'Tabs, accordions, and callouts cannot be nested inside another tabs, accordion, or callout block.';
    for (const child of Object.values(member)) {
      const result = validNesting(child, nDepth);
      if (result !== true) return result;
    }
  }
  return true;
}

/**
 * Renders a numbered list item with a start value continued from adjacent items at the same level.
 * @param block Portable Text block whose position determines the ordered-list counter.
 * @param children Rendered content of this list item.
 * @param level Nesting level used for indentation and sibling selection.
 * @returns An ordered list containing the current list item and computed start value.
 */
function OrderedListItem({
  block,
  children,
  level,
}: {
  block: PortableTextBlock;
  children: ReactNode;
  level: number;
}): JSX.Element {
  const value = useEditorSelector(useEditor(), selectors.getValue);
  const index = value.findIndex((c) => c._key === block._key);
  let start = 1;
  if (index >= 0) {
    for (let cursor = index - 1; cursor >= 0; cursor--) {
      const previous = value[cursor];
      if (!previous?.listItem) break;
      const previousLevel = Number(previous.level ?? 1);
      if (previousLevel < level) break;
      if (previousLevel > level) continue;
      if (previous.listItem !== 'number') break;
      start++;
    }
  }
  return (
    <ol
      className="list-outside list-decimal pl-6 leading-6"
      data-docs-list-level={level}
      start={start}
      style={{ marginInlineStart: `${Math.max(0, level - 1) * 1.5}rem` }}
    >
      <li data-level={level} data-list-item="number">
        {children}
      </li>
    </ol>
  );
}

/**
 * Portable Docs editor profile extracted from the shared content editor.
 *
 * @param content Initial or replacement Docs content to edit.
 * @param onChange Callback receiving the preserved Docs value after editor changes.
 * @param readOnly Whether the editor should render in viewer mode.
 * @param resetKey Key that resets the editor when the host switches documents.
 * @param nested Whether nested content should use compact editing behavior.
 * @param toolbar Whether to show Docs insertion and formatting controls.
 * @param docsAttachments Attachments available to the insertion and preview controls.
 * @param toolbarActions Additional host-provided controls displayed with the toolbar.
 * @param blocks Feature flags controlling the rich block types available to this editor.
 * @returns The configured Portable Text editor with Docs block adapters and optional toolbar.
 */
export function ContentEditor({
  content = [],
  onChange,
  readOnly = false,
  resetKey,
  nested = false,
  toolbar = true,
  docsAttachments = [],
  toolbarActions,
  blocks = {},
}: {
  content?: unknown[];
  onChange?: (content: unknown[]) => void;
  readOnly?: boolean;
  resetKey?: string;
  nested?: boolean;
  toolbar?: boolean;
  docsAttachments?: DocsHostAttachment[];
  toolbarActions?: ReactNode;
  blocks?: DocsBlockOptions;
}): JSX.Element {
  const [nestingErr, setNestingErr] = useState<string | undefined>(undefined);
  const [rejectedChanges, setRejectedChanges] = useState(0);
  return (
    <ErrorBoundary name="Content">
      <EditorProvider
        key={`${resetKey ?? ''}:${rejectedChanges}`}
        initialConfig={{
          initialValue: toEditorValue(content, blocks),
          readOnly,
          schemaDefinition: defineSchema({
            styles: [
              { name: 'normal', title: 'Normal' },
              { name: 'h2', title: 'Heading 2' },
              { name: 'h3', title: 'Heading 3' },
              { name: 'h4', title: 'Heading 4' },
              { name: 'h5', title: 'Heading 5' },
              { name: 'h6', title: 'Heading 6' },
              { name: 'blockquote', title: 'Quote' },
            ],
            decorators: [
              { name: 'strong', title: 'Bold' },
              { name: 'em', title: 'Italic' },
              { name: 'underline', title: 'Underline' },
              { name: 'strike-through', title: 'Strikethrough' },
              // Sanity block objects use `code`, so inline-code marks need a separate editor name.
              { name: 'terra-inline-code', title: 'Code' },
            ],
            annotations: [{ name: 'link', fields: [{ name: 'href', type: 'string' }] }],
            lists: [{ name: 'bullet' }, { name: 'number' }],
            blockObjects: [
              ...enabledDocsBlocks(blocks).map((n) => ({
                name: n,
                fields: DOCS_BLOCK_FIELDS[n],
              })),
              { name: 'todoBlock', fields: [{ name: 'source', type: 'object' as const }] },
            ],
            inlineObjects: [
              ...(blocks.inlineMath === false
                ? []
                : [
                    {
                      name: 'math',
                      fields: [
                        { name: 'code', type: 'string' as const },
                        { name: 'inline', type: 'boolean' as const },
                      ],
                    },
                  ]),
              { name: 'todoInline', fields: [{ name: 'source', type: 'object' as const }] },
            ],
          }),
        }}
      >
        <NodePlugin
          nodes={[
            defineTextBlock({
              type: 'block',
              render: ContentTextBlock,
            }),
            ...Object.keys(editorNodeComponents.renderers)
              .filter((t) => blocks[t as DocsBlockType] !== false)
              .map((t) =>
                defineBlockObject({
                  type: t,
                  render: (props) =>
                    editorNodeComponents.renderers[t]!({
                      ...props,
                      readOnly,
                      blocks,
                    } as never) ?? <></>,
                }),
              ),
            ...(blocks.inlineMath === false
              ? []
              : [
                  defineInlineObject({
                    type: 'math',
                    render: (p) => <MathInline {...p} />,
                  }),
                ]),
            defineBlockObject({
              type: 'todoBlock',
              render: UnsupportedBlock,
            }),
            defineInlineObject({
              type: 'todoInline',
              render: UnsupportedInline,
            }),
          ]}
        />
        {!readOnly && (
          <editorNodeComponents.ContentChangeListener
            onChange={(v) => {
              const result = validNesting(v, nested ? 1 : 0);
              if (result !== true) {
                setNestingErr(result);
                setRejectedChanges((count) => count + 1);
                return;
              }
              setNestingErr(undefined);
              onChange?.(v);
            }}
            toolbar={toolbar}
            actions={toolbarActions}
            attachments={docsAttachments}
            blocks={blocks}
            nested={nested}
          />
        )}
        {nestingErr && <p role="alert">{nestingErr}</p>}
        <BlockContext enabled={!readOnly}>
          <section
            aria-label={readOnly ? 'Content preview' : 'Content editor'}
            className="bg-transparent"
            data-content-editor
          >
            <div className={nested ? (readOnly ? '' : 'my-4 min-h-24') : 'my-6 min-h-96'}>
              <PortableTextEditable
                aria-label={readOnly ? 'Document viewer' : 'Document editor'}
                aria-readonly={readOnly || undefined}
                className="docs-content mx-auto max-w-3xl text-base leading-8 text-primary-12 [&_a:not([data-docs-flow-node-link])]:text-secondary-10 [&_a:not([data-docs-flow-node-link])]:underline [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:text-xl [&_h5]:mb-2 [&_h5]:mt-6 [&_h5]:font-semibold [&_h6]:mb-2 [&_h6]:mt-5 [&_h6]:font-semibold [&_p:first-child]:mt-0 [&_p]:my-4 outline-none"
                contentEditable={!readOnly}
                renderListItem={({ block: b, children: c, level: l, value: v }) => {
                  return v === 'number' ? (
                    <OrderedListItem block={b} level={l}>
                      {c}
                    </OrderedListItem>
                  ) : (
                    <ul
                      className="list-outside list-disc pl-6 leading-6"
                      data-docs-list-level={l}
                      style={{
                        marginInlineStart: `${Math.max(0, l - 1) * 1.5}rem`,
                      }}
                    >
                      <li data-level={l} data-list-item={v}>
                        {c}
                      </li>
                    </ul>
                  );
                }}
                renderAnnotation={({ children: c, value: v }) => {
                  let href: string | undefined;
                  if (typeof v.href === 'string' && v.href.trim()) {
                    try {
                      href = ['http:', 'https:', 'mailto:', 'tel:'].includes(
                        new URL(v.href, 'https://docs.invalid').protocol,
                      )
                        ? v.href
                        : undefined;
                    } catch {
                      href = undefined;
                    }
                  }
                  return href ? <a href={href}>{c}</a> : <>{c}</>;
                }}
                renderBlock={({ children: c }) => <>{c}</>}
                renderDecorator={({ children: c, value: v }) => {
                  if (v === 'strong') return <strong>{c}</strong>;
                  if (v === 'em') return <em>{c}</em>;
                  if (v === 'underline') return <u>{c}</u>;
                  if (v === 'strike-through') return <s>{c}</s>;
                  if (v === INLINE_CODE_MARK) return <code>{c}</code>;
                  return <>{c}</>;
                }}
                renderStyle={({ children: c, schemaType: s }) =>
                  renderTextStyle(s.value, c, readOnly)
                }
              />
            </div>
          </section>
        </BlockContext>
      </EditorProvider>
    </ErrorBoundary>
  );
}

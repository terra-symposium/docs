import {
  defineSchema,
  defineBlockObject,
  defineInlineObject,
  defineTextBlock,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
} from '@portabletext/editor';
import * as selectors from '@portabletext/editor/selectors';
import {
  Add as AddIcon,
  Link as LinkIcon,
  TextBold as BoldIcon,
  TextItalic as ItalicIcon,
  TextStrikethrough as StrikethroughIcon,
  TextUnderline as UnderlineIcon,
} from '@carbon/icons-react';
import { createElement, useEffect, useRef, useState } from 'react';
import type { JSX, MouseEvent, MouseEventHandler, ReactNode } from 'react';
import type { PortableTextBlock } from '@portabletext/editor';
import { NodePlugin } from '@portabletext/editor/plugins';
import {
  defaultDocsBlock,
  DOCS_BLOCK_FIELDS,
  DOCS_BLOCK_TYPES,
  enabledDocsBlocks,
} from '../../blocks.js';
import type { DocsBlockOptions, DocsEditorBlockType, DocsBlockType } from '../../blocks.js';
import { BlockContext } from './docs/BlockContext.js';
import { renderCallout } from './docs/_Callout.js';
import { renderCode } from './docs/_DocsCode.js';
import { renderImage } from './docs/_DocsImage.js';
import { Embed } from './docs/_Embed.js';
import { renderMathBlock } from './docs/_Math.js';
import { NodesBlock } from './docs/_Nodes.js';
import { Raw } from './docs/_Raw.js';
import { renderTable } from './docs/_Table.js';
import { TsDocs } from './docs/_TsDocs.js';
import { DocsQuizBlock } from '../../quiz.js';
import MathInline from './docs/_math_inline.js';
import { DocsHeading } from './docs/heading.js';
import type { DocsHostAttachment } from '../../../lib/host.js';
import { docsValueToMarkdown } from '../../../lib/markdown-model.js';
import { MarkdownContent } from '../../MarkdownContent.js';
import { ErrorBoundary } from '../ui.js';
import * as TerraQualityRegex from '../../../lib/terra/regex.mjs';
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

type ContentMember = Record<string, any> & { _key?: string; _type: string };
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

function canEmbedAttachment(attachment: DocsHostAttachment, blocks: DocsBlockOptions): boolean {
  return imgFile.test(attachment.name) ? blocks.docImage !== false : blocks.embed !== false;
}

const editorNodeComponents: {
  renderers: Record<string, (props: any) => JSX.Element | null>;
  ContentChangeListener: (props: {
    onChange: (content: unknown[]) => void;
    toolbar: boolean;
    actions?: ReactNode;
    attachments: DocsHostAttachment[];
    blocks: DocsBlockOptions;
    nested: boolean;
  }) => JSX.Element | null;
} = {
  renderers: {
    callout: renderCallout,
    code: renderCode,
    docImage: renderImage,
    embed: ({ attributes: attrs, children, node }) => (
      <div {...attrs} data-docs-editor-block="Embed">
        <Embed block={node} />
        {children}
      </div>
    ),
    math: renderMathBlock,
    nodes: ({ attributes: attrs, children, node }) => (
      <div {...attrs} data-docs-editor-block="Diagram">
        <NodesBlock block={node} />
        {children}
      </div>
    ),
    quiz: ({ attributes: attrs, children }) => (
      <div {...attrs} data-docs-editor-block="Quiz generator">
        <DocsQuizBlock />
        {children}
      </div>
    ),
    raw: ({ attributes: attrs, children, node, readOnly, blocks }) => (
      <div {...attrs} data-docs-editor-block="Raw Markdown">
        {readOnly ? (
          <MarkdownContent markdown={node.markdown ?? ''} options={blocks} />
        ) : (
          <Raw block={node} />
        )}
        {children}
      </div>
    ),
    table: renderTable,
    tsDocs: ({ attributes: attrs, children, node }) => (
      <div {...attrs} data-docs-editor-block="TypeScript docs">
        <TsDocs block={node} />
        {children}
      </div>
    ),
  },
  ContentChangeListener: function ContentChangeListener({
    onChange,
    toolbar,
    actions,
    attachments,
    blocks,
    nested,
  }): JSX.Element | null {
    const editor = useEditor();
    const value = useEditorSelector(editor, (snapshot) => snapshot.context.value);
    const previous = useRef(value);
    const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
    const [receivedValueOpen, setReceivedValueOpen] = useState(false);
    const [endpoint, setEndpoint] = useState('');
    const [insertMenuOpen, setInsertMenuOpen] = useState(false);
    const [attachmentMode, setAttachmentMode] = useState<'embed' | 'link'>('embed');
    const [attachmentPath, setAttachmentPath] = useState('');
    const enabled = new Set(enabledDocsBlocks(blocks));
    const attachment = attachments.find((i) => i.path === attachmentPath);
    const visualEmbedAvailable = attachment
      ? canEmbedAttachment(attachment, blocks)
      : attachments.some((i) => canEmbedAttachment(i, blocks));
    const selectedMode =
      attachmentMode === 'embed' &&
      visualEmbedAvailable &&
      (!attachment || canEmbedAttachment(attachment, blocks))
        ? 'embed'
        : 'link';
    useEffect(() => {
      if (previous.current === value) return;
      previous.current = value;
      onChange(toContentValue(value as EditorValue));
    }, [onChange, value]);
    useEffect(() => {
      if (toolbar) return;
      setAttachmentPickerOpen(false);
      setReceivedValueOpen(false);
      setEndpoint('');
      setInsertMenuOpen(false);
      setAttachmentMode('embed');
      setAttachmentPath('');
    }, [toolbar]);
    const sync = (): void =>
      onChange(toContentValue(editor.getSnapshot().context.value as EditorValue));
    const run = (event: MouseEvent<HTMLButtonElement>, action: () => void): void => {
      event.preventDefault();
      action();
      editor.send({ type: 'focus' });
    };
    const insertBlock = (type: DocsEditorBlockType, override?: Record<string, unknown>): void => {
      const blockValue: Record<string, unknown> = {
        ...defaultDocsBlock(type),
        _key: crypto.randomUUID(),
        ...(override ?? {}),
      };
      if (type === 'table') {
        const key = (): string => crypto.randomUUID();
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
    const choose = (action: () => void): void => {
      action();
      setInsertMenuOpen(false);
    };

    return toolbar ? (
      <div className="not-prose sticky top-3 z-20 mb-3">
        <ErrorBoundary name="ContentToolbar">
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-primary-7 bg-primary-3 px-3 py-2 shadow-lg shadow-primary-12/20 sm:px-4"
            role="toolbar"
            aria-label="Editor controls"
          >
            {actions && (
              <>
                {actions}
                <div className="hidden h-6 w-px bg-primary-5 sm:block" />
              </>
            )}
            <div className="flex items-center gap-1">
              <Select
                onValueChange={(style) => {
                  editor.send({ type: 'style.toggle', style } as never);
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
                  ].map(({ title, value }) => (
                    <SelectItem key={value} value={value}>
                      {title}
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
              ].map(({ Icon, decorator, label }) => (
                <ToolbarButton
                  key={label}
                  label={label}
                  onMouseDown={(event) =>
                    run(event, () => editor.send({ type: 'decorator.toggle', decorator } as never))
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                </ToolbarButton>
              ))}
              <ToolbarButton
                label="Link"
                onMouseDown={(event) =>
                  run(event, () => {
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
                  onOpenChange={(next) => {
                    setAttachmentPickerOpen(next);
                    if (!next) setAttachmentPath('');
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
                        {attachments.map((i) => (
                          <SelectItem key={i.path} value={i.path}>
                            {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2" aria-label="Attachment format" role="group">
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
                      {blocks.inlineMath !== false && (
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
                        {DOCS_INSERTIONS.filter((choice) => {
                          if (choice.value === 'docs:code-received') return enabled.has('code');
                          if (choice.type === 'attachment') return true;
                          if (!enabled.has(choice.type)) return false;
                          return !nested || !['tabs', 'accordion', 'callout'].includes(choice.type);
                        }).map((choice) => (
                          <CommandItem
                            className="min-w-0 px-3 py-2"
                            key={choice.value}
                            value={`block:${choice.value}`}
                            keywords={['Docs', choice.label, choice.type]}
                            onSelect={() =>
                              choose(() => {
                                if (choice.type === 'attachment') setAttachmentPickerOpen(true);
                                else if (choice.value === 'docs:code-received')
                                  setReceivedValueOpen(true);
                                else {
                                  const insertion = DOCS_INSERTIONS.find(
                                    (candidate) => candidate.value === choice.value,
                                  );
                                  if (insertion && insertion.type !== 'attachment')
                                    insertBlock(insertion.type);
                                }
                              })
                            }
                          >
                            {choice.label}
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
              onOpenChange={(open) => {
                setReceivedValueOpen(open);
                if (!open) setEndpoint('');
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
                  onChange={(event) => setEndpoint(event.currentTarget.value)}
                  placeholder="/api/docs?action=testimonials"
                />
                <div className="flex justify-end gap-2">
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
  },
};

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

function isMember(value: unknown): value is ContentMember {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { _type?: unknown })._type === 'string',
  );
}

function isPreservedMember(value: unknown): value is ContentMember {
  return isMember(value) && typeof value._key === 'string';
}

function normNestedContent(value: unknown, options: DocsBlockOptions): unknown {
  return Array.isArray(value) ? toEditorValue(value, options) : value;
}

/** Translate the stored Terra text-block alias into Portable Text's editor member. */
function toEditorValue(value: unknown[], options: DocsBlockOptions = {}): EditorValue {
  return value.filter(isMember).map((member) => {
    if (member._type === 'tabs' || member._type === 'accordion')
      return {
        _key: member._key,
        _type: 'raw',
        markdown: docsValueToMarkdown([member] as unknown as Parameters<
          typeof docsValueToMarkdown
        >[0]),
      } as unknown as PortableTextBlock;
    if (member._type === 'block' || member._type === 'block') {
      const { c, children, ...rest } = member;
      return {
        ...rest,
        _type: 'block',
        children: (function normTextChildren(
          value: unknown,
          options: DocsBlockOptions,
          blockKey?: string,
        ): unknown[] {
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
          return value.map((child) => {
            if (!isMember(child)) return child;
            if (child._type === 'span')
              return {
                ...child,
                marks: (Array.isArray(child.marks) ? child.marks : []).map((mark: unknown) =>
                  mark === 'code' ? INLINE_CODE_MARK : mark,
                ),
              };
            if (child._type === 'todoInline') return child;
            if (child._type === 'math' && options.inlineMath !== false) return child;
            return {
              ...(child._key ? { _key: child._key } : {}),
              _type: 'todoInline',
              source: child,
            };
          });
        })(
          typeof children === 'string'
            ? children
            : Array.isArray(children) && children.length > 0
              ? children
              : c,
          options,
          typeof member._key === 'string' ? member._key : undefined,
        ),
      } as unknown as PortableTextBlock;
    }
    if (member._type === 'todoBlock') return member as unknown as PortableTextBlock;
    if (DOCS_BLOCK_TYPES.includes(member._type as DocsBlockType)) {
      if (options[member._type as DocsBlockType] === false)
        return {
          _key: member._key,
          _type: 'todoBlock',
          source: member,
        } as unknown as PortableTextBlock;
      if (member._type === 'callout')
        return {
          ...member,
          content: normNestedContent(member.content, options),
        } as unknown as PortableTextBlock;
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
                                  content: normNestedContent(cell.content, options),
                                }
                              : cell,
                          )
                        : row.cells,
                    }
                  : row,
              )
            : member.rows,
        } as unknown as PortableTextBlock;
      return member as unknown as PortableTextBlock;
    }
    return {
      _key: member._key,
      _type: 'todoBlock',
      source: member,
    } as unknown as PortableTextBlock;
  });
}

/** Restore editor aliases and recursively preserve nested Portable Text source. */
function toContentValue(value: EditorValue): unknown[] {
  return value.map((block) => {
    const member = block as unknown as ContentMember;
    if (member._type === 'block')
      return {
        ...member,
        _type: 'block',
        children: (function restoreTextChildren(value: unknown): unknown {
          if (!Array.isArray(value)) return value;
          return value.map((child) => {
            if (!isMember(child)) return child;
            if (child._type === 'todoInline' && isPreservedMember(child.source))
              return child.source;
            if (child._type === 'span' && Array.isArray(child.marks))
              return {
                ...child,
                marks: child.marks.map((mark: unknown) =>
                  mark === INLINE_CODE_MARK ? 'code' : mark,
                ),
              };
            return child;
          });
        })(member.children),
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

function renderTextStyle(style: unknown, children: ReactNode, readOnly: boolean): JSX.Element {
  if (style === 'blockquote') return <blockquote>{children}</blockquote>;
  if (typeof style === 'string' && TerraQualityRegex.REGEX_H_2_6_REGEX().test(style) && readOnly)
    return <DocsHeading level={style as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'}>{children}</DocsHeading>;
  if (typeof style === 'string' && /^h[1-6]$/.test(style))
    return createElement(style, {}, children);
  return <p>{children}</p>;
}

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
  const index = value.findIndex((candidate) => candidate._key === block._key);
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

/** Portable Docs editor profile extracted from the shared content editor. */
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
              ...enabledDocsBlocks(blocks).map((name) => ({
                name,
                fields: DOCS_BLOCK_FIELDS[name],
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
              render: (props) =>
                (function ContentTextBlock({
                  attributes: attrs,
                  children,
                  node,
                  readOnly,
                }: any): JSX.Element {
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
                })(props),
            }),
            ...Object.keys(editorNodeComponents.renderers)
              .filter((type) => blocks[type as DocsBlockType] !== false)
              .map((type) =>
                defineBlockObject({
                  type,
                  render: (props) =>
                    editorNodeComponents.renderers[type]!({
                      ...props,
                      readOnly,
                      blocks,
                    } as any) ?? <></>,
                }),
              ),
            ...(blocks.inlineMath === false
              ? []
              : [
                  defineInlineObject({
                    type: 'math',
                    render: (props) => <MathInline {...props} />,
                  }),
                ]),
            defineBlockObject({
              type: 'todoBlock',
              render: (props) =>
                (function UnsupportedBlock({
                  attributes: attrs,
                  children,
                  node,
                }: any): JSX.Element {
                  const source = isPreservedMember(node.source) ? node.source : node;
                  return (
                    <div
                      {...attrs}
                      contentEditable={false}
                      data-docs-unsupported-block={source._type}
                    >
                      <p className="text-sm text-primary-10">
                        Unsupported document block ({source._type}) retained in source.
                      </p>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-primary-5 p-3 text-xs">
                        {JSON.stringify(source, null, 2)}
                      </pre>
                      {children}
                    </div>
                  );
                })(props),
            }),
            defineInlineObject({
              type: 'todoInline',
              render: (props) =>
                (function UnsupportedInline({
                  attributes: attrs,
                  children,
                  node,
                }: any): JSX.Element {
                  const source = isPreservedMember(node.source) ? node.source : node;
                  return (
                    <span
                      {...attrs}
                      contentEditable={false}
                      data-docs-unsupported-inline={source._type}
                    >
                      {source.text ?? `[Unsupported ${source._type}]`}
                      {children}
                    </span>
                  );
                })(props),
            }),
          ]}
        />
        {!readOnly && (
          <editorNodeComponents.ContentChangeListener
            onChange={(value) => {
              const result = (function validNesting(value: unknown, depth = 0): true | string {
                if (Array.isArray(value)) {
                  for (const item of value) {
                    const result = validNesting(item, depth);
                    if (result !== true) return result;
                  }
                } else if (value && typeof value === 'object') {
                  const member = value as Record<string, unknown>;
                  const nDepth =
                    depth +
                    (typeof member._type === 'string' &&
                    ['accordion', 'callout', 'tabs'].includes(member._type)
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
              })(value, nested ? 1 : 0);
              if (result !== true) {
                setNestingErr(result);
                setRejectedChanges((count) => count + 1);
                return;
              }
              setNestingErr(undefined);
              onChange?.(value);
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
                renderListItem={({ block, children, level, value }) => {
                  return value === 'number' ? (
                    <OrderedListItem block={block} level={level}>
                      {children}
                    </OrderedListItem>
                  ) : (
                    <ul
                      className="list-outside list-disc pl-6 leading-6"
                      data-docs-list-level={level}
                      style={{
                        marginInlineStart: `${Math.max(0, level - 1) * 1.5}rem`,
                      }}
                    >
                      <li data-level={level} data-list-item={value}>
                        {children}
                      </li>
                    </ul>
                  );
                }}
                renderAnnotation={({ children, value }) => {
                  let href: string | undefined;
                  if (typeof value.href === 'string' && value.href.trim()) {
                    try {
                      href = ['http:', 'https:', 'mailto:', 'tel:'].includes(
                        new URL(value.href, 'https://docs.invalid').protocol,
                      )
                        ? value.href
                        : undefined;
                    } catch {
                      href = undefined;
                    }
                  }
                  return href ? <a href={href}>{children}</a> : <>{children}</>;
                }}
                renderBlock={({ children }) => <>{children}</>}
                renderDecorator={({ children, value }) => {
                  if (value === 'strong') return <strong>{children}</strong>;
                  if (value === 'em') return <em>{children}</em>;
                  if (value === 'underline') return <u>{children}</u>;
                  if (value === 'strike-through') return <s>{children}</s>;
                  if (value === INLINE_CODE_MARK) return <code>{children}</code>;
                  return <>{children}</>;
                }}
                renderStyle={({ children, schemaType }) =>
                  renderTextStyle(schemaType.value, children, readOnly)
                }
              />
            </div>
          </section>
        </BlockContext>
      </EditorProvider>
    </ErrorBoundary>
  );
}

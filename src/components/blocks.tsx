import { defineBlockObject, defineInlineObject, useEditor } from '@portabletext/editor';
import { useState } from 'react';
import katex from 'katex';
import { docsValueToMarkdown } from '../lib/markdown-model.js';
import { renderMarkdown } from '../lib/markdown.js';
import type { JSX, ReactNode } from 'react';
import type { Path } from '@portabletext/editor';
import { DocsQuizBlock } from './quiz.js';

/** The portable Docs members. A host can disable any member without changing stored data. */
export const DOCS_BLOCK_TYPES = [
  'accordion',
  'tabs',
  'table',
  'callout',
  'code',
  'docImage',
  'embed',
  'math',
  'nodes',
  'quiz',
  'raw',
  'tsDocs',
] as const;
export type DocsBlockType = (typeof DOCS_BLOCK_TYPES)[number];
export type DocsBlockOptions = Partial<Record<DocsBlockType | 'inlineMath', boolean>>;
export type RichBlock = { _type: string; _key?: string; markdown?: string; [key: string]: unknown };

export function enabledDocsBlocks(options: DocsBlockOptions = {}): DocsBlockType[] {
  return DOCS_BLOCK_TYPES.filter((type) => options[type] !== false);
}

export const DOCS_BLOCK_FIELDS: Record<
  DocsBlockType,
  { name: string; type: 'string' | 'number' | 'boolean' | 'array' | 'object' }[]
> = {
  accordion: [
    { name: 'items', type: 'array' },
    { name: 'markdown', type: 'string' },
  ],
  tabs: [
    { name: 'items', type: 'array' },
    { name: 'markdown', type: 'string' },
  ],
  table: [
    { name: 'header', type: 'string' },
    { name: 'rows', type: 'array' },
    { name: 'markdown', type: 'string' },
  ],
  callout: [
    { name: 'kind', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'content', type: 'array' },
    { name: 'markdown', type: 'string' },
  ],
  code: [
    { name: 'language', type: 'string' },
    { name: 'source', type: 'string' },
    { name: 'value', type: 'string' },
    { name: 'markdown', type: 'string' },
  ],
  docImage: [
    { name: 'alt', type: 'string' },
    { name: 'url', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'width', type: 'string' },
    { name: 'height', type: 'string' },
    { name: 'markdown', type: 'string' },
  ],
  embed: [
    { name: 'src', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'width', type: 'string' },
    { name: 'height', type: 'string' },
    { name: 'markdown', type: 'string' },
  ],
  math: [
    { name: 'code', type: 'string' },
    { name: 'inline', type: 'boolean' },
    { name: 'markdown', type: 'string' },
  ],
  nodes: [
    { name: 'nodes', type: 'array' },
    { name: 'edges', type: 'array' },
    { name: 'direction', type: 'string' },
    { name: 'height', type: 'number' },
    { name: 'nodeSep', type: 'number' },
    { name: 'rankSep', type: 'number' },
    { name: 'proximityConnect', type: 'boolean' },
    { name: 'markdown', type: 'string' },
  ],
  quiz: [{ name: 'markdown', type: 'string' }],
  raw: [{ name: 'markdown', type: 'string' }],
  tsDocs: [
    { name: 'scope', type: 'string' },
    { name: 'markdown', type: 'string' },
  ],
};

const defaults: Record<DocsBlockType, RichBlock> = {
  accordion: { _type: 'accordion', items: [{ title: 'Item', content: [] }] },
  tabs: { _type: 'tabs', items: [{ title: 'Tab', content: [] }] },
  table: { _type: 'table', header: 'Table', rows: [] },
  callout: { _type: 'callout', kind: 'info', title: 'Note', content: [] },
  code: { _type: 'code', language: 'text', value: '' },
  docImage: { _type: 'docImage', alt: '', url: '' },
  embed: { _type: 'embed', src: '', title: '' },
  math: { _type: 'math', code: '', inline: false },
  nodes: { _type: 'nodes', nodes: [], edges: [], direction: 'TB' },
  quiz: { _type: 'quiz' },
  raw: { _type: 'raw', markdown: '' },
  tsDocs: { _type: 'tsDocs', scope: '' },
};
export function defaultDocsBlock(type: DocsBlockType): RichBlock {
  return structuredClone(defaults[type]);
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(text).join(' ');
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return text(item.markdown ?? item.text ?? item.children ?? item.content ?? '');
  }
  return '';
}
function sUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value, 'https://docs.invalid');
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

function renderPortableTextChild(
  child: unknown,
  markDefinitions: Map<string, Record<string, unknown>>,
  key: string,
): JSX.Element | string | null {
  if (!child || typeof child !== 'object') return null;
  const member = child as Record<string, unknown>;
  if (member._type === 'math') return <DocsRichBlock key={key} block={member as RichBlock} />;
  if (member._type !== 'span') return null;

  const textValue = typeof member.text === 'string' ? member.text : '';
  let node: ReactNode = textValue
    .split('\n')
    .flatMap((line, i) => (i ? [<br key={`${key}-br-${i}`} />, line] : [line]));
  const marks = Array.isArray(member.marks) ? member.marks : [];
  for (const mark of marks) {
    if (typeof mark !== 'string') continue;
    if (mark === 'strong') node = <strong key={`${key}-strong`}>{node}</strong>;
    else if (mark === 'em') node = <em key={`${key}-em`}>{node}</em>;
    else if (mark === 'underline') node = <u key={`${key}-underline`}>{node}</u>;
    else if (mark === 'strike-through') node = <del key={`${key}-strike`}>{node}</del>;
    else if (mark === 'code') node = <code key={`${key}-code`}>{node}</code>;
    else {
      const definition = markDefinitions.get(mark);
      const href = sUrl(definition?.href);
      if (href)
        node = (
          <a key={`${key}-link`} href={href}>
            {node}
          </a>
        );
    }
  }
  return <span key={key}>{node}</span>;
}

function PortableTextBlockView({ block }: { block: RichBlock }): JSX.Element {
  const style = typeof block.style === 'string' ? block.style : 'normal';
  const Tag = /^h[2-6]$/.test(style)
    ? (style as 'h2' | 'h3' | 'h4' | 'h5' | 'h6')
    : style === 'blockquote'
      ? 'blockquote'
      : 'p';
  const definitions = Array.isArray(block.markDefs) ? block.markDefs : [];
  const markDefinitions = new Map(
    definitions.flatMap((i) =>
      i && typeof i === 'object' && typeof i._key === 'string'
        ? [[i._key, i as Record<string, unknown>] as const]
        : [],
    ),
  );
  const children = Array.isArray(block.children) ? block.children : [];
  const rendered = children.map((child, i) =>
    renderPortableTextChild(child, markDefinitions, `portable-${i}`),
  );
  if (block.listItem === 'bullet')
    return (
      <ul>
        <li>{rendered}</li>
      </ul>
    );
  if (block.listItem === 'number')
    return (
      <ol>
        <li>{rendered}</li>
      </ol>
    );
  return <Tag>{rendered}</Tag>;
}
function nestedMarkdown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return docsValueToMarkdown(value as never).trimEnd();
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if (typeof item.markdown === 'string' && item.markdown) return item.markdown;
    if (Array.isArray(item.content)) return docsValueToMarkdown(item.content as never).trimEnd();
    return text(item);
  }
  return '';
}
function NestedContent({ value }: { value: unknown }): JSX.Element {
  if (Array.isArray(value))
    return (
      <>
        {value.map((member, index) => (
          <NestedContent key={index} value={member} />
        ))}
      </>
    );
  if (!value || typeof value !== 'object')
    return typeof value === 'string' ? (
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />
    ) : (
      <>{text(value)}</>
    );

  const member = value as RichBlock;
  if (member._type === 'block' || member._type === 'block')
    return <PortableTextBlockView block={member} />;
  if (typeof member._type === 'string' && DOCS_BLOCK_TYPES.includes(member._type as DocsBlockType))
    return <DocsRichBlock block={member} />;
  if (Array.isArray(member.content) && member.content.length)
    return <NestedContent value={member.content} />;
  if (typeof member.markdown === 'string')
    return <div dangerouslySetInnerHTML={{ __html: renderMarkdown(member.markdown) }} />;
  return <>{text(member)}</>;
}
function Diagram({ block }: { block: RichBlock }): JSX.Element {
  const nodes = (Array.isArray(block.nodes) ? block.nodes : []).filter(
    (node): node is Record<string, unknown> => Boolean(node) && typeof node === 'object',
  );
  const edges = (Array.isArray(block.edges) ? block.edges : []).filter(
    (edge): edge is Record<string, unknown> => Boolean(edge) && typeof edge === 'object',
  );
  const horizontal = block.direction === 'LR';
  const width = horizontal ? Math.max(320, nodes.length * 180) : 320;
  const height = horizontal ? 140 : Math.max(140, nodes.length * 100);
  const positions = new Map(
    nodes.map((node, i) => [
      String(node.id ?? i),
      horizontal ? { x: 90 + i * 180, y: 70 } : { x: 160, y: 70 + i * 100 },
    ]),
  );
  return (
    <figure className="docs-diagram">
      <svg role="img" aria-label="Document diagram" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <marker
            id="docs-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const from = positions.get(String(edge.source ?? ''));
          const to = positions.get(String(edge.target ?? ''));
          return from && to ? (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="currentColor"
              markerEnd="url(#docs-arrow)"
            />
          ) : null;
        })}
        {nodes.map((node, i) => {
          const point = positions.get(String(node.id ?? i))!;
          const data =
            node.data && typeof node.data === 'object'
              ? (node.data as Record<string, unknown>)
              : {};
          return (
            <g key={i}>
              <rect
                x={point.x - 75}
                y={point.y - 24}
                width="150"
                height="48"
                rx="7"
                fill="white"
                stroke="currentColor"
              />
              <text x={point.x} y={point.y + 5} textAnchor="middle">
                {text(data.title ?? node.id)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        {nodes.length} nodes, {edges.length} connections
      </figcaption>
    </figure>
  );
}

/** Read-only rendering for every reusable Docs member. Unknown data stays in the value. */
export function DocsRichBlock({ block }: { block: RichBlock }): JSX.Element {
  const items = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : [];
  switch (block._type) {
    case 'block':
    case 'block':
      return <PortableTextBlockView block={block} />;
    case 'accordion':
      return (
        <div className="docs-accordions">
          {items.map((v, i) => (
            <details key={i}>
              <summary>{text(v.title)}</summary>
              <div>
                <NestedContent value={v} />
              </div>
            </details>
          ))}
        </div>
      );
    case 'tabs':
      return (
        <div className="docs-tabs" role="tablist">
          {items.map((v, i) => (
            <details key={i} open={i === 0}>
              <summary>{text(v.title)}</summary>
              <div>
                <NestedContent value={v} />
              </div>
            </details>
          ))}
        </div>
      );
    case 'table':
      return (
        <section className="docs-table">
          <strong>{text(block.header)}</strong>
          <table>
            <tbody>
              {(Array.isArray(block.rows) ? block.rows : []).map((row, i) => (
                <tr key={i}>
                  {(Array.isArray((row as Record<string, unknown>).cells)
                    ? ((row as Record<string, unknown>).cells as unknown[])
                    : []
                  ).map((cell, j) => (
                    <td key={j}>
                      <NestedContent value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      );
    case 'callout': {
      const content = Array.isArray(block.content) ? (block.content as RichBlock[]) : [];
      const markdown = typeof block.markdown === 'string' ? block.markdown : undefined;
      return (
        <aside
          className={`docs-callout docs-callout-${text(block.kind).replace(/[^a-z0-9-]/gi, '') || 'info'}`}
        >
          <strong>{text(block.title)}</strong>
          <div>
            <NestedContent value={content.length ? content : (markdown ?? '')} />
          </div>
        </aside>
      );
    }
    case 'code':
      return (
        <pre className="docs-code">
          <code data-language={text(block.language)}>{text(block.value)}</code>
        </pre>
      );
    case 'docImage':
      return sUrl(block.url) ? (
        <figure>
          <img src={sUrl(block.url)} alt={text(block.alt)} />
          <figcaption>{text(block.title)}</figcaption>
        </figure>
      ) : (
        <p>Image URL unavailable</p>
      );
    case 'embed':
      return sUrl(block.src) ? (
        <iframe
          title={text(block.title) || 'Embedded content'}
          src={sUrl(block.src)}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      ) : (
        <p>Embed URL unavailable</p>
      );
    case 'math': {
      const code = text(block.code);
      const html = katex.renderToString(code, {
        displayMode: !block.inline,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
      });
      return block.inline ? (
        <span
          className="docs-math"
          aria-label={code}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div
          className="docs-math"
          aria-label={code}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case 'nodes':
      return <Diagram block={block} />;
    case 'raw':
      return (
        <div
          className="docs-raw"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text(block.markdown)) }}
        />
      );
    case 'tsDocs':
      return (
        <section className="docs-tsdocs">
          <strong>TypeScript: {text(block.scope)}</strong>
          {block.markdown && <p>{text(block.markdown)}</p>}
        </section>
      );
    case 'quiz':
      return <DocsQuizBlock />;
    default:
      return (
        <pre data-unsupported-block={block._type}>{block.markdown ?? JSON.stringify(block)}</pre>
      );
  }
}

function BlockEditor({
  block,
  path,
  readOnly,
}: {
  block: RichBlock;
  path: Path;
  readOnly: boolean;
}): JSX.Element {
  const editor = useEditor();
  const [expanded, setExpanded] = useState(false);
  const type = block._type as DocsBlockType;
  const fields = DOCS_BLOCK_FIELDS[type] ?? [];
  const set = (props: Record<string, unknown>) =>
    editor.send({ type: 'block.set', at: path, props });
  const update = (field: string, n: unknown) =>
    set({
      [field]: n,
      ...(type === 'callout' && (field === 'title' || field === 'kind')
        ? {}
        : { markdown: field === 'markdown' ? n : '' }),
    });
  const items = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : [];
  const rows = Array.isArray(block.rows) ? (block.rows as Record<string, unknown>[]) : [];
  const nodes = Array.isArray(block.nodes) ? (block.nodes as Record<string, unknown>[]) : [];
  const edges = Array.isArray(block.edges) ? (block.edges as Record<string, unknown>[]) : [];
  return (
    <div className="docs-rich-editor">
      <DocsRichBlock block={block} />
      {!readOnly && (
        <>
          <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            Edit {type}
          </button>
          {expanded && (
            <div className="docs-rich-fields">
              {fields.map((field) => {
                const value = block[field.name];
                if (field.name === 'items')
                  return (
                    <fieldset key="items">
                      <legend>Items</legend>
                      {items.map((v, r) => (
                        <div className="docs-rich-item" key={r}>
                          <label>
                            Title
                            <input
                              value={text(v.title)}
                              onChange={(event) =>
                                set({
                                  items: items.map((entry, i) =>
                                    i === r
                                      ? { ...entry, title: event.currentTarget.value }
                                      : entry,
                                  ),
                                  markdown: '',
                                })
                              }
                            />
                          </label>
                          <label>
                            Content
                            <textarea
                              value={nestedMarkdown(v)}
                              onChange={(event) =>
                                set({
                                  items: items.map((entry, i) =>
                                    i === r
                                      ? { ...entry, markdown: event.currentTarget.value }
                                      : entry,
                                  ),
                                  markdown: '',
                                })
                              }
                            />
                          </label>
                          <button
                            onClick={() =>
                              set({ items: items.filter((_entry, i) => i !== r), markdown: '' })
                            }
                          >
                            Remove item
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          set({
                            items: [...items, { title: 'Item', markdown: '', content: [] }],
                            markdown: '',
                          })
                        }
                      >
                        Add item
                      </button>
                    </fieldset>
                  );
                if (field.name === 'rows')
                  return (
                    <fieldset key="rows">
                      <legend>Table rows</legend>
                      {rows.map((row, rowIndex) => {
                        const cells = Array.isArray(row.cells)
                          ? (row.cells as Record<string, unknown>[])
                          : [];
                        return (
                          <div key={rowIndex} className="docs-rich-item">
                            {cells.map((cell, cellIndex) => (
                              <label key={cellIndex}>
                                Cell {cellIndex + 1}
                                <input
                                  value={text(cell.content ?? cell.markdown)}
                                  onChange={(event) =>
                                    set({
                                      rows: rows.map((entry, i) =>
                                        i === rowIndex
                                          ? {
                                              ...entry,
                                              cells: cells.map((current, j) =>
                                                j === cellIndex
                                                  ? {
                                                      ...current,
                                                      markdown: event.currentTarget.value,
                                                      content: [],
                                                    }
                                                  : current,
                                              ),
                                            }
                                          : entry,
                                      ),
                                      markdown: '',
                                    })
                                  }
                                />
                              </label>
                            ))}
                            <button
                              onClick={() =>
                                set({
                                  rows: rows.map((entry, i) =>
                                    i === rowIndex
                                      ? {
                                          ...entry,
                                          cells: [
                                            ...cells,
                                            { _type: 'cell', content: [], markdown: '' },
                                          ],
                                        }
                                      : entry,
                                  ),
                                  markdown: '',
                                })
                              }
                            >
                              Add cell
                            </button>
                            <button
                              onClick={() =>
                                set({
                                  rows: rows.filter((_entry, i) => i !== rowIndex),
                                  markdown: '',
                                })
                              }
                            >
                              Remove row
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() =>
                          set({
                            rows: [
                              ...rows,
                              {
                                _type: 'row',
                                cells: [{ _type: 'cell', content: [], markdown: '' }],
                              },
                            ],
                            markdown: '',
                          })
                        }
                      >
                        Add row
                      </button>
                    </fieldset>
                  );
                if (field.name === 'nodes')
                  return (
                    <fieldset key="nodes">
                      <legend>Diagram nodes</legend>
                      {nodes.map((node, v) => (
                        <div key={v} className="docs-rich-item">
                          <label>
                            ID
                            <input
                              value={text(node.id)}
                              onChange={(event) =>
                                set({
                                  nodes: nodes.map((entry, i) =>
                                    i === v ? { ...entry, id: event.currentTarget.value } : entry,
                                  ),
                                  markdown: '',
                                })
                              }
                            />
                          </label>
                          <label>
                            Title
                            <input
                              value={text(
                                (node.data as Record<string, unknown> | undefined)?.title,
                              )}
                              onChange={(event) =>
                                set({
                                  nodes: nodes.map((entry, i) =>
                                    i === v
                                      ? {
                                          ...entry,
                                          data: {
                                            ...((entry.data as Record<string, unknown>) ?? {}),
                                            title: event.currentTarget.value,
                                          },
                                        }
                                      : entry,
                                  ),
                                  markdown: '',
                                })
                              }
                            />
                          </label>
                          <button
                            onClick={() =>
                              set({ nodes: nodes.filter((_entry, i) => i !== v), markdown: '' })
                            }
                          >
                            Remove node
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          set({
                            nodes: [
                              ...nodes,
                              { id: crypto.randomUUID(), type: 'process', data: { title: 'Node' } },
                            ],
                            markdown: '',
                          })
                        }
                      >
                        Add node
                      </button>
                    </fieldset>
                  );
                if (field.name === 'edges')
                  return (
                    <fieldset key="edges">
                      <legend>Connections</legend>
                      {edges.map((edge, v) => (
                        <div key={v} className="docs-rich-item">
                          {(['source', 'target'] as const).map((name) => (
                            <label key={name}>
                              {name}
                              <select
                                value={text(edge[name])}
                                onChange={(event) =>
                                  set({
                                    edges: edges.map((entry, i) =>
                                      i === v
                                        ? { ...entry, [name]: event.currentTarget.value }
                                        : entry,
                                    ),
                                    markdown: '',
                                  })
                                }
                              >
                                {nodes.map((node) => (
                                  <option key={text(node.id)} value={text(node.id)}>
                                    {text(
                                      (node.data as Record<string, unknown> | undefined)?.title ??
                                        node.id,
                                    )}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                          <button
                            onClick={() =>
                              set({ edges: edges.filter((_entry, i) => i !== v), markdown: '' })
                            }
                          >
                            Remove connection
                          </button>
                        </div>
                      ))}
                      <button
                        disabled={nodes.length < 2}
                        onClick={() =>
                          set({
                            edges: [
                              ...edges,
                              {
                                id: crypto.randomUUID(),
                                source: nodes[0]?.id,
                                target: nodes[1]?.id,
                              },
                            ],
                            markdown: '',
                          })
                        }
                      >
                        Add connection
                      </button>
                    </fieldset>
                  );
                if (field.name === 'content')
                  return (
                    <label key="content">
                      Content
                      <textarea
                        value={typeof block.markdown === 'string' ? block.markdown : text(value)}
                        onChange={(event) => set({ markdown: event.currentTarget.value })}
                      />
                    </label>
                  );
                return (
                  <label key={field.name}>
                    {field.name}
                    {field.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) => update(field.name, event.currentTarget.checked)}
                      />
                    ) : (
                      <textarea
                        value={String(value ?? '')}
                        onChange={(event) =>
                          update(
                            field.name,
                            field.type === 'number'
                              ? Number(event.currentTarget.value)
                              : event.currentTarget.value,
                          )
                        }
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function docsBlockNodes(options: DocsBlockOptions = {}) {
  const nodes = enabledDocsBlocks(options).map((type) =>
    defineBlockObject({
      type,
      render: ({ attributes: attrs, children, node, path, readOnly }) => (
        <div {...attrs} data-docs-block={type} contentEditable={false}>
          <BlockEditor block={node as RichBlock} path={path} readOnly={readOnly} />
          {children}
        </div>
      ),
    }),
  );
  if (options.inlineMath !== false)
    nodes.push(
      defineInlineObject({
        type: 'math',
        render: ({ attributes: attrs, children, node }) => (
          <span {...attrs} contentEditable={false}>
            <DocsRichBlock block={{ ...(node as RichBlock), _type: 'math', inline: true }} />
            {children}
          </span>
        ),
      }) as never,
    );
  return nodes;
}

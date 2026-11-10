import katex from 'katex';
import type { JSX, ReactNode } from 'react';
import { DocsQuizBlock } from './quiz.js';
import * as TerraQualityRegex from '../lib/terra/regex.mjs';
import { MarkdownAccordion, MarkdownTabs } from './MarkdownComponents.js';
import { MarkdownContent } from './MarkdownContent.js';
import { DOCS_BLOCK_TYPES } from '../lib/block-types.js';
import type { DocsBlockType, RichBlock } from '../lib/block-types.js';
import { stringifyDocBody } from '../lib/terra/runtime/content/document-markdown.js';
import type { DocBody } from '../lib/terra/runtime/types.js';

/** The portable Docs members. A host can disable any member without changing stored data. */
export { DOCS_BLOCK_TYPES, enabledDocsBlocks } from '../lib/block-types.js';
export type { DocsBlockOptions, DocsBlockType, RichBlock } from '../lib/block-types.js';

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

export function defaultDocsBlock(type: DocsBlockType): RichBlock {
  return structuredClone(
    {
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
    }[type],
  );
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
    return ['https:', 'http:', 'mailto:'].includes(new URL(value, 'https://docs.invalid').protocol)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function PortableTextBlockView({ block }: { block: RichBlock }): JSX.Element {
  const style = typeof block.style === 'string' ? block.style : 'normal';
  const Tag = TerraQualityRegex.REGEX_H_2_6_REGEX().test(style)
    ? (style as 'h2' | 'h3' | 'h4' | 'h5' | 'h6')
    : style === 'blockquote'
      ? 'blockquote'
      : 'p';
  const rendered = (Array.isArray(block.children) ? block.children : []).map((child, i) =>
    (function renderPortableTextChild(child: unknown, key: string): JSX.Element | string | null {
      if (!child || typeof child !== 'object') return null;
      const member = child as Record<string, unknown>;
      if (member._type === 'math') return <DocsRichBlock key={key} block={member as RichBlock} />;
      if (member._type !== 'span') return null;

      let node: ReactNode = (typeof member.text === 'string' ? member.text : '')
        .split('\n')
        .flatMap((line, i) => (i ? [<br key={`${key}-br-${i}`} />, line] : [line]));
      for (const mark of Array.isArray(member.marks) ? member.marks : []) {
        if (typeof mark !== 'string') continue;
        if (mark === 'strong') node = <strong key={`${key}-strong`}>{node}</strong>;
        else if (mark === 'em') node = <em key={`${key}-em`}>{node}</em>;
        else if (mark === 'underline') node = <u key={`${key}-underline`}>{node}</u>;
        else if (mark === 'strike-through') node = <del key={`${key}-strike`}>{node}</del>;
        else if (mark === 'code') node = <code key={`${key}-code`}>{node}</code>;
        else {
          const href = sUrl(
            (Array.isArray(block.markDefs) ? block.markDefs : []).find(
              (definition) =>
                definition &&
                typeof definition === 'object' &&
                typeof definition._key === 'string' &&
                definition._key === mark,
            )?.href,
          );
          if (href)
            node = (
              <a key={`${key}-link`} href={href}>
                {node}
              </a>
            );
        }
      }
      return <span key={key}>{node}</span>;
    })(child, `portable-${i}`),
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
function NestedContent({ value }: { value: unknown }): JSX.Element {
  if (Array.isArray(value))
    return (
      <>
        {value.map((member, i) => (
          <NestedContent key={i} value={member} />
        ))}
      </>
    );
  if (!value || typeof value !== 'object')
    return typeof value === 'string' ? <MarkdownContent markdown={value} /> : <>{text(value)}</>;

  const member = value as RichBlock;
  if (member._type === 'block') return <PortableTextBlockView block={member} />;
  if (typeof member._type === 'string' && DOCS_BLOCK_TYPES.includes(member._type as DocsBlockType))
    return <DocsRichBlock block={member} />;
  if (Array.isArray(member.content) && member.content.length)
    return <NestedContent value={member.content} />;
  if (typeof member.markdown === 'string') return <MarkdownContent markdown={member.markdown} />;
  return <>{text(member)}</>;
}

function NestedMarkdown({ item }: { item: Record<string, unknown> }): JSX.Element {
  return (
    <MarkdownContent
      markdown={
        stringifyDocBody(
          Array.isArray(item.content) ? (item.content as unknown as DocBody) : undefined,
        ) || (typeof item.markdown === 'string' ? item.markdown : '')
      }
    />
  );
}

/** Read-only rendering for every reusable Docs member. Unknown data stays in the value. */
export function DocsRichBlock({ block }: { block: RichBlock }): JSX.Element {
  const items = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : [];
  switch (block._type) {
    case 'block':
      return <PortableTextBlockView block={block} />;
    case 'accordion':
      return (
        <MarkdownAccordion
          items={items.map((i) => ({
            title: text(i.title),
            content: <NestedMarkdown item={i} />,
          }))}
        />
      );
    case 'tabs':
      return (
        <MarkdownTabs
          items={items.map((i) => ({
            title: text(i.title),
            content: <NestedMarkdown item={i} />,
          }))}
        />
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
      return (
        <aside
          className={`docs-callout docs-callout-${text(block.kind).replace(TerraQualityRegex.REGEX_A_Z0_9_GI_REGEX(), '') || 'info'}`}
        >
          <strong>{text(block.title)}</strong>
          <div>
            <NestedContent
              value={
                content.length ? content : typeof block.markdown === 'string' ? block.markdown : ''
              }
            />
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
        <span className="docs-math" aria-label={code} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="docs-math" aria-label={code} dangerouslySetInnerHTML={{ __html: html }} />
      );
    }
    case 'nodes':
      return (function Diagram(block: RichBlock): JSX.Element {
        const nodes = (Array.isArray(block.nodes) ? block.nodes : []).filter(
          (node): node is Record<string, unknown> => Boolean(node) && typeof node === 'object',
        );
        const edges = (Array.isArray(block.edges) ? block.edges : []).filter(
          (edge): edge is Record<string, unknown> => Boolean(edge) && typeof edge === 'object',
        );
        const horizontal = block.direction === 'LR';
        const positions = new Map(
          nodes.map((node, i) => [
            String(node.id ?? i),
            horizontal ? { x: 90 + i * 180, y: 70 } : { x: 160, y: 70 + i * 100 },
          ]),
        );
        return (
          <figure className="docs-diagram">
            <svg
              role="img"
              aria-label="Document diagram"
              viewBox={`0 0 ${horizontal ? Math.max(320, nodes.length * 180) : 320} ${horizontal ? 140 : Math.max(140, nodes.length * 100)}`}
            >
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
                      {text(
                        (node.data && typeof node.data === 'object'
                          ? (node.data as Record<string, unknown>).title
                          : undefined) ?? node.id,
                      )}
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
      })(block);
    case 'raw':
      return <pre>{text(block.markdown)}</pre>;
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

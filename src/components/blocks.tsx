/**
 * src/components/blocks.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import katex from 'katex';
import { docsValueToMarkdown } from '../lib/markdown-model.js';

// COMPONENTS
import * as TerraQualityRegex from '../lib/terra/regex.mjs';
import { DocsQuizBlock } from './quiz.js';
import { DocsMarkdown } from './MarkdownContent.js';

// DATA
import { DOCS_BLOCK_TYPES } from '../lib/block-types.js';

// TYPES
import type {
  DocsBlockOptions,
  DocsBlockType,
  DocsEditorBlockType,
  RichBlock,
} from '../lib/block-types.js';
import type { JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export const DOCS_BLOCK_FIELDS: Record<
  DocsEditorBlockType,
  { name: string; type: 'string' | 'number' | 'boolean' | 'array' | 'object' }[]
> = {
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

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates a fresh default payload for one supported Docs editor block type.
 * @param type Editor block type to initialize.
 * @returns A cloned rich block with its required fields and empty editable content.
 */
export function defaultDocsBlock(type: DocsEditorBlockType): RichBlock {
  return structuredClone(
    {
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

/**
 * Extracts display text recursively from strings, arrays, and common rich-content fields.
 * @param v Value, nested content, or rich block to read.
 * @returns Human-readable text, with array entries separated by spaces.
 */
function text(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(text).join(' ');
  if (v && typeof v === 'object') {
    const item = v as Record<string, unknown>;
    return text(item.markdown ?? item.text ?? item.children ?? item.content ?? '');
  }
  return '';
}

/**
 * Accepts HTTP, HTTPS, and mailto destinations while rejecting other protocols.
 * @param value Candidate URL, including a permitted relative URL.
 * @returns The original non-empty URL string when its resolved protocol is allowed, otherwise `undefined`.
 */
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

/**
 * Renders a Portable Text block with its style, decorators, links, lists, and inline math.
 * @param block Text block and its optional children, marks, and link definitions.
 * @returns A semantic heading, paragraph, list, blockquote, or inline-content element.
 */
function PortableTextBlockView({ block }: { block: RichBlock }): JSX.Element {
  const children =
    typeof block.children === 'string'
      ? [{ _type: 'span', text: block.children, marks: [] }]
      : Array.isArray(block.children)
        ? block.children
        : [];
  const style = typeof block.style === 'string' ? block.style : 'normal';
  const Tag = TerraQualityRegex.REGEX_H_2_6_REGEX().test(style)
    ? (style as 'h2' | 'h3' | 'h4' | 'h5' | 'h6')
    : style === 'blockquote'
      ? 'blockquote'
      : 'p';
  /**
   * Renders one Portable Text span or inline math child with its marks and link definitions.
   * @param child Portable Text child value supplied by the host document.
   * @param key Stable React key derived from the parent block position.
   * @returns The supported inline element, plain text, or `null` for unsupported child types.
   */
  const renderPortableTextChild = (child: unknown, key: string): JSX.Element | string | null => {
    if (!child || typeof child !== 'object') return null;
    const member = child as Record<string, unknown>;
    if (member._type === 'math') return <DocsRichBlock key={key} block={member as RichBlock} />;
    if (member._type !== 'span') return null;
    let node: ReactNode = (typeof member.text === 'string' ? member.text : '')
      .split('\n')
      .flatMap((l, i) => (i ? [<br key={`${key}-br-${i}`} />, l] : [l]));
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
            (d) => d && typeof d === 'object' && typeof d._key === 'string' && d._key === mark,
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
  };
  const rendered = children.map((c, i) => renderPortableTextChild(c, `portable-${i}`));
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

/**
 * Recursively renders nested rich content, falling back to Markdown or readable text for unknown shapes.
 * @param value Nested Docs value, block, Markdown string, or scalar content.
 * @param options Optional feature flags passed into nested Markdown and block rendering.
 * @returns Rendered child nodes for the nested value.
 */
function NestedContent({
  value,
  options,
}: {
  value: unknown;
  options?: DocsBlockOptions | undefined;
}): JSX.Element {
  if (Array.isArray(value))
    return (
      <>
        {value.map((m, i) => (
          <NestedContent key={i} value={m} options={options} />
        ))}
      </>
    );
  if (!value || typeof value !== 'object')
    return typeof value === 'string' ? (
      <DocsMarkdown markdown={value} options={options} />
    ) : (
      <>{text(value)}</>
    );
  const member = value as RichBlock;
  if (member._type === 'block') return <PortableTextBlockView block={member} />;
  if (typeof member._type === 'string' && DOCS_BLOCK_TYPES.includes(member._type as DocsBlockType))
    return <DocsRichBlock block={member} options={options} />;
  if (Array.isArray(member.content) && member.content.length)
    return <NestedContent value={member.content} options={options} />;
  if (typeof member.markdown === 'string')
    return <DocsMarkdown markdown={member.markdown} options={options} />;
  return <>{text(member)}</>;
}

/**
 * Read-only rendering for every reusable Docs member. Unknown data stays in the value.
 *
 * @param block Rich block value to render, including its type-specific fields.
 * @param options Optional rich-block feature flags for nested content.
 * @returns The read-only React representation of the block; disabled tabs and accordions retain their Markdown source.
 */
export function DocsRichBlock({
  block,
  options,
}: {
  block: RichBlock;
  options?: DocsBlockOptions | undefined;
}): JSX.Element {
  if (block._type === 'tabs' || block._type === 'accordion') {
    const markdown = docsValueToMarkdown([block] as unknown as Parameters<
      typeof docsValueToMarkdown
    >[0]);
    if (options?.[block._type] === false)
      return <pre data-docs-unsupported-block={block._type}>{markdown}</pre>;
    return <DocsMarkdown markdown={markdown} options={options} />;
  }
  switch (block._type) {
    case 'block':
      return <PortableTextBlockView block={block} />;
    case 'table':
      return (
        <section className="docs-table">
          <strong>{text(block.header)}</strong>
          <table>
            <tbody>
              {(Array.isArray(block.rows) ? block.rows : []).map((r, i) => (
                <tr key={i}>
                  {(Array.isArray((r as Record<string, unknown>).cells)
                    ? ((r as Record<string, unknown>).cells as unknown[])
                    : []
                  ).map((cell, j) => (
                    <td key={j}>
                      <NestedContent value={cell} options={options} />
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
              options={options}
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
    case 'nodes': {
      /**
       * Renders a simple flow diagram from the node and edge data stored in a rich block.
       * @param block Rich block containing optional nodes, edges, direction, and label fields.
       * @returns An accessible figure whose SVG positions follow the requested orientation.
       */
      const renderDiagram = (block: RichBlock): JSX.Element => {
        const nodes = (Array.isArray(block.nodes) ? block.nodes : []).filter(
          (n): n is Record<string, unknown> => Boolean(n) && typeof n === 'object',
        );
        const edges = (Array.isArray(block.edges) ? block.edges : []).filter(
          (e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object',
        );
        const horizontal = block.direction === 'LR';
        const positions = new Map(
          nodes.map((n, i) => [
            String(n.id ?? i),
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
              {edges.map((e, i) => {
                const from = positions.get(String(e.source ?? ''));
                const to = positions.get(String(e.target ?? ''));
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
              {nodes.map((n, i) => {
                const point = positions.get(String(n.id ?? i))!;
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
                        (n.data && typeof n.data === 'object'
                          ? (n.data as Record<string, unknown>).title
                          : undefined) ?? n.id,
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
      };
      return renderDiagram(block);
    }
    case 'raw': {
      const markdown = text(block.markdown);
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(markdown.trim())) return <hr data-docs-raw-divider />;
      return <pre>{markdown}</pre>;
    }
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

/** The portable Docs members. A host can disable any member without changing stored data. */
export { DOCS_BLOCK_TYPES, enabledDocsBlocks } from '../lib/block-types.js';
export type {
  DocsBlockOptions,
  DocsBlockType,
  DocsEditorBlockType,
  RichBlock,
} from '../lib/block-types.js';

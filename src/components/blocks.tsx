/**
 * src/components/blocks.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import katex from 'katex';
import { DataTableContent } from '@terra-symposium/styling/ui';
import { docsValueToMarkdown } from '../lib/markdown-model.js';

// COMPONENTS
import * as TerraQualityRegex from '../lib/terra/regex.mjs';
import { DocsQuizBlock } from './quiz.js';
import { DocsBlocks, DocsMarkdown } from './MarkdownContent.js';
import { NodesBlock } from './terra/editor/docs/_Nodes.js';
import { CodeBlock } from './terra/editor/docs/_CodeBlock.js';

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
 *
 * @param type Editor block type to initialize.
 *
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
 *
 * @param v Value, nested content, or rich block to read.
 *
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
 *
 * @param value Candidate URL, including a permitted relative URL.
 *
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
 *
 * @param block Text block and its optional children, marks, and link definitions.
 *
 * @returns A semantic heading, paragraph, list, blockquote, or inline-content element.
 */
function PortableTextBlockView({ block }: { block: RichBlock }): JSX.Element {
  const style = typeof block.style === 'string' ? block.style : 'normal';
  const Tag = TerraQualityRegex.REGEX_H_2_6_REGEX().test(style)
    ? (style as 'h2' | 'h3' | 'h4' | 'h5' | 'h6')
    : style === 'blockquote'
      ? 'blockquote'
      : 'p';
  /**
   * Renders one Portable Text span or inline math child with its marks and link definitions.
   *
   * @param child Portable Text child value supplied by the host document.
   * @param key Stable React key derived from the parent block position.
   *
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
  const rendered = (
    typeof block.children === 'string'
      ? [{ _type: 'span', text: block.children, marks: [] }]
      : Array.isArray(block.children)
        ? block.children
        : []
  ).map((c, i) => renderPortableTextChild(c, `portable-${i}`));
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
  return <Tag {...(typeof block.id === 'string' ? { id: block.id } : {})}>{rendered}</Tag>;
}

/**
 * Recursively renders nested rich content, falling back to Markdown or readable text for unknown shapes.
 *
 * @param value Nested Docs value, block, Markdown string, or scalar content.
 * @param options Optional feature flags passed into nested Markdown and block rendering.
 *
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
    return value.every(
      (item) => item && typeof item === 'object' && typeof item._type === 'string',
    ) ? (
      <DocsBlocks blocks={value as RichBlock[]} options={options} />
    ) : (
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
  if (member._type === 'tabs' || member._type === 'accordion') {
    // Existing Portable Text records live in consumer-owned stores. Convert those records at the
    // ingestion boundary; all newly authored groups and all visible output use Markdown + DocsMarkdown.
    return (
      <DocsMarkdown
        markdown={docsValueToMarkdown([member] as unknown as Parameters<
          typeof docsValueToMarkdown
        >[0])}
        options={options}
      />
    );
  }
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
 *
 * @returns The read-only React representation of one structured Docs block.
 *
 * @docsId embeds-and-custom-blocks
 * @docsUseWhen An external resource or host-registered component adds needed context at this point in the reading path.
 * @docsConstraint Embed only when a reader needs to inspect the resource in the page; use a descriptive link when they only need the destination.
 * @docsConstraint Host-managed custom blocks and reusable leaves must be registered and resolvable in the active host.
 * @docsConstraint Verify authorization and access behavior before presenting an embed as working.
 * @docsDo Provide a resolvable leaf ID when using a reusable leaf embed.
 * @docsDo Document custom block props and keep attachment embeds near their explanation.
 * @docsDo Preserve unknown or disabled structured source in a recoverable form.
 * @docsDont Do not present an unregistered component or unauthorized URL as working.
 * @docsDont Do not discard unknown source or display raw JSON as ordinary prose.
 * @docsTip Use an attachment’s Visual embed when the reader needs the image in place; otherwise link to it.
 * @docsRenderKind embed
 * @docsDo External embed: use when readers need to inspect the resource here; otherwise link to it.
 * @docsDo Reusable leaf: resolve a valid leaf ID and embed only when the host registers the component.
 * @docsDo Host custom block: register and document the component and its props before use.
 * @docsDo Attachment embed: select an existing authorized file and use Visual embed beside its explanation.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/insert-attachment.png | Docs Insert content menu with Add attachment highlighted
 * @docsInsertionStep For a host-managed file, choose + Insert content → Add attachment and select the authorized file.
 * @docsInsertionStep Choose Visual embed when the reader needs to inspect it in place; otherwise link to it.
 * @docsInsertionStep For Markdown embeds or custom blocks, verify the URL, scope, registration, and access in the target host.
 * @docsSyntax
 * ```mdx
 * The reader needs the related guide in place:
 *
 * <Embed src="/consumer/1-usage/0-tree/" title="Tree" />
 * ```
 * @docsRenderedExample
 * The reader needs the Tree reference in place:
 */
export function DocsRichBlock({
  block,
  options,
}: {
  block: RichBlock;
  options?: DocsBlockOptions | undefined;
}): JSX.Element {
  switch (block._type) {
    case 'block':
      return <PortableTextBlockView block={block} />;
    case 'table': {
      const rows = (Array.isArray(block.rows) ? block.rows : []).map((row) =>
        row && typeof row === 'object' && Array.isArray((row as Record<string, unknown>).cells)
          ? ((row as Record<string, unknown>).cells as unknown[])
          : [],
      );
      return (
        <section data-docs-editor-block="DocsTable">
          {text(block.header) && text(block.header) !== 'Table' && (
            <h3 className="sr-only">{text(block.header)}</h3>
          )}
          <DataTableContent
            columns={Array.from(
              { length: rows.reduce((width, row) => Math.max(width, row.length), 0) },
              (_, i) => ({
                key: String(i),
                label: <NestedContent value={rows[0]?.[i]} options={options} />,
                render: (row: unknown[]) => <NestedContent value={row[i]} options={options} />,
              }),
            )}
            rows={rows.slice(1)}
            variant="default"
          />
        </section>
      );
    }
    case 'callout': {
      const content = Array.isArray(block.content) ? (block.content as RichBlock[]) : [];
      const kind =
        text(block.kind).toLowerCase().replace(TerraQualityRegex.REGEX_A_Z0_9_GI_REGEX(), '') ||
        'note';
      return (
        <aside className={`callout ${kind}`} data-docs-aside={kind}>
          <strong className="title">{text(block.title)}</strong>
          <div className="flow copy">
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
        <CodeBlock code={text(block.value)} language={text(block.language) || 'text'} tone="view" />
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
        <span className="math" aria-label={code} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="math" aria-label={code} dangerouslySetInnerHTML={{ __html: html }} />
      );
    }
    case 'nodes': {
      return <NodesBlock block={block as Parameters<typeof NodesBlock>[0]['block']} />;
    }
    case 'raw': {
      const markdown = text(block.markdown);
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(markdown.trim())) return <hr data-docs-raw-divider />;
      return <CodeBlock code={markdown} language="text" tone="view" />;
    }
    case 'tsDocs':
      return (
        <section className="tsdocs">
          <strong>TypeScript: {text(block.scope)}</strong>
          {block.markdown && <p>{text(block.markdown)}</p>}
        </section>
      );
    case 'quiz':
      return <DocsQuizBlock />;
    default:
      return (
        <div data-unsupported-block={block._type}>
          <CodeBlock code={block.markdown ?? JSON.stringify(block)} language="text" tone="view" />
        </div>
      );
  }
}

/**
 * The portable Docs members. A host can disable any member without changing stored data.
 */
export { DOCS_BLOCK_TYPES, enabledDocsBlocks } from '../lib/block-types.js';
export type {
  DocsBlockOptions,
  DocsBlockType,
  DocsEditorBlockType,
  RichBlock,
} from '../lib/block-types.js';

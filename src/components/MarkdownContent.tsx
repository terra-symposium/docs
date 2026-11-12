/**
 * src/components/MarkdownContent.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { docsValueToMarkdown, markdownToDocsValue } from '../lib/markdown-model.js';

// COMPONENTS
import { DocsRichBlock } from './blocks.js';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@terra-symposium/styling/ui';

// TYPES
import type { DocsBlockOptions } from '../lib/block-types.js';
import type { JSX } from 'react';
import type { RichBlock } from './blocks.js';

/** Props used by the shared React renderer for Docs Markdown. */
export type DocsMarkdownProps = {
  /** Markdown source parsed into Docs content blocks. */
  markdown: string;
  /** Optional block capabilities forwarded to parsing and rendering. */
  options?: DocsBlockOptions | undefined;
};

/** One parsed list item plus its normalized descendants and nesting depth. */
type MarkdownListNode = {
  block: RichBlock;
  children: MarkdownListNode[];
  level: number;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders Docs Markdown through the shared view and editor block components.
 *
 * @param markdown - Source Markdown whose block syntax is converted to Docs values.
 * @param options - Host-specific block renderers available to the conversion.
 *
 * @returns React elements for converted rich blocks, including shared tabs and accordions.
 */
export function DocsMarkdown({ markdown, options }: DocsMarkdownProps): JSX.Element {
  const blocks = markdownToDocsValue(markdown, options) as RichBlock[];
  const output: JSX.Element[] = [];
  for (let index = 0; index < blocks.length;) {
    const block = blocks[index]!;
    if (isMarkdownListItem(block)) {
      const run: RichBlock[] = [];
      while (index < blocks.length && isMarkdownListItem(blocks[index]!))
        run.push(blocks[index++]!);
      output.push(<MarkdownList key={block._key ?? index} blocks={run} />);
      continue;
    }
    if (block._type === 'tabs' || block._type === 'accordion')
      output.push(<MarkdownGroup key={block._key ?? index} block={block} options={options} />);
    else output.push(<DocsRichBlock key={block._key ?? index} block={block} options={options} />);
    index += 1;
  }
  return <>{output}</>;
}

/**
 * Renders adjacent Markdown list blocks as one semantic list with nested items.
 * @param blocks Consecutive list blocks produced from the Markdown source.
 * @returns Nested ordered or unordered lists that retain the items' marker and depth.
 */
function MarkdownList({ blocks }: { blocks: RichBlock[] }): JSX.Element {
  const roots: MarkdownListNode[] = [];
  const parents: MarkdownListNode[] = [];
  for (const block of blocks) {
    const level = Math.max(1, Number(block.level) || 1);
    while (parents.length && parents.at(-1)!.level >= level) parents.pop();
    const node: MarkdownListNode = { block, children: [], level };
    const parent = parents.at(-1);
    if (level > 1 && parent) parent.children.push(node);
    else roots.push(node);
    parents.push(node);
  }
  return <>{renderListNodes(roots)}</>;
}

/**
 * Builds list elements for sibling items with matching marker type and depth.
 * @param nodes List items at one depth in their original order.
 * @returns One or more nested list elements grouped by bullet or ordered markers.
 */
function renderListNodes(nodes: MarkdownListNode[]): JSX.Element[] {
  const output: JSX.Element[] = [];
  for (let index = 0; index < nodes.length;) {
    const first = nodes[index]!;
    const marker = first.block.listItem;
    const group = [];
    while (
      index < nodes.length &&
      nodes[index]!.block.listItem === marker &&
      nodes[index]!.level === first.level
    )
      group.push(nodes[index++]!);
    const items = group.map(({ block: b, children: c }, i) => {
      const content = { ...b };
      delete content.listItem;
      delete content.level;
      return (
        <li key={b._key ?? i}>
          <DocsRichBlock block={content} />
          {renderListNodes(c)}
        </li>
      );
    });
    output.push(
      marker === 'number' ? (
        <ol key={`${first.block._key ?? index}-list`} data-docs-list-level={first.level}>
          {items}
        </ol>
      ) : (
        <ul key={`${first.block._key ?? index}-list`} data-docs-list-level={first.level}>
          {items}
        </ul>
      ),
    );
  }
  return output;
}

/**
 * Checks whether a parsed Portable Text block represents a Markdown list item.
 * @param block Parsed Docs value to inspect.
 * @returns `true` when the block carries a bullet or ordered-list marker.
 */
function isMarkdownListItem(block: RichBlock): boolean {
  return block._type === 'block' && (block.listItem === 'bullet' || block.listItem === 'number');
}

/**
 * Renders a parsed Markdown tab or accordion group with the shared Styling controls.
 * @param block Group type and ordered items emitted by the Markdown parser.
 * @param options Rich-block capabilities passed to nested Markdown bodies.
 * @returns An interactive Styling tab group or accordion with Markdown-rendered item bodies.
 */
function MarkdownGroup({
  block,
  options,
}: {
  block: Record<string, unknown>;
  options?: DocsBlockOptions | undefined;
}): JSX.Element {
  const items = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : [];
  /**
   * Converts one group's stored content to Markdown before sending it through the shared renderer.
   * @param item Tab or accordion item with either parsed child content or a Markdown fallback.
   * @returns The item's Markdown source, preferring its structured `content` field when available.
   */
  const body = (item: Record<string, unknown>): string => {
    const content = Array.isArray(item.content) ? item.content : [];
    return content.length
      ? docsValueToMarkdown(content as Parameters<typeof docsValueToMarkdown>[0])
      : typeof item.markdown === 'string'
        ? item.markdown
        : '';
  };
  if (block._type === 'tabs')
    return (
      <Tabs defaultValue="tab-0">
        <TabsList>
          {items.map((i, v) => (
            <TabsTrigger key={v} value={`tab-${v}`}>
              {typeof i.title === 'string' && i.title ? i.title : `Tab ${v + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>
        {items.map((i, v) => (
          <TabsContent key={v} value={`tab-${v}`}>
            <DocsMarkdown markdown={body(i)} options={options} />
          </TabsContent>
        ))}
      </Tabs>
    );
  return (
    <Accordion type="multiple">
      {items.map((i, v) => (
        <AccordionItem key={v} value={`accordion-${v}`}>
          <AccordionTrigger>
            {typeof i.title === 'string' && i.title ? i.title : `Item ${v + 1}`}
          </AccordionTrigger>
          <AccordionContent>
            <DocsMarkdown markdown={body(i)} options={options} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/** Internal compatibility name for existing Docs components using this renderer. */
export { DocsMarkdown as MarkdownContent };

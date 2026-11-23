/**
 * src/components/MarkdownContent.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { markdownToDocsValue } from '../lib/markdown-model.js';

// COMPONENTS
import { DocsRichBlock } from './blocks.js';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Checkbox,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@terra-symposium/styling/ui';

// TYPES
import type { DocsBlockOptions } from '../lib/block-types.js';
import type { JSX } from 'react';
import type { RichBlock } from './blocks.js';

/**
 * Props used by the shared React renderer for Docs Markdown.
 */
export type DocsMarkdownProps = {
  /**
   * Markdown source parsed into Docs content blocks.
   */
  markdown: string;
  /**
   * Optional block capabilities forwarded to parsing and rendering.
   */
  options?: DocsBlockOptions | undefined;
};

/**
 * One parsed list item plus its normalized descendants and nesting depth.
 */
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
 *
 * @docsId lists-and-links
 * @docsUseWhen Group related points, ordered actions, or destinations a reader may need next.
 * @docsConstraint Each list item, including nested items and checklist entries, is at most 75 characters excluding its marker.
 * @docsConstraint Bullets represent unordered facts; numbered lists represent dependent actions in order.
 * @docsDo Keep one idea per item and preserve order when actions depend on it.
 * @docsDo Put supporting details in short nested items under their owning point.
 * @docsDo Use prose outside the list if a point cannot be split without losing meaning.
 * @docsDo Use descriptive links whose labels name the destination or reader outcome.
 * @docsDo Use [ ] and [x] for read-only checklist states, marking complete only after checking.
 * @docsDont Do not number unordered facts or use “click here” as the only link label.
 * @docsDont Do not mark a checklist item complete before verifying it.
 * @docsTip If a long list has comparable attributes, consider a table; otherwise keep the list.
 * @docsTip For lists too long to scan, consider a table only if items share comparable attributes.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/formatting.png | Docs editor toolbar with the Link button
 * @docsInsertionStep Enter `-`, `1.`, or checklist markers in Markdown source for the required list type.
 * @docsInsertionStep For a link, select its label, choose Link, and enter the destination.
 * @docsInsertionStep Preview list nesting, order, checklist state, and destination.
 * @docsSyntax
 * ```mdx
 * - Save the updated value.
 *   - Docs reports edits through `onChange`.
 *   - The host chooses when and where to persist them.
 *
 * 1. Make an edit.
 * 2. Save the result.
 *
 * - [ ] Check the rendered route.
 *
 * [Read Docs setup](../../../0-configuration/0-install/)
 * ```
 * @docsRenderedExample
 * - The host receives the value.
 * - The host chooses when to save it.
 *
 * 1. Pass `onChange` to Docs.
 * 2. Save the updated value.
 *
 * - [ ] Check the rendered route.
 *
 * [Read Docs setup](../../../0-configuration/0-install/)
 */
export function DocsMarkdown({ markdown, options }: DocsMarkdownProps): JSX.Element {
  return (
    <DocsBlocks blocks={markdownToDocsValue(markdown, options) as RichBlock[]} options={options} />
  );
}

/**
 * Render structured Docs blocks with the same list grouping used for Markdown.
 *
 * @param blocks - Rich blocks in document order.
 * @param options - Optional renderer and block configuration.
 *
 * @returns React elements for the grouped document blocks.
 *
 */
export function DocsBlocks({
  blocks,
  options,
}: {
  blocks: RichBlock[];
  options?: DocsBlockOptions | undefined;
}): JSX.Element {
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
 *
 * @param blocks Consecutive list blocks produced from the Markdown source.
 *
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
 *
 * @param nodes List items at one depth in their original order.
 *
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
      const spans = Array.isArray(content.children)
        ? (content.children as Record<string, unknown>[])
        : [];
      const first = spans[0];
      const task =
        marker === 'bullet' && typeof first?.text === 'string'
          ? first.text.match(/^\[( |x)\] /)
          : null;
      if (task && first)
        content.children = [
          { ...first, text: (first.text as string).slice(task[0].length) },
          ...spans.slice(1),
        ];
      return (
        <li key={b._key ?? i} className={task ? 'relative list-none' : undefined}>
          {task && (
            <Checkbox
              checked={task[1] === 'x'}
              disabled
              aria-label={task[1] === 'x' ? 'Completed item' : 'Incomplete item'}
              className="absolute -left-5 top-1"
            />
          )}
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
 *
 * @param block Parsed Docs value to inspect.
 *
 * @returns `true` when the block carries a bullet or ordered-list marker.
 */
function isMarkdownListItem(block: RichBlock): boolean {
  return block._type === 'block' && (block.listItem === 'bullet' || block.listItem === 'number');
}

/**
 * Renders a parsed Markdown tab or accordion group with the shared Styling controls.
 *
 * @param block Group type and ordered items emitted by the Markdown parser.
 * @param options Rich-block capabilities passed to nested Markdown bodies.
 *
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
   * Renders parsed group content directly, or parses its Markdown fallback.
   *
   * @param item Tab or accordion item with either parsed child content or a Markdown fallback.
   *
   * @returns The item's rendered content.
   */
  const body = (item: Record<string, unknown>): JSX.Element => {
    const content = Array.isArray(item.content) ? item.content : [];
    return content.length ? (
      <DocsBlocks blocks={content as RichBlock[]} options={options} />
    ) : (
      <DocsMarkdown
        markdown={typeof item.markdown === 'string' ? item.markdown : ''}
        options={options}
      />
    );
  };
  if (block._type === 'tabs') return <MarkdownTabs items={items} body={body} />;
  return <MarkdownAccordions items={items} body={body} />;
}

// hygiene-ignore single-use -- Astro MDX maps this named renderer as a custom Markdown component.
/**
 * Renders mutually exclusive routes that reach the same outcome.
 *
 * @param items Ordered alternatives with reader-facing tab titles.
 * @param body Renders the parsed Markdown body for one alternative.
 *
 * @returns A tab list with one complete route visible at a time.
 *
 * @docsId tabs
 * @docsUseWhen Present alternatives that reach the same outcome and require one reader choice.
 * @docsConstraint Tabs are for mutually exclusive alternatives that reach the same outcome.
 * @docsConstraint Keep facts shared by all alternatives before the tabs.
 * @docsConstraint Each alternative must be titled and complete; number actions in reading order.
 * @docsConstraint Local and Hosted procedures, platform-specific commands, and other either/or paths must use titled tabs.
 * @docsDo Use tabs for alternatives the reader must choose between.
 * @docsDo Keep each tab directive adjacent to the other alternatives.
 * @docsDont Do not put alternatives in side-by-side table columns.
 * @docsDont Do not use tabs for information readers need all at once or for consecutive steps.
 * @docsTip When one option’s information does not apply to another, tabs make the choice explicit.
 * @docsDo Keep shared facts before the alternatives; each tab body should be a complete route with its own numbered steps.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/editor-toolbar.png | Docs editor toolbar; it has no Tabs insertion button
 * @docsInsertionStep Tabs have no toolbar insertion button. Add adjacent titled `|||[Title]` directives in Markdown source.
 * @docsInsertionStep Keep shared facts before the alternatives and give each tab a complete route.
 * @docsInsertionStep Switch through every tab in View mode.
 * @docsSyntax
 * ```mdx
 * Choose the workflow that matches your project:
 *
 * |||[Local]
 *
 * 1. Edit the Markdown file.
 * 2. Rebuild the site.
 *
 * |||
 *
 * |||[Hosted]
 *
 * 1. Save through the host adapter.
 * 2. Confirm the reader route.
 *
 * |||
 * ```
 * @docsRenderedExample
 * Choose the workflow that matches your project:
 *
 * |||[Local]
 *
 * 1. Edit the Markdown file.
 * 2. Rebuild the site.
 *
 * |||
 *
 * |||[Hosted]
 *
 * 1. Save through the host adapter.
 * 2. Confirm the reader route.
 *
 * |||
 */
export function MarkdownTabs({
  items,
  body,
}: {
  items: Record<string, unknown>[];
  body: (item: Record<string, unknown>) => JSX.Element;
}): JSX.Element {
  return (
    <Tabs defaultValue="tab-0">
      <TabsList
        variant="line"
        className="mb-0 w-full justify-start gap-0 border-b border-primary-6"
      >
        {items.map((item, i) => (
          <TabsTrigger
            key={i}
            value={`tab-${i}`}
            variant="primary-underline"
            selection="line"
            className="-mb-px rounded-none border-0 bg-transparent px-4 py-2 font-normal text-primary-11 shadow-none hover:bg-transparent hover:text-primary-12 enabled:hover:no-underline after:bg-primary-9 data-[state=active]:font-semibold data-[state=active]:text-primary-12"
          >
            {typeof item.title === 'string' && item.title ? item.title : `Tab ${i + 1}`}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item, i) => (
        <TabsContent
          key={i}
          value={`tab-${i}`}
          className="docs-block-stack mt-0 rounded-b-sm border border-t-0 border-primary-6 p-4"
        >
          {body(item)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// hygiene-ignore single-use -- Astro MDX maps this named renderer as a custom Markdown component.
/**
 * Renders independent cases that readers may inspect in any order.
 *
 * @param items Independent entries with reader-facing accordion headings.
 * @param body Renders the parsed Markdown body for one entry.
 *
 * @returns A group of expandable items, one per independent case.
 *
 * @docsId accordions
 * @docsUseWhen Let readers inspect parallel details without forcing every detail into the main reading path.
 * @docsConstraint Accordion items are independent cases, examples, questions, or optional explanations in one category.
 * @docsConstraint Shared context, required actions, decisions, and serious warnings remain visible outside collapsed content.
 * @docsConstraint A stack of callouts serving one purpose should become titled accordion items.
 * @docsDo Give each item a title naming its case and its own supporting detail.
 * @docsDo Put an example aside inside the item it illustrates, retaining its boundary.
 * @docsDo Put each delimiter on its own line with blank lines around the body.
 * @docsDont Do not combine unrelated details in one item or split one ordered procedure across items.
 * @docsDont Do not hide a required action or warning in a closed panel.
 * @docsDont An aside does not replace an accordion when several parallel items need titles.
 * @docsTip A run of same-purpose callouts is a cue to group them; test each panel in View mode.
 * @docsDo An example aside may live inside the accordion item for its case; retain the aside boundary.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/editor-toolbar.png | Docs editor toolbar; it has no Accordion insertion button
 * @docsInsertionStep Accordions have no toolbar insertion button. Add adjacent titled `===[Title]` directives in Markdown source.
 * @docsInsertionStep Give each independent item its own supporting detail; keep required actions outside.
 * @docsInsertionStep Open every panel in View mode and check nested examples.
 * @docsSyntax
 * ```mdx
 * Optional cases can be inspected independently:
 *
 * ===[Local]
 *
 * Edit the Markdown file and rebuild the site.
 *
 * ===
 *
 * ===[Hosted]
 *
 * Save through the host adapter and confirm the reader route.
 *
 * ===
 * ```
 * @docsRenderedExample
 * Optional cases can be inspected independently:
 *
 * ===[Local]
 *
 * Edit the Markdown file and rebuild the site.
 *
 * ===
 *
 * ===[Hosted]
 *
 * Save through the host adapter and confirm the reader route.
 *
 * ===
 */
export function MarkdownAccordions({
  items,
  body,
}: {
  items: Record<string, unknown>[];
  body: (item: Record<string, unknown>) => JSX.Element;
}): JSX.Element {
  return (
    <Accordion type="multiple" variant="sm">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`accordion-${i}`} className="docs-accordion-item">
          <AccordionTrigger>
            {typeof item.title === 'string' && item.title ? item.title : `Item ${i + 1}`}
          </AccordionTrigger>
          <AccordionContent className="docs-block-stack">{body(item)}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/**
 * Internal compatibility name for existing Docs components using this renderer.
 */
export { DocsMarkdown as MarkdownContent };

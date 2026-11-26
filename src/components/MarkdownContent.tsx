/**
 * src/components/MarkdownContent.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { markdownToDocsValue } from '../lib/markdown-model.js';
import { markdownHeadingDepthIssues } from '../lib/block-types.js';
import { useDocsQuizContext, parseDocsAuthoredQuiz } from './quiz.js';
import { useCallback, useEffect, useMemo } from 'react';

// COMPONENTS
import { DocsRichBlock } from './blocks.js';
import { Checkbox, Tabs, TabsContent, TabsList, TabsTrigger } from '@terra-symposium/styling/ui';

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
 * @docsConstraint Keep each list item at or below 75 characters.
 * @docsConstraint Use bullets for facts and numbers for ordered actions.
 * @docsConstraint Turn parallel points in prose into a Markdown list.
 * @docsConstraint Give each list one purpose.
 * @docsDo Keep one idea per item and preserve order when actions depend on it.
 * @docsDo Put short supporting details under their owning point.
 * @docsDo Use descriptive links whose labels name the destination or reader outcome.
 * @docsDo Mark a checklist complete only after verifying it.
 * @docsDont Do not number unordered facts or use “click here” as a link label.
 * @docsTip Use a table only when list items share comparable attributes.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/formatting.png | Docs editor toolbar with the Link button
 * @docsInsertionStep Enter `-`, `1.`, or checklist markers in Markdown source.
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
  const quizContext = useDocsQuizContext();
  const parsed = useMemo(() => {
    if (markdownHeadingDepthIssues(markdown).length)
      return {
        blocks: [
          {
            _type: 'block',
            _key: 'learning-heading-error',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'learning-heading-error-text',
                text: 'Invalid page: use H2 and H3 headings only.',
                marks: [],
              },
            ],
          },
        ] as RichBlock[],
        pageQuiz: null,
      };
    const blocks = markdownToDocsValue(markdown, options) as RichBlock[];
    if (!quizContext) return { blocks, pageQuiz: null };
    const quizBlock = blocks.at(-1);
    const heading = blocks.at(-2);
    if (
      quizBlock?._type !== 'quiz' ||
      heading?._type !== 'block' ||
      heading.style !== 'h2' ||
      blockText(heading).trim().toLowerCase() !== 'quiz' ||
      quizBlock.data === undefined
    )
      return { blocks, pageQuiz: null };
    try {
      return {
        blocks: blocks.slice(0, -2),
        pageQuiz: { quiz: parseDocsAuthoredQuiz(quizBlock.data) },
      };
    } catch {
      return { blocks, pageQuiz: null };
    }
  }, [markdown, options, Boolean(quizContext)]);
  const renderMarkdown = useCallback((source: string) => <DocsMarkdown markdown={source} />, []);
  const registerAuthoredQuiz = quizContext?.registerAuthoredQuiz;
  useEffect(() => {
    if (!registerAuthoredQuiz || !parsed.pageQuiz) return;
    registerAuthoredQuiz({
      quiz: parsed.pageQuiz.quiz,
      renderMarkdown,
    });
  }, [parsed.pageQuiz, registerAuthoredQuiz, renderMarkdown]);
  useEffect(() => {
    const authoredQuiz = quizContext?.authoredQuiz;
    if (!registerAuthoredQuiz || !authoredQuiz || authoredQuiz.renderMarkdown) return;
    registerAuthoredQuiz({ quiz: authoredQuiz.quiz, renderMarkdown });
  }, [quizContext?.authoredQuiz, registerAuthoredQuiz, renderMarkdown]);
  return <DocsBlocks blocks={parsed.blocks} options={options} />;
}

/** Extracts visible text from a Portable Text heading to detect the final Quiz section. */
function blockText(block: RichBlock): string {
  return Array.isArray(block.children)
    ? block.children
        .map((child) =>
          child && typeof child === 'object' && 'text' in child && typeof child.text === 'string'
            ? child.text
            : '',
        )
        .join('')
    : '';
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
 * Renders related, parallel methods, versions, or modes for one shared reader question.
 *
 * @param items Ordered alternatives with reader-facing tab titles.
 * @param body Renders the parsed Markdown body for one alternative.
 *
 * @returns A tab list with one complete route visible at a time.
 *
 * @docsId tabs
 * @docsUseWhen Compare related, parallel alternatives that perform the same task or answer the same question.
 * @docsConstraint Use tabs for alternatives that answer the same question.
 * @docsConstraint Keep shared facts before the tabs.
 * @docsConstraint Give each alternative a complete explanation and concise title.
 * @docsConstraint Align the order of parallel explanations when useful.
 * @docsConstraint Use titled tabs for Local and Hosted alternatives.
 * @docsDo Put each full alternative inside its tab.
 * @docsDo Keep tab directives adjacent.
 * @docsDont Do not put alternatives in side-by-side table columns.
 * @docsDont Do not tab steps or mechanisms used together.
 * @docsDont Keep facts shared by all options outside the tabs.
 * @docsTip Check that every tab answers the same question.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/editor-toolbar.png | Docs editor toolbar; it has no Tabs insertion button
 * @docsInsertionStep Add adjacent titled `|||[Title]` directives in Markdown.
 * @docsInsertionStep Put each alternative's full explanation inside its tab.
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
 * @param items Independent entries with reader-facing accordion labels.
 * @param body Renders the parsed Markdown body for one entry.
 *
 * @returns A group of expandable items, one per independent case.
 *
 * @docsId accordions
 * @docsUseWhen Let readers inspect parallel details without forcing every detail into the main reading path.
 * @docsConstraint Keep accordion items independent and in one category.
 * @docsConstraint Keep required actions and shared context outside collapsed content.
 * @docsConstraint Group same-purpose callouts in titled accordion items.
 * @docsDo Give each item a label naming its case and its own supporting detail.
 * @docsDo Put each example inside the item it illustrates.
 * @docsDo Put each delimiter on its own line with blank lines around the body.
 * @docsDont Do not combine unrelated details in one item.
 * @docsDont Do not split one ordered procedure across items.
 * @docsDont Do not hide a required action or warning in a closed panel.
 * @docsDont Use an accordion when there are no independent items.
 * @docsTip Open every panel in View mode.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/editor-toolbar.png | Docs editor toolbar; it has no Accordion insertion button
 * @docsInsertionStep Add adjacent titled `===[Title]` directives in Markdown.
 * @docsInsertionStep Keep required actions outside closed panels.
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
    <div className="docs-markdown-accordions">
      {items.map((item, i) => (
        <details key={i} className="docs-markdown-accordion">
          <summary className="docs-markdown-accordion-trigger">
            {typeof item.title === 'string' && item.title ? item.title : `Item ${i + 1}`}
            <span className="docs-markdown-accordion-icon" aria-hidden="true">
              ⌄
            </span>
          </summary>
          <div className="docs-markdown-accordion-content docs-block-stack">{body(item)}</div>
        </details>
      ))}
    </div>
  );
}

/**
 * Internal compatibility name for existing Docs components using this renderer.
 */
export { DocsMarkdown as MarkdownContent };

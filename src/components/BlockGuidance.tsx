/**
 * src/components/BlockGuidance.tsx
 * Renders source-backed usage guidance and paired block examples.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { DocsMarkdown } from './MarkdownContent.js';
import { DocsRichBlock } from './blocks.js';
import Nodes from './terra/flow/Nodes.js';
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
import type { JSX } from 'react';
import type { RichBlock } from './blocks.js';

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

export type BlockGuidanceEntry = {
  /** Exported symbol whose TSDoc provides this block's source material. */
  symbol: string;
  /** Reader need that signals when this block is useful. */
  useWhen: string;
  /** Positive authoring practices and recommendations, combined from do and tip tags. */
  dos: string[];
  /** Constraints and misuses, combined from constraint and don't tags. */
  donts: string[];
  /** Ordered steps for inserting or authoring the block in its supported workflow. */
  insertionSteps: string[];
  /** Fenced MDX source paired with the rendered example. */
  code: string;
  /** Markdown content paired with the rendered example, including any needed lead-in. */
  renderedExample: string;
  /** Renderer used when the example needs a host or rich-block component. */
  renderKind: 'markdown' | 'nodes' | 'embed' | 'quiz' | 'tsdocs';
  /** Restored editor screenshots that illustrate insertion controls or formatting. */
  editorImages: { src: string; alt: string }[];
};

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Shows one block's reader purpose, render/source example, and three expandable guidance areas.
 *
 * @param entry Generated fields for one block, sourced from its implementation TSDoc.
 *
 * @returns The reader purpose, example tabs, and Do, Do not, and insertion accordions.
 */
export function BlockGuidance({ entry }: { entry: BlockGuidanceEntry }): JSX.Element {
  const guidance = [
    { id: 'do', title: '✅ Do', items: entry.dos },
    { id: 'dont', title: '🚫 Do not', items: entry.donts },
    { id: 'insertion', title: '🖱️ Insertion steps', items: entry.insertionSteps },
  ];

  return (
    <div className="block-guidance">
      {/* DESCRIPTION */}
      <p>{entry.useWhen}</p>

      {/* RENDER */}
      {/* Keep the paired visual and authored forms above the expandable authoring guidance. */}
      <section className="my-3">
        <Tabs defaultValue="rendered">
          <TabsList
            variant="line"
            className="mb-0 w-full justify-start gap-0 border-b border-primary-6"
          >
            <TabsTrigger value="rendered" variant="primary-underline" selection="line">
              🖥️ Rendered
            </TabsTrigger>
            <TabsTrigger value="code" variant="primary-underline" selection="line">
              💻 Code (MDX)
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="rendered"
            className="docs-block-stack mt-0 rounded-b-sm border border-t-0 border-primary-6 p-4"
          >
            {entry.renderKind === 'nodes' ? (
              <>
                <Nodes
                  direction="LR"
                  height={180}
                  nodes={[
                    {
                      id: 'source',
                      type: 'origin',
                      position: { x: 0, y: 0 },
                      data: { title: 'Docs receives edit' },
                    },
                    {
                      id: 'host',
                      type: 'terminator',
                      position: { x: 0, y: 0 },
                      data: { title: 'Host saves value' },
                    },
                  ]}
                  edges={[{ id: 'save', source: 'source', target: 'host' }]}
                />
                <DocsMarkdown markdown={entry.renderedExample} />
              </>
            ) : entry.renderKind === 'embed' ? (
              <>
                <DocsMarkdown markdown={entry.renderedExample} />
                <DocsRichBlock
                  block={
                    {
                      _type: 'embed',
                      src: '/consumer/1-usage/0-tree/',
                      title: 'Tree',
                    } as RichBlock
                  }
                />
              </>
            ) : entry.renderKind === 'quiz' ? (
              <>
                <DocsMarkdown markdown={entry.renderedExample} />
                <DocsRichBlock block={{ _type: 'quiz' } as RichBlock} />
              </>
            ) : entry.renderKind === 'tsdocs' ? (
              <>
                <DocsMarkdown markdown={entry.renderedExample} />
                <DocsRichBlock
                  block={{ _type: 'tsDocs', scope: '@terra-symposium/docs' } as RichBlock}
                />
              </>
            ) : (
              <DocsMarkdown markdown={entry.renderedExample} />
            )}
          </TabsContent>
          <TabsContent
            value="code"
            className="docs-block-stack mt-0 rounded-b-sm border border-t-0 border-primary-6 p-4"
          >
            <DocsMarkdown markdown={entry.code} />
          </TabsContent>
        </Tabs>
      </section>

      {/* MERGED GUIDANCE */}
      <Accordion type="multiple" variant="sm" className="my-3">
        {guidance.map(({ id, title, items }) => (
          <AccordionItem key={id} value={id} className="docs-accordion-item">
            <AccordionTrigger>{title}</AccordionTrigger>
            <AccordionContent className="docs-block-stack">
              {id === 'insertion' ? (
                <ol className="my-0 pl-5">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : (
                <ul className="my-0 pl-5">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {id === 'insertion' && entry.editorImages.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {entry.editorImages.map((img) => (
                    <figure key={img.src} className="m-0">
                      <img src={img.src} alt={img.alt} />
                      <figcaption className="mt-1 text-sm">{img.alt}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

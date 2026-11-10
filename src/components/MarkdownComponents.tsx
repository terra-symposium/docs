import type { JSX, ReactNode } from 'react';
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

export type LabeledContent = { title: string; content: ReactNode };

/** Shared Styling implementation for Markdown tab groups. */
export function MarkdownTabs({ items }: { items: LabeledContent[] }): JSX.Element {
  return (
    <Tabs defaultValue="tab-0">
      <TabsList>
        {items.map((i, v) => (
          <TabsTrigger key={v} value={`tab-${v}`}>
            {i.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((i, v) => (
        <TabsContent key={v} value={`tab-${v}`}>
          {i.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Shared Styling implementation for Markdown accordions. */
export function MarkdownAccordion({ items }: { items: LabeledContent[] }): JSX.Element {
  return (
    <Accordion type="multiple">
      {items.map((i, v) => (
        <AccordionItem key={v} value={`accordion-${v}`}>
          <AccordionTrigger>{i.title}</AccordionTrigger>
          <AccordionContent>{i.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

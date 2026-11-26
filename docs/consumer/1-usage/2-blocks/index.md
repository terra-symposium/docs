---
title: Blocks
description: Choose Docs blocks to clarify a reader's task.
---

## Choosing Blocks

Start with the reader's task and the information hierarchy. Use a block when its shape makes a relationship easier to understand.

Before drafting a leaf, read the guidance for every block in this reference so the choice of blocks is informed. Apply each relevant rule to every instance, including examples and nested blocks. Check both the Markdown source and rendered result; a successful build does not replace those checks.

| 🧭 Need                                           | Use                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| Organise a page and explain its ideas             | [Meta](#meta), [Native Blocks](#native-blocks)                   |
| Compare, connect, or separate related information | [Native Blocks](#native-blocks), [Custom Blocks](#custom-blocks) |
| Add supporting material or practice               | [Custom Blocks](#custom-blocks)                                  |

:::caution[Reconsider the hierarchy]

When new content changes a relationship, revisit the headings, order, and groups. Do not keep the old structure by inertia, preserve lecture chronology automatically, or retain supplied groups without checking what readers need. Reconsider the page outline whenever a new block or example changes the relationship between ideas.

:::

:::note[Open a block section]

Each block shows its render/source example first, followed by accordion items for Do (including tips), Do not (including constraints), and insertion steps. In Edit mode, use **+ Insert content** for available blocks, then switch to View and check the result. The example has **Rendered** and **Code (MDX)** tabs. Tabs and accordions use adjacent Markdown source syntax; the toolbar does not insert them.

:::

## Frontmatter

===[Frontmatter example]

<DocsBlock data='{"_type":"blockGuidance","id":"frontmatter"}' />

===

## Native Blocks

### Prose

- Treat every paragraph over 400 characters as a red flag that needs a deliberate split, rewrite, or explanation for keeping it. A long paragraph is not acceptable merely because its sentences concern one broad topic.
- Do not use a table to hide a wall of prose or save space. Use a table only when multiple items share the same comparison fields. Use a list for parallel facts or ordered actions; use Nodes for flow, dependencies, hand-offs, or state changes. Separate explanations when they answer different questions.
- Lists, tables, and callouts still present text. Choose the block that explains the material: lists for grouped facts or actions, Nodes for relationships and movement, tables for shared comparison fields, and images when a visual detail itself matters. Reuse or crop a source image only when it teaches something the other blocks cannot show as clearly. Do not add images just to interrupt prose.
- Keep an H2 to three H3 children by default; four or more needs a specific reader reason. Count authored Markdown headings only. A source-supported, approved concept outline may need more distinct subconcepts; retain them when each names a necessary idea and fits its parent, and critique the structure instead of failing its count alone. Do not create a stack of H3s for minor details beneath one broad H2: merge near-duplicates or split the leaf when its reader goal has become too broad. Do not use a table to excuse a crowded heading tree, and do not create a practice heading for the concept it practises.
- Use an accordion only for two or more optional, self-contained peer items of the same kind that readers may choose to open independently. Repeated practice tasks or examples can qualify. A schedule, one topic, a sequence of dependent concepts, or essential explanation does not qualify. Do not use accordions to shorten a page or hide the lesson. Keep accordion titles concise; name the item, not an instruction sentence.
- Use tabs by default whenever two or more methods, algorithms, protocol versions, or configurations solve the same problem and each needs its own explanation. Give the shared question before the tabs, then make each option a complete, parallel peer. Put its full method-specific explanation, subheadings, diagrams, and examples inside the tab; a summary tab followed by separate method sections is invalid. Align the order and heading structure where the options share a learning route. Keep only shared facts or distinct follow-on concepts outside the tabs. Examples include client-server vs peer-to-peer, stop-and-wait vs Go-Back-N vs TCP recovery, recursive vs iterative DNS, HTTP versions, and alternative schedulers. A concise comparison table is not a reason to omit tabs when the alternatives need explanation. Keep shared conclusions visible after the tabs. Do not tab prerequisites, dependent phases, complementary mechanisms, a whole leaf, or unrelated concepts; when readers need A before B, use visible headings in that order.
- Put a worked example directly after the concept or method it demonstrates, in a `:::example` callout. A callout is one compact demonstration, not a container for the lesson: keep it to about 80 words or one code fragment of at most 8 lines, and use only one short prose explanation or one small table when needed. Show one concrete input or situation, the essential reasoning, and its result. Never put a complete runnable program, paired client/server files, multiple code blocks, a long table, or setup and troubleshooting instructions in a callout. Put substantial demonstrations in a named subsection with ordinary prose and fenced code; use tabs when the complete demonstrations are parallel methods. Follow the subsection with a brief callout only when one small input/output trace adds learning. Do not collect examples in a page-end “Examples” section, put them in tips, or hide one-off examples in accordions. Keep an example only when it clarifies a concept, method, or decision; remove redundant examples that add no distinct learning. For a valid method comparison, put each method's complete demonstration inside its tab, with compact example callouts where useful.
- During critique, first scan every concept and compare all candidates that do the same job, answer the same reader question, or provide versions of one service. Require tabs for each applicable set; do not only judge tabs already present. Record the exact alternatives and shared comparison question, or explain why an apparent candidate is sequential or complementary and therefore stays visible. Identify each accordion's exact peer items and why readers benefit from opening them independently. Inspect each example callout's rendered height and content: fail a callout that contains a complete program, paired client/server files, multiple code blocks, a long table, setup instructions, or troubleshooting steps. Keep callouts compact enough to read as one inline demonstration; move a substantial worked tutorial into a named subsection, with ordinary prose and code, or into parallel method tabs. Check that every retained example is beside the concept it demonstrates, not a tip or page-end collection. If the reviewer cannot name the relationship, the block fails; page length, convenience, and shared source location are not valid reasons.
- Avoid runs of tiny H2 sections and long explanations or example lists under one H2/H3. When one H3 contains several substantial explanations or many examples, first check whether they are genuinely comparable; use a compact table only for shared comparison fields. Otherwise use lists for parallel facts, Nodes for a process or relationship, keep distinct subconcepts visible under concise headings, or split the leaf if reader goals differ. Accordions remain limited to repeated optional peer items of the same kind.
- Never place two code blocks directly together. Combine one example, put alternatives in tabs or an accordion, or explain a meaningful difference between blocks.
- Keep the default page to 12 content-view heights at 1280 × 800 with accordions closed and tabs at their initial state. Treat the limit as a review signal, not permission to hide required content. Split distinct reader goals; shorten repetition and use blocks only when each one meets its content test.
- Remove meta commentary about how to read or navigate the documentation. Include interface directions only when they are part of the reader's actual task.

===[Prose example]

<DocsBlock data='{"_type":"blockGuidance","id":"prose"}' />

===

### Lists and links

===[Lists and links example]

<DocsBlock data='{"_type":"blockGuidance","id":"lists-and-links"}' />

===

### Code

===[Code example]

<DocsBlock data='{"_type":"blockGuidance","id":"code"}' />

===

### Tables

===[Tables example]

<DocsBlock data='{"_type":"blockGuidance","id":"tables"}' />

===

## Visual

### Diagrams

===[Diagram example]

<DocsBlock data='{"_type":"blockGuidance","id":"diagrams"}' />

===

### Images

===[Image example]

<DocsBlock data='{"_type":"blockGuidance","id":"images"}' />

===

### Embeds

===[Embed example]

<DocsBlock data='{"_type":"blockGuidance","id":"embeds-and-custom-blocks"}' />

===

## Interactive

### Tabs

===[Tabs example]

<DocsBlock data='{"_type":"blockGuidance","id":"tabs"}' />

===

### Accordions

An accordion group is a run of at least two adjacent, titled disclosures under one descriptive heading. Each disclosure is one item in the group. Use the group only when those items are optional, self-contained peers of the same kind and readers benefit from opening them independently. Repeated worked examples or troubleshooting cases may qualify, but never mix item kinds within a group. Keep each item's instructions, examples, conditions, and expected result together. Practice questions belong in a sibling `quiz.json` file when the lesson requires a quiz, not in accordion groups. A single disclosure, a timetable, a single subject, a dependent sequence, or essential orientation does not qualify: keep it visible in the page hierarchy, with one-off examples in a `:::example` callout. Accordions change presentation only; they are not a reason to summarize, omit, defer content to an attachment, or compress a long page.

Accordion labels are disclosure controls, not document headings. They do not belong in the page's heading outline and should not be counted as H3 siblings. Give the group a meaningful heading, then use concise labels to distinguish the expandable cases. Split a large group when the reader's goal changes; do not add a heading for every task just to create artificial hierarchy.

For university lessons, show an essential worked example in a `:::example[Worked example]` callout immediately after the explanation it demonstrates. Keep that aside to about 80 words or one code fragment of at most 8 lines; it must show one concrete input or situation, the essential reasoning, and the result. Never put a whole program, paired client/server files, several code blocks, a long table, or setup steps in an example callout. Move a substantial demonstration into a named subsection with ordinary prose and fenced code, or into complete parallel method tabs. Never label worked examples as tips or move them to an end-of-page collection. Remove a redundant example if it adds no distinct learning. Use `:::tip` for a short tip or warning; do not wrap a quiz prompt or answer in a callout. By default, omit practice questions; add a quiz only when the reader goal or source material requires one. Put all quiz data in `quiz.json` beside the leaf’s `index.md`; do not add a Quiz heading or component to the Markdown. Never scatter questions beneath the concepts they test. The JSON object contains `title` and `questions`; each question has `title`, `prompt`, and `answer` strings. Keep each string focused on its question or solution. The page-level **Quiz** button opens a dialog that shows one question at a time and reveals the answer on demand. Do not use an accordion for each quiz question. This pattern does not qualify ordinary prose, a schedule, or one-off essential content for an accordion. Keep task labels concise. The normal reading path must expose essential explanations and subject information.

Before publication, list every tab group and accordion group in the agent-side critique record and state which rule it satisfies: name at least two exact peer item titles in each accordion group and why readers benefit from opening them independently, or name the related parallel topics and shared comparison question for each tab set. Quiz questions belong in the sibling `quiz.json` file and never count as qualifying accordion items. Reject a single disclosure, a mismatched set, or a group whose only reason is that the page is long, the content arrived together, or the items are convenient to hide. Do not group a worked example with a practice task or mix examples with explanations. Verify that every `:::example` stays within the compact callout limit; complete programs, paired files, long tables, and setup procedures must appear as ordinary lesson content or inside parallel method tabs. Check the rendered callout at normal reading size. Verify examples use the `example` aside and the default page still teaches its subject and exposes essential information without opening a block.

=== [Accordion example]

<DocsBlock data='{"_type":"blockGuidance","id":"accordions"}' />

===

### Quiz

Quiz content is JSON only. Put a source-controlled bank in `quiz.json` beside the leaf’s `index.md`. Its object has a `title` and `questions` array; each question has a `title`, plus focused `prompt` and `answer` Markdown strings. Do not place callouts, tabs, or accordions inside them. Keep quiz data out of the Markdown. The static Docs site discovers and validates the sibling file, then presents it through a page-level **Quiz** button and dialog. Local or remote hosts using `DocsLocalWorkspace` or `DocsWorkspace` pass the parsed bank as `authoredQuiz`.

For a generated quiz, `<Quiz />` requests a host-backed quiz and needs no authored question data.

Example `quiz.json`:

```json
{
  "title": "Queue growth",
  "questions": [
    {
      "title": "Queue growth rate",
      "prompt": "Arrival is 500 packets/s and service is 350 packets/s. Find the queue growth rate.",
      "answer": "The queue grows at 500 − 350 = 150 packets/s while it is not full."
    }
  ]
}
```

Save the JSON file in the same leaf folder as `index.md`.

===[Quiz example]

<DocsBlock data='{"_type":"blockGuidance","id":"quiz"}' />

===

## Extensions

### Asides

Use `:::example[Worked example]` for one compact worked example, not as a lesson container and not as `:::tip`. Keep it to about 80 words or one code fragment of at most 8 lines. A complete program, paired client/server files, multiple code blocks, a long table, or setup procedure belongs in a named subsection or a complete parallel method tab, outside the aside. Close each aside with exactly the same number of colons as its opening line. Accordion and tab items are parsed as independent Markdown bodies, so do not add an extra colon to an aside closer merely because it appears inside an item. Check the rendered item at normal reading size to confirm it is concise, styled, and its full content remains inside it.

===[Aside example]

<DocsBlock data='{"_type":"blockGuidance","id":"asides"}' />

===

### Math

===[Math example]

<DocsBlock data='{"_type":"blockGuidance","id":"math"}' />

===

### Custom blocks

===[Custom block example]

<DocsBlock data='{"_type":"blockGuidance","id":"custom-blocks"}' />

===

### TypeScript docs

===[TypeScript example]

<DocsBlock data='{"_type":"blockGuidance","id":"typescript-docs"}' />

===

For the shared block contracts and host configuration, see the [API reference](../../../developer/component/blocks/).

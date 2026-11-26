---
title: Blocks
description: Choose Docs blocks to clarify a reader's task.
---

## Choosing blocks

Start with the reader's question and the relationship the page must show. Pick the block that makes that relationship easier to follow.

| 🧭 Reader need                   | Block              |
| -------------------------------- | ------------------ |
| 📖 Explain an idea               | Prose and headings |
| 📋 Group parallel facts or steps | Markdown list      |
| 🔀 Show flow or dependencies     | Nodes diagram      |
| 📊 Compare shared fields         | Table              |
| 🖼️ Explain a visual relationship | Image or diagram   |
| 🧪 Show one worked example       | Example aside      |
| ↔️ Compare parallel methods      | Tabs               |
| 🗂️ Reveal optional peer details  | Accordions         |

The table is a quick choice guide. Follow the sections below for each block's rules and rendered example.

:::caution[Recheck the hierarchy]

When new material changes a relationship, revisit the headings, order, and groups. Source order and supplied groups do not decide the reader's path.

:::

:::note[Read a block example]

Each block example pairs authoring guidance with its source and rendered preview. In Edit mode, use **+ Insert content** for supported blocks. Check the result in View mode as well.

:::

## Frontmatter

The title, description, route, and content identify a leaf. Follow the generated example below.

===[Frontmatter example]

<DocsBlock data='{"_type":"blockGuidance","id":"frontmatter"}' />

===

## Native blocks

### Prose and headings

Keep each paragraph on one idea. Treat paragraphs over 400 characters as a review signal. Move every sentence under the heading where it advances the explanation.

Put definitions in a labeled list item or table row. Keep relationships and reasoning in prose. If prose contains parallel points, make them a real Markdown list.

Use only H2 and H3 in Docs Markdown. The renderer rejects H4–H6 Markdown and HTML headings on every leaf. Keep each H2 focused and use H3 only for its true subconcepts.

===[Prose example]

<DocsBlock data='{"_type":"blockGuidance","id":"prose"}' />

===

### Lists and links

Give each list one clear purpose and each item one point, at most 75 visible characters including link labels and inline code. Split compound items when they contain separate facts or actions. A list over five items must be grouped under meaningful categories or changed to a more suitable structure; consecutive lists do not make a long list shorter. Number steps only when order matters. Use descriptive link text and check that each destination opens.

===[Lists and links example]

<DocsBlock data='{"_type":"blockGuidance","id":"lists-and-links"}' />

===

### Code

===[Code example]

<DocsBlock data='{"_type":"blockGuidance","id":"code"}' />

===

### Tables

Introduce a table with prose that names the comparison and why it belongs here. Follow it with an interpretation or transition. Never place tables back to back; explain their relationship or combine them when they share one comparison.

Show a history once, in one chronological table with date, event, and significance. Put definitions in rows with columns such as **Term**, **Description**, and **Examples**. Add meaningful emoji to the independent category axis when it helps scanning; omit decorative emoji.

===[Tables example]

<DocsBlock data='{"_type":"blockGuidance","id":"tables"}' />

===

## Visual blocks

### Diagrams

Use Nodes for flow, dependencies, hand-offs, and state. In Markdown, write `nodes` and `edges` as valid JSON arrays with double-quoted keys and strings and no trailing commas. Preview every diagram to confirm it renders as a diagram.

===[Diagram example]

<DocsBlock data='{"_type":"blockGuidance","id":"diagrams"}' />

===

### Images

Crop source images to the relevant content. Remove surrounding document headings and unrelated material. Keep meaningful labels, add specific alt text, and explain nearby what readers should notice. Do not show a caption in the rendered page.

===[Image example]

<DocsBlock data='{"_type":"blockGuidance","id":"images"}' />

===

### Embeds

===[Embed example]

<DocsBlock data='{"_type":"blockGuidance","id":"embeds-and-custom-blocks"}' />

===

## Interactive blocks

### Tabs

Use tabs for related, parallel methods, versions, or configurations that answer the same question. Put each option's full explanation and example inside its tab. Keep shared facts outside. Do not hide a dependent sequence in tabs.

===[Tabs example]

<DocsBlock data='{"_type":"blockGuidance","id":"tabs"}' />

===

### Accordions

Use an accordion group only for at least two optional, self-contained peers of the same kind. Give the group a meaningful heading and each item a concise label. Do not hide essential explanation, ordered steps, a schedule, or a whole lesson.

Worked examples and troubleshooting cases may qualify when each item can be read independently. Quiz questions belong in a sibling `quiz.json`, never in accordions. For example size and callout rules, see [Asides](#asides).

===[Accordion example]

<DocsBlock data='{"_type":"blockGuidance","id":"accordions"}' />

===

### Quiz

Keep authored quiz data in `quiz.json` beside the leaf's `index.md`. Do not put a Quiz component, heading, or question bank in Markdown.

The quiz object has:

- `title`: the quiz name.
- `questions`: an array of question records.

Each question record has:

- `title`: a short label.
- `prompt`: the question text.
- `answer`: the solution in Markdown.

Keep each value focused on its purpose. The static site validates the sibling JSON and presents one question at a time in the page-level Quiz dialog, with answers revealed on demand. A host using `DocsLocalWorkspace` or `DocsWorkspace` passes its parsed bank as `authoredQuiz`. The `<Quiz />` generator is a separate host-backed feature: it requires a configured generator, and generated results persist only when the host explicitly saves them.

```json
{
  "title": "Queue growth",
  "questions": [
    {
      "title": "Growth rate",
      "prompt": "Arrival is 500 packets/s and service is 350 packets/s. Find the growth rate.",
      "answer": "The queue grows at 150 packets/s while it is not full."
    }
  ]
}
```

===[Quiz example]

<DocsBlock data='{"_type":"blockGuidance","id":"quiz"}' />

===

## Extensions

### Asides

Choose the callout kind that matches the reader's need:

| 🧭 Kind    | Use it for                      |
| ---------- | ------------------------------- |
| 📝 Note    | Background or a definition      |
| 💡 Tip     | Practical advice                |
| ⚠️ Caution | A likely pitfall                |
| 🚨 Warning | A serious issue                 |
| ⛔ Danger  | A forbidden or high-risk action |
| 🧪 Example | Concrete behavior               |

Keep required explanations and steps in the reading path. Place each aside beside the concept or decision it changes.

Use `:::example[Worked example]` for one compact example beside the concept it teaches. Keep it to about 80 words or one code fragment of at most 8 lines. Put a substantial explanation, program, or procedure in ordinary lesson content. Close the aside with the same number of colons used to open it.

Use `:::tip` for one short tip or warning. Do not use it for a quiz question or answer.

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

For shared block contracts and host configuration, see the [API reference](../../../developer/component/blocks/).

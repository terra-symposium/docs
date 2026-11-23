---
title: Blocks
description: Choose Docs blocks to clarify a reader's task.
---

## Choosing Blocks

Start with the reader's task and the information hierarchy. Use a block when its shape makes a relationship easier to understand.

Before drafting a leaf, read the guidance for every block in this reference so the choice of blocks is informed. Apply each relevant rule to every instance, including examples and nested blocks. Check both the Markdown source and rendered result; a successful build does not replace those checks.

| 🧭 Need                                           | Use                                                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Organise a page and explain its ideas             | [Frontmatter](#frontmatter), [Prose](#prose), [Lists and links](#lists-and-links), [Code](#code)                                         |
| Compare, connect, or separate related information | [Tables](#tables), [Diagrams](#diagrams), [Tabs](#tabs), [Accordions](#accordions), [Asides](#asides)                                    |
| Add supporting material or practice               | [Images](#images), [Math](#math), [Embeds](#embeds), [Custom blocks](#custom-blocks), [Quiz](#quiz), [TypeScript docs](#typescript-docs) |

:::caution[Reconsider the hierarchy]

When new content changes a relationship, revisit the headings, order, and groups. Do not keep the old structure by inertia, preserve lecture chronology automatically, or retain supplied groups without checking what readers need. Reconsider the page outline whenever a new block or example changes the relationship between ideas.

:::

:::note[Open a block section]

Each block shows its render/source example first, followed by accordion items for Do (including tips), Do not (including constraints), and insertion steps. In Edit mode, use **+ Insert content** for available blocks, then switch to View and check the result. The example has **Rendered** and **Code (MDX)** tabs. Tabs and accordions use adjacent Markdown source syntax; the toolbar does not insert them.

:::

## Meta

### Frontmatter

<DocsBlock data='{"_type":"blockGuidance","id":"frontmatter"}' />

## Native Blocks

### Prose

<DocsBlock data='{"_type":"blockGuidance","id":"prose"}' />

### Lists and links

<DocsBlock data='{"_type":"blockGuidance","id":"lists-and-links"}' />

### Code

<DocsBlock data='{"_type":"blockGuidance","id":"code"}' />

### Tables

<DocsBlock data='{"_type":"blockGuidance","id":"tables"}' />

## Custom Blocks

### Diagrams

<DocsBlock data='{"_type":"blockGuidance","id":"diagrams"}' />

### Tabs

<DocsBlock data='{"_type":"blockGuidance","id":"tabs"}' />

### Accordions

<DocsBlock data='{"_type":"blockGuidance","id":"accordions"}' />

### Asides

<DocsBlock data='{"_type":"blockGuidance","id":"asides"}' />

### Images

<DocsBlock data='{"_type":"blockGuidance","id":"images"}' />

### Math

<DocsBlock data='{"_type":"blockGuidance","id":"math"}' />

### Embeds

<DocsBlock data='{"_type":"blockGuidance","id":"embeds-and-custom-blocks"}' />

### Custom blocks

<DocsBlock data='{"_type":"blockGuidance","id":"custom-blocks"}' />

### Quiz

<DocsBlock data='{"_type":"blockGuidance","id":"quiz"}' />

### TypeScript docs

<DocsBlock data='{"_type":"blockGuidance","id":"typescript-docs"}' />

For the shared block contracts and host configuration, see the [API reference](../../../developer/component/blocks/).

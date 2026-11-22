---
title: Blocks
description: Choose Docs blocks to clarify a reader's task.
---

Start with the reader's task and the information hierarchy. Use a block when its shape makes a relationship easier to understand.

Before drafting a leaf, read the guidance for every block in this reference so the choice of blocks is informed. Apply each relevant rule to every instance, including examples and nested blocks. Check both the Markdown source and rendered result; a successful build does not replace those checks.

## Choose by reader need

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

## Page structure

Set the page identity first, then organise its explanation and supporting material around the reader’s task.

### Frontmatter

<DocsBlock data='{"_type":"blockGuidance","id":"frontmatter"}' />

### Prose

<DocsBlock data='{"_type":"blockGuidance","id":"prose"}' />

### Lists and links

<DocsBlock data='{"_type":"blockGuidance","id":"lists-and-links"}' />

### Code

<DocsBlock data='{"_type":"blockGuidance","id":"code"}' />

## Relationships

Choose a structure only when it makes comparison, connection, alternatives, or optional detail easier to understand.

### Tables

<DocsBlock data='{"_type":"blockGuidance","id":"tables"}' />

### Diagrams

<DocsBlock data='{"_type":"blockGuidance","id":"diagrams"}' />

### Tabs

<DocsBlock data='{"_type":"blockGuidance","id":"tabs"}' />

### Accordions

<DocsBlock data='{"_type":"blockGuidance","id":"accordions"}' />

### Asides

<DocsBlock data='{"_type":"blockGuidance","id":"asides"}' />

## Supporting content

Add media, notation, or host-provided blocks when they help readers inspect, calculate, practise, or look up something.

### Images

<DocsBlock data='{"_type":"blockGuidance","id":"images"}' />

### Math

<DocsBlock data='{"_type":"blockGuidance","id":"math"}' />

### Embeds

<DocsBlock data='{"_type":"blockGuidance","id":"embeds-and-custom-blocks"}' />

### Custom blocks

Use `.mdx` when one leaf imports a React component for a demo, interactive view, or generated API panel; `.md` remains Markdown-only. This page-local path differs from registering a host-wide Markdown block.

| 🧭 Need                       | 🧩 Extension path                          |
| ----------------------------- | ------------------------------------------ |
| One leaf needs a demo or API  | Import sibling TSX in `.mdx`               |
| Markdown needs a custom block | Register `customBlocks` on `DocsWorkspace` |

See the [component reference](../../../developer/component/blocks/) for the host contract.

1. Keep the component beside the leaf that owns it.
   - Put a leaf-specific TSX file, such as `_components.tsx`, beside its `.mdx` file.
   - Keep the component and its example data with that page.
   - Keep nested routes under their parent path so the parent stays active.
2. Import and place the component in the MDX reading path.
   - Render it where its explanation is needed.
   - Keep title and description in frontmatter; use ordinary headings for the page TOC.
   - Use the existing `SiteMarkdownPage.astro` route and `DocsSiteLayout` shell.
3. Reuse the shared UI before adding markup or styles.
   - Check `@terra-symposium/styling/ui` and its component variants first.
   - Prefer `DataTable`, `Card`, `Button`, and `ButtonLink` where they fit.
   - Reuse existing form and display controls instead of rebuilding them.
   - Keep components data-driven when they accept rows or columns.
   - Render generated APIs with shared tables, not custom cards or signature styles.
   - Use shared variants and existing layout utilities; avoid page-specific CSS.
4. Build Docs, then open the leaf's direct route and inspect its context.
   - Check component output, the generated TOC, sidebar selection, and sibling leaves.
   - Confirm nested pages keep their parent active and siblings visible.
   - Check the browser console for MDX, React, and hydration errors.

:::caution[Keep the Docs shell single]

Render the MDX leaf through the existing route and layout. If its component is missing, trace the shared MDX slot rendering before changing the page shell; do not wrap the leaf in a second Docs layout.

:::

### Quiz

<DocsBlock data='{"_type":"blockGuidance","id":"quiz"}' />

### TypeScript docs

<DocsBlock data='{"_type":"blockGuidance","id":"typescript-docs"}' />

For the shared block contracts and host configuration, see the [component reference](../../../developer/component/blocks/).

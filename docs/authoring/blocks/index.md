---
title: Blocks and syntax
description: The Markdown and rich blocks supported by Terra Docs.
order: 1
---

Write ordinary text as Markdown. The Docs package owns parsing and rendering; a host supplies content, routes, assets, permissions, and any registered custom blocks.

## Text and structure

Use `##` and deeper headings, paragraphs, links, emphasis, block quotes, numbered steps, and bullet lists as normal Markdown. Use a fenced code block with a language label for multiline code:

````md
```c
printf("Hello, world!\n");
```
````

Use `$x$` for inline math and `$$` lines around display math. Use `![Alt text](./image.png)` for an image beside its owning leaf. Keep downloadable attachments with that leaf rather than duplicating them in navigation.

## Tables

Both GitHub Flavored Markdown pipe tables and native HTML tables are supported. Use a pipe table for a simple grid:

```md
| Item     | Purpose            |
| -------- | ------------------ |
| Register | Track stakeholders |
```

Use native `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` when its structure needs HTML. Keep existing table titles and table content as authored; a table title does not make the table an aside.

## Asides

For new hand-authored blocks, use `:::` only for asides. The six supported types are `note`, `tip`, `caution`, `danger`, `example`, and `warning`. Give the aside a short title and put normal Markdown between its fences:

```md
:::warning[Check the source]

Confirm the date against the official brief.

:::
```

The type is preserved when a page is opened and exported from the editor. Tables, lists, and code can appear inside an aside when the whole group needs that emphasis.

## Accordions and tabs

Use an accordion for secondary detail and tabs for genuine alternatives. Each item has an opening title and a matching closing delimiter:

```md
=== [Further detail]
Supporting explanation.
===

||| [Linux]
Linux instructions.
|||
```

## Diagrams and embeds

Use `<Nodes />` for a real sequence, dependency, or branching relationship. Pass valid JSON arrays for `nodes` and `edges`; keep prose and code outside those attributes. Use `<Embed src="..." title="..." />` for an external resource that must appear in the page. The host may register additional custom blocks; document their syntax beside that host.

Unsupported structured source remains recoverable in the editor. Do not invent a new directive or wrap an ordinary block in `:::docs`.

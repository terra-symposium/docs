---
title: Blocks and syntax
description: The Markdown and rich blocks supported by Terra Docs.
order: 1
---

Write ordinary text as Markdown. The Docs package owns parsing and rendering; a host supplies content, routes, assets, permissions, and any registered custom blocks.

## Text and structure

Use `##` and deeper headings, paragraphs, links, emphasis, block quotes, numbered steps, and bullet lists as normal Markdown. Use single backticks for inline code; inline code never has a language header or copy button. Author multiline code with a language-labelled `<CodeBlock>`:

Fenced, stored, and received code share a syntax-highlighted surface with a language header and copy control in both view and edit modes.

<CodeBlock language="mdx" code={"<CodeBlock language=\"c\" code={\"printf(\\\"Hello, world!\\\\n\\\");\"} />"} />

Use `$x$` for inline math and `$$` lines around display math. Use `![Alt text](./image.png)` for an image beside its owning leaf. Keep downloadable attachments with that leaf rather than duplicating them in navigation.

## Tables

Both GitHub Flavored Markdown pipe tables and native HTML tables are supported. Use a pipe table for a simple grid:

<CodeBlock language="md" code={"| Item | Purpose |\n| -------- | ------------------ |\n| Register | Track stakeholders |"} />

Use native `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` when its structure needs HTML. Keep existing table titles and table content as authored; a table title does not make the table an aside.

## Asides

For new hand-authored blocks, use `:::` only for asides. The six supported types are `note`, `tip`, `caution`, `danger`, `example`, and `warning`. Give the aside a short title and put normal Markdown between its fences:

<CodeBlock language="md" code={":::warning[Check the source]\n\nConfirm the date against the official brief.\n\n:::"} />

The type is preserved when a page is opened and exported from the editor. Tables, lists, and code can appear inside an aside when the whole group needs that emphasis.

## Accordions and tabs

Use an accordion for secondary detail and tabs for genuine alternatives. Each item has an opening title and a matching closing delimiter:

<CodeBlock language="md" code={"===[Further detail]\nSupporting explanation.\n==="} />

The rendered example uses the shared Styling tabs and accordion components directly:

|||[npm]

<CodeBlock language="sh" code={"pnpm add @terra-symposium/docs"} />

|||

|||[Git]

<CodeBlock language="sh" code={"git tag docs-release"} />

|||

===[Why use an accordion?]
Keep optional background detail available without making it the main reading path.
===

## Diagrams and embeds

Use `<Nodes />` for a real sequence, dependency, or branching relationship. Pass valid JSON arrays for `nodes` and `edges`; keep prose and code outside those attributes. Use `<Embed src="..." title="..." />` for an external resource that must appear in the page. The host may register additional custom blocks; document their syntax beside that host.

Unsupported structured source remains recoverable in the editor. Do not invent a new directive or wrap an ordinary block in `:::docs`.

---
title: Blocks and syntax
description: The Markdown and rich blocks supported by Terra Docs.
order: 1
---

Write ordinary text as Markdown. The Docs package owns parsing and rendering; a host supplies content, routes, assets, permissions, and any registered custom blocks.

## Text and structure

Use `##` and deeper headings, paragraphs, links, emphasis, block quotes, numbered steps, and bullet lists as normal Markdown. Use single backticks for inline code; inline code never has a language header or copy button. Author multiline code with a language-labelled ````mdx

```c
printf("Hello, world!\n");
```

```` for a real sequence, dependency, or branching relationship. Pass valid JSON arrays for `nodes` and `edges`; keep prose and code outside those attributes. Use `<Embed src="..." title="..." />` for an external resource that must appear in the page. The host may register additional custom blocks; document their syntax beside that host.

Unsupported structured source remains recoverable in the editor. Do not invent a new directive or wrap an ordinary block in `:::docs`.

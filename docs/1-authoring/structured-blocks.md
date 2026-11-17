---
title: See Docs blocks in use
description: Rendered examples of callouts, choices, tables, and diagrams.
---

The blocks on this page are live examples, not screenshots of source. Use the form that makes a relationship clear, then check it in the same renderer your readers will use.

## Call attention to a decision

A callout belongs beside the instruction it changes. It should tell the reader what to do with the information, rather than repeat the surrounding paragraph.

:::warning[Save outside the editor]
`onChange` reports an updated value to the host application. Persist that value in the host before promising that a document will survive a reload.
:::

This callout becomes a `callout` block with a kind, title, and Markdown body. The warning is part of the storage task, so it appears where a reader chooses a provider.

## Present alternatives together

Use grouped tabs when readers choose one of several equivalent routes. Adjacent tab sections become one `tabs` block.

||| [pnpm]

```sh
pnpm add @terra-symposium/docs
```

|||

||| [npm]

```sh
npm install @terra-symposium/docs
```

|||

Keep the sections adjacent, with nothing between them except whitespace, so the package groups the options into one choice.

## Compare repeated facts

A table makes shared attributes easy to scan. Here the rows answer a practical question: which part of a Docs installation owns each responsibility?

| Responsibility | Docs package | Host application |
| --- | --- | --- |
| Edit and render the document value | Yes | Supplies the value |
| Decide who can open a document | No | Yes |
| Save edits and publish revisions | No | Yes |

Markdown pipe tables render as editable Docs table blocks. Use structured `table` JSON when you need to preserve a full Portable Text cell model rather than a simple comparison.

## Show a dependency

A diagram helps when the relationship matters more than the names of the parts. The example below shows the data flow without implying that Docs saves on its own.

<Nodes nodes={[
  {"id":"host-value","type":"origin","data":{"title":"Host supplies value"}},
  {"id":"docs-edit","type":"process","data":{"title":"Docs edits value"}},
  {"id":"host-save","type":"terminator","data":{"title":"Host saves result"}}
]} edges={[
  {"id":"value-edit","source":"host-value","target":"docs-edit"},
  {"id":"edit-save","source":"docs-edit","target":"host-save"}
]} direction="LR" height={280} />

Each node has an ID and title. Each edge names its source and target. The package lays out the graph from left to right and mounts it in the browser; inspect the page itself when checking labels and layout.

## Keep details optional

An accordion gives supporting detail a clear title without interrupting the main reading path. Open this one only if you need the source shape for a callout.

=== [Callout source syntax]

```md
:::warning[Save outside the editor]
Persist the updated value in the host.
:::
```

The source directive becomes the rendered warning above. Use the delimiter that the target package actually parses.

===

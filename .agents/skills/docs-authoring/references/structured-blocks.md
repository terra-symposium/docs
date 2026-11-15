# Structured block examples

Use one `:::terra-docs type` fence per block. These are minimal data shapes; compare them with `DOCS_BLOCK_FIELDS` and the editor renderer before changing a field.

## Alternative commands

```md
:::terra-docs tabs {"_type":"tabs","items":[{"title":"pnpm","markdown":"`pnpm install`"},{"title":"npm","markdown":"`npm install`"}]} :::
```

Separate `||| [Title]` sections become separate one-item blocks, so use the structured form for a selectable tab group.

## Editable table

```md
:::terra-docs table {"_type":"table","rows":[{"_type":"row","cells":[{"_type":"cell","content":[{"_type":"block","children":[{"_type":"span","text":"Tool"}]}]},{"_type":"cell","content":[{"_type":"block","children":[{"_type":"span","text":"Command"}]}]}]},{"_type":"row","cells":[{"_type":"cell","content":[{"_type":"block","children":[{"_type":"span","text":"Quality"}]}]},{"_type":"cell","content":[{"_type":"block","children":[{"_type":"span","text":"pnpm quality"}]}]}]}]} :::
```

The first row supplies headings. Cell `content` is Portable Text, not a string.

## Relationship diagram

```md
:::terra-docs nodes {"_type":"nodes","direction":"LR","nodes":[{"id":"source","type":"origin","position":{"x":0,"y":0},"data":{"title":"Source"}},{"id":"review","type":"terminal","position":{"x":300,"y":0},"data":{"title":"Review"}}],"edges":[{"id":"source-review","source":"source","target":"review"}]} :::
```

Every node needs an ID, data object, and position. Every edge needs an ID, source, and target. React Flow renders node labels in the browser after hydration; server output contains only its shell. Inspect the browser preview and run the rich-block browser tests.

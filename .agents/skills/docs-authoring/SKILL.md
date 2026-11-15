---
name: docs-authoring
description: Author and verify Terra Docs documents and rich blocks.
metadata:
  related-files:
    - src/components/blocks.tsx
    - src/lib/markdown-model.ts
    - src/lib/markdown.ts
    - src/content/docs/component.md
    - src/content/docs/configuration.md
    - src/components/terra/editor/docs/_Nodes.tsx
    - src/components/terra/editor/docs/_Table.tsx
    - tests/blocks.test.mjs
    - tests/browser/rich-blocks/nodes.case.ts
    - tests/browser/rich-blocks/tabs.case.ts
    - tests/browser/rich-blocks/table.case.ts
    - package.json
---

# Docs authoring

Use this skill when writing a document for `@terra-symposium/docs`, changing its Markdown conversion, or updating the package's example pages. Read the current [component reference](../../../src/content/docs/component.md) and [configuration guide](../../../src/content/docs/configuration.md) before choosing a block.

## Write for the reader

1. Give the page one primary purpose and a descriptive title. Put a working result before exhaustive options; link to the reference for details.
2. Use normal headings and paragraphs for linear explanation. Use a table for repeated fields, language-labelled code for runnable examples, tabs for alternatives, an accordion for optional detail, and a nodes diagram only when the relationship matters.
3. Derive package names, props, defaults, and behavior from current source or tests. Use synthetic example data and explain the expected result.

## Preserve the document format

- `DocsValue` is a Portable Text block array. Keep host-owned save, authorization, and attachment behavior outside the document component.
- For Markdown, use `=== [Title]` for a single accordion item and `||| [Title]` for a single tab item. Separate `|||` sections become separate blocks; for a multi-choice tab group, use one `:::terra-docs tabs` JSON block with an `items` array. Other structured blocks use `:::terra-docs type` with JSON. Check the parser and component reference before writing a block; do not invent syntax.
- Check the current registry before choosing a structured block. Its supported types are `accordion`, `tabs`, `table`, `callout`, `code`, `docImage`, `embed`, `math`, `nodes`, `raw`, and `tsDocs`. `inlineMath` is a separate option. Use `table` for structured rows; `code` with a language for highlighted examples; `callout` for a note or warning; `docImage` for an image with alt text; `embed` for external content; `math` for equations; `nodes` for relationships; `raw` to preserve Markdown; and `tsDocs` for TypeScript API documentation. Check each type's fields in `DOCS_BLOCK_FIELDS` and round-trip behavior before writing its JSON. For grouped tabs, editable table cells, and diagrams, use the working shapes in [structured block examples](references/structured-blocks.md).
- Keep images and attachments beside the Markdown file and reference them relatively. Preserve unknown or disabled source rather than silently dropping it. Conversion may normalize spacing between blocks; inspect the serialized result.

## Verify

Run `pnpm run docs:build` for authored pages. Inspect the built page at its real route, including narrow layouts and interactive blocks. If conversion code changed, run `pnpm run test` and check both Markdown-to-value and value-to-Markdown round trips. If editor behavior changed, run `pnpm run test:browser`.

## Publish verification

For a publishing request, build the final authored state, check internal links and assets, then inspect the deployed route after the repository’s approved release workflow completes. Record the source revision and the observed route. A local preview does not establish that the published page updated.

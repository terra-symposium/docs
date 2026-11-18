---
title: Write a Docs page
description: Turn source material into a useful, source-faithful explanation.
---

A Docs page helps a reader understand a decision or complete a task. Begin with why the subject matters, then show the path to a useful result. Code can show _how_ software works; the page should also explain _why_ it exists, including constraints and trade-offs a reader cannot see in code.

:::tip[The refactor test] If an internal performance refactor changes no behaviour, the explanation should still be useful without rewriting it. :::

## Begin with a purpose

Give the page one outcome and a descriptive title. Put the answer or working result before an exhaustive list of options. For example, a page about saving edits in Terra Docs should first tell readers that Docs reports edits to the host application, and that the host decides when and where to save them.

The component contract supplies the facts, but readers need the relationship between them:

| Component fact                        | Question to answer                                   |
| ------------------------------------- | ---------------------------------------------------- |
| `onChange` receives the updated value | Where do edits go?                                   |
| The host owns storage                 | Which part saves the document?                       |
| View mode has no `onChange`           | How do readers see a saved value without editing it? |

Lead with that relationship and show the smallest working example:

```tsx
<Docs mode='edit' value={value} onChange={setValue} />
```

This reports edits into the host's state; it does not persist them. Link to [storage providers](/0-installation/storage/) for the durable version. Check prop names and behaviour against current source or tests; use synthetic example data when demonstrating package behaviour.

## Work from the source material

Read the substance of every supplied or authorised source before drafting a new page. A filename, URL, or Canvas title identifies material; it does not explain it. Keep working notes on coverage, dates, uncertainty, and conflicting claims. Preserve distinct points in explicit lists, relevant links, examples, and constraints. Where material is missing, say so instead of inventing an explanation or replacing one with a resource catalogue.

Choose the task that matches the request. The same evidence can support different outputs:

| Task       | What to do                                                      |
| ---------- | --------------------------------------------------------------- |
| Synthesise | Merge multiple sources without merging distinct points.         |
| Convert    | Restructure one source; use this when no task is specified.     |
| Critique   | Evaluate the existing content against its purpose and evidence. |
| Compare    | Put corresponding facts in a comparison table.                  |
| Polish     | Conform the page's structure and presentation.                  |

For Website generation, assume a Documentation leaf unless the prompt explicitly names another schema. Use the Documentation leaf in Executive > Management for executive-management style and tone. An existing Website leaf has a separate regeneration path: pass its leaf ID directly to the generator and let the generator read the target leaf and attachments; do not manually read them first. Follow the current Docs MCP authoring workflow for direct generation, attachment handling, preservation, and verification. For a new page or source-based conversion, read the supplied content yourself before drafting.

<Nodes nodes={[ {"id":"sources","type":"origin","data":{"title":"Understand the material"}}, {"id":"outcome","type":"process","data":{"title":"Choose the reader's outcome"}}, {"id":"page","type":"process","data":{"title":"Explain with useful blocks"}}, {"id":"check","type":"terminator","data":{"title":"Check facts and rendering"}} ]} edges={[ {"id":"sources-outcome","source":"sources","target":"outcome"}, {"id":"outcome-page","source":"outcome","target":"page"}, {"id":"page-check","source":"page","target":"check"} ]} direction="LR" height={300} />

## Draft for the reader

Write for moderately experienced readers in a helpful-mentor voice. Use everyday language, define necessary jargon, explain the reason behind instructions, and cut filler. Keep terminology and phrasing consistent. A short introduction beneath each H2 or H3 should orient the reader before a table, diagram, or collection of details.

Choose the voice that fits the material. These descriptions preserve the Website schema's distinctions:

| Material      | Voice and focus                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product       | Persuasive/narrative. Focus on ROI & Value. Exclude implementation details (noise).                                                                                      |
| Engineering   | Objective/abstract. Focus on Utility & Intent. Group features logically (not file-by-file). Map Element -> Action -> Goal.                                               |
| University    | Connective/atomic. Focus on Recall & Connection. Exclude verbatim transcripts. End with a "So What?" summary.                                                            |
| Reading lists | Consolidate sources into task-focused accordions. Use 1-2 sentence intros. Transcribe explicit lists exactly. Never merge points. Use tables for multi-dimensional sets. |

For engineering pages, organise around what a reader can do, not the order of source files. For university notes, connect atomic concepts for recall, avoid chronological transcript filler, retain explicit lists, and end substantial notes with their practical implication. Use descriptive links, short bullets for unordered facts, and numbered steps only when actions must happen in order. Keep one idea per bullet; move a compound explanation into a paragraph or sub-bullets. Add AI-facing comments sparingly and only when they preserve context for a future author.

## Choose blocks that show relationships

Let the page's visual structure carry meaning. Keep the main reading path focused on essential context, decisions, and actions; move lengthy optional or supporting collections into titled accordions. Use a block because it exposes a relationship, not for decoration.

| Relationship                                    | Useful form                 |
| ----------------------------------------------- | --------------------------- |
| Repeated fields or several dimensions           | Table                       |
| A prerequisite, warning, or high-value takeaway | Callout at the point of use |
| Genuine alternatives                            | Grouped tabs                |
| A process or dependency                         | Nodes diagram               |
| Long optional detail                            | Titled accordion            |
| A reusable nested Website document              | Leaf embed                  |
| A runnable or literal example                   | Language-labelled code      |

For a Website leaf, a leaf embed reuses another document inline: `<Leaf id="sanity-document-id" />`. It is useful for a large page or a reusable reference section. That is the Markdown form; the stored Sanity component object is not the content to generate. Use a fenced code block or canonical `<Code language="..."> ... </Code>` for code, never a `code` attribute. The Website leaf-body instruction specifies `<Code language="text"> ... </Code>` for generated text examples. Keep images beside their Markdown file and use relative paths.

The target renderer determines the exact dialect. A Website leaf body begins with an H2 heading and is returned as Terra Docs Markdown itself, not plain GitHub-flavoured Markdown or a field named `markdown`. Use only canonical blocks and tags named by that schema; do not invent JSX children such as `<AccordionItem>`, `<TabItem>`, or `<TabsList>`. Put block-specific warnings beside the block they affect. The installed Docs site package renders `=== [Title]` as an accordion, adjacent `||| [Title]` sections as grouped tabs, `:::note[Title]` as a callout, and `<Nodes>` with JSON attributes as a diagram. The Website schema comments label the tab and accordion delimiters in the opposite order, so check the application that will render the finished page before writing either form. See the [live block examples](/1-authoring/structured-blocks/) for this package's output.

Its supported types are `accordion`, `tabs`, `table`, `callout`, `code`, `docImage`, `embed`, `math`, `nodes`, `raw`, and `tsDocs`. `inlineMath` is a separate option. Preserve unknown or disabled source when converting a document rather than silently dropping it.

## Verify the page

Compare the draft with every source before treating it as complete. Check names, props, defaults, behaviour, dates, links, and omissions. Keep each explicit list point distinct. Before outputting generated content, scan the whole result against the instructions: do not emit `[cite]` references, and escape `<`, `:`, and `$` where they would cause HTML or MDX parsing errors.

For pages in this repository, run `pnpm run docs:build` and inspect the real route, a narrow layout, links, assets, and interactive blocks. When conversion code changes, run `pnpm run test` and check Markdown-to-value and value-to-Markdown round trips. When editor behaviour changes, run `pnpm run test:browser`. For a publishing request, inspect the deployed route after the approved release and record its source revision; a local preview does not establish that the published page changed.

The [schema source excerpts](/1-authoring/authoring-schema/) retain the Website comments verbatim for checking exact wording. Consult the current Website schema before relying on those excerpts for a new generation run.

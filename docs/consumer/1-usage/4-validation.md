---
title: Validation
description: Check source coverage, page content, rendering, publication, and records.
---

## 1. Sources

Check the source record and every usable attachment before writing, resolving or stating missing material and conflicts up front. Return any exact validation failure to a bounded repair attempt.

:::caution[Stop after four failed repairs]

Agents must note that after the _fourth_ failed attempt accessing an attachment, you must preserve the diagnostics and stop without writing the leaf.

:::

## 2. Content

Read the page from top to bottom against its sources. Check each kind of claim against its owning evidence:

| Claim                                                                           | Evidence to inspect                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| 🧾 Names, dates, behaviour, constraints, and examples                           | Supplied source and current product behaviour     |
| 📦 Package names, exports, flags, schema fields, requirements, and side effects | Manifests, declarations, implementation, or tests |
| ⏳ Commands, version requirements, API names, links, and screenshots            | Current source and reachable destinations         |

Check the order of ideas as well as individual facts. Keep the prose focused on the reader's task, explain context the implementation cannot show, and use plain Australian English. Put prerequisites before commands, keep examples runnable, and keep copyable text in source or code blocks rather than screenshots. Use synthetic data instead of credentials, personal information, or production payloads. Avoid repeating another leaf's reference material.

Strip leftover AI tool citation markers (`[cite]`, numbered markers such as `[cite: 1–2]` or `[cite: …]`, and `[cite_start]`) without deleting useful source links. In an editor, search for numbered markers with `\[cite:\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*\]`, then search separately for `\[cite_start\]` and plain `[cite]`.

## 3. Syntax

Before a leaf is written, read every block guide in the [Syntax reference](/consumer/1-usage/1-syntax/). During validation, check every authored instance, example, and nested block against its rules. Count at most 75 characters per list item; put longer support in sublist points. Check that each table places meaningful emojis on its independent axis: the first row, first column, or both. Run automated sanitisation on legacy Docs migrations.

Author, sanitise, and verify the Markdown leaf under `docs/` before rendering. Check its frontmatter and opening H2 heading, keep images beside the page using relative source paths, and use a meaningful Docs block wherever it clarifies a substantial relationship.

Check authored markup against the [block contract](/developer/component/blocks/) and Docs
blocks documentation before rendering:

- Do not invent generic directives such as `:::docs`.
- Put every block opener on its own line.
  - Examples: `|||[TypeScript API]`, `===[Details]`, `:::note[Note]`.
  - Leave one blank line before its body
  - Leave one blank line before the matching closer.
- Remove standalone `---` dividers from page content.
  - Docs styles provide presentation spacing.
  - Keep frontmatter fences and examples inside code fences.
- Escape `&lt;`, `:`, or `$` only when the parser requires it.
  - Check HTML, YAML field boundaries, and math contexts.
- Give every fenced code block a language info string
  - Use `text` when no better language applies
  - Keep single backticks inline.
    - They must not gain a code-block header or copy button.
- Use a fence longer than any backtick run inside the example
  - Use four outer backticks to show a three-backtick fence.
  - Verify that the rendered example matches the literal source.
- Use Markdown tables for ordinary tabular text.
  - Keep HTML when classes or fragile components require it.
- Use a short, single-line AI comment only for hidden intent.
  - It should explain ambiguity a future author might miss.
  - Do not repeat visible prose or fill the page with comments.
- Keep private planning context in the authoring brief.
  - Include assumptions, exclusions, and unresolved questions.

### Migration

If the edit migrates legacy Docs markup, follow
[Migrate content](/developer/repo/content-migration/) before changing files in bulk, and
use the shared `docs-sanitization` skill
(`scripts/docs-sanitize/cli.py`, with implementation and fixtures in
`scripts/docs-sanitize/`) to audit and safely repair fenced blocks, diagram
data, and legacy component tags:

```sh
python3 /path/to/docs/scripts/docs-sanitize/cli.py check /path/to/consumer/docs
python3 /path/to/docs/scripts/docs-sanitize/cli.py fix /path/to/consumer/docs
```

`check` is read-only and exits nonzero for findings, whereas `fix`
performs only deterministic transformations: splitting Docs delimiters onto their own
lines with blank lines around the body, converting literal
`&lt;CodeBlock&gt;` props to fenced Markdown, and converting supported
literal `&lt;DocsBlock&gt;` payloads. CI runs
`pnpm run docs:sanitize` against this repository's `docs/` tree
(pass another root to audit a consumer), and the CLI skips generated `dist`,
installed dependencies, and migration audit artifacts—do not scan those directories as
authored content. After running `fix`, run `check` again, review
the diff, and run the consumer's Docs build; add a fixture in
`scripts/docs-sanitize/` for each new failure mode before broadening a
transformation.

Complete these manual migration checks alongside automated fixes:

- Convert safe literal `&lt;CodeBlock&gt;` and `&lt;DocsBlock&gt;`
  tags with `fix`, and migrate other obsolete rich blocks to native Markdown
  or current component syntax after inspecting their data rather than replacing them
  with placeholders.
- Remove the legacy `NodesBlock` import and
  `export const Nodes = props =&gt; &lt;NodesBlock block=&#123;props&#125; /&gt;`
  shim from authored pages so the built-in `Nodes` component is used, while
  preserving imports inside code examples and unrelated application imports.
- Preserve `&lt;Nodes&gt;` graph data when moving content out of frontmatter:
  inline `nodes` and `edges` must contain the original objects,
  each on one line, and `frontmatter.*` references must be resolved from the
  original source or archive (an empty array is a finding, not valid recovered data; if
  the source is unavailable, leave the finding and report it rather than inventing a
  diagram).

For AI-generated page content, scan the complete draft against the source, structure, content, syntax, and cleanup requirements in this guide. Repair any failure and scan again before presenting the page or advancing to rendering.

<Nodes
nodes={[
{"id":"draft","type":"origin","data":{"title":"Draft"}},
{"id":"scan","type":"process","data":{"title":"Scan the draft"}},
{"id":"decide","type":"decision","data":{"title":"Checks pass?"}},
{"id":"repair","type":"process","data":{"title":"Repair the failure"}},
{"id":"ready","type":"terminator","data":{"title":"Continue to rendering"}}
]}
edges={[
{"id":"draft-scan","source":"draft","target":"scan"},
{"id":"scan-decide","source":"scan","target":"decide"},
{"id":"decide-repair","source":"decide","target":"repair","label":"No"},
{"id":"repair-scan","source":"repair","target":"scan","label":"Re-scan"},
{"id":"decide-ready","source":"decide","target":"ready","label":"Yes"}
]}
/>

## 4. Render

Verify what readers actually see and use; a compiled site alone does not prove that intended content survived rendering. In a project created from the Docs template, `pnpm run docs` starts the preview and `pnpm run build` creates the static output. Other hosts may use different scripts; use their configured preview and build commands.

Inspect the rendered result in this order:

1. Open the changed route and compare it with the source.
   - Check headings, prose, lists, tables, and asides.
   - Check code, diagrams, links, images, and attachments.
   - Check interactive blocks.
2. Inspect a narrow layout and a second page.
   - Check that labels and descriptions do not leak between pages.
3. Confirm that unsupported source material stays recoverable.
   - It must not vanish or appear as raw JSON.
4. Review the build, relevant tests, and diff.

### Round trips

When conversion logic changes, check Markdown-to-value and value-to-Markdown round trips—covering heading levels, marks, list nesting, table cells, block attributes, diagrams, links, and attachments—and run browser tests when editor behaviour changes.

### Routes and assets

Moving a file or changing its number prefix alters its URL, so update incoming links and check both the old and new routes; see [Tree](/consumer/1-usage/0-tree/) for labels, ordering, and hidden pages.

Use the table below to verify structural and asset changes in local preview and again
after publication.

| Change                            | Check in preview and after publication                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| 📄 Rename a page or folder        | Sidebar order, page URL, and incoming links                              |
| 🖼️ Replace an image or attachment | Relative source path, rendered image or download, and alt text           |
| 🙈 Hide a page                    | Sidebar and search visibility; access control at the web host if private |
| 🌐 Change `docs.base`             | Nested links and assets at the public base path                          |

## 5. Publish

Trace the page through the host's supported save, release, and history workflows. Docs parses and renders content. The host supplies routes, assets, and registered custom blocks and controls authentication, permissions, persistence, publication, and asset storage. Verify those responsibilities against behaviour and records.

| Stage             | Evidence to check                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💾 Save           | Save and reload editable content; compare its meaning with the source.                                                                                  |
| 🔀 Concurrency    | If revisions exist, confirm that concurrent edits cannot silently overwrite one another.                                                                |
| 🚀 Release        | Deploy the folder configured by `docs.out` through the site's normal process. Local preview establishes local rendering only.                           |
| 🔐 Access         | Verify authorised reads and writes and attachment ownership through the host.                                                                           |
| 🌐 Published page | Inspect the deployed route, navigation, links, content, assets, and attachment URLs. Record the source revision when available.                         |
| 🕰️ History        | Track repository Markdown and MDX in Git. Where the host has revisions, verify they remain readable and traceable to the source material and decisions. |

## 6. Record

Leave enough evidence for another author to reproduce the outcome from source material to
the published leaf, keeping all records outside the published leaf. The table below
defines the four audit records required to capture the draft's hierarchy, meaning, links,
blocks, artifact cleanup, routes, interaction states, attachment handling, and revision.

| Record                | What it establishes                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| 📚 Source manifest    | Which sources and attachments were available, including failed collection or missing material. |
| ✅ Coverage audit     | How each distinct source point and explicit list item was handled in the leaf.                 |
| 🧭 Generation trace   | How collected material and authoring decisions produced the final draft.                       |
| 📰 Publication record | Which source revision, deployed route, interaction states, and attachment URLs were inspected. |

### Validation log

Every AI-generated page response must end with a concise Validation Log after the page
body, kept in the accompanying response or workflow record outside the content saved as
the published page. Report failed or unverified checks truthfully rather than checking
them off, and state any access or rendering limit concretely rather than claiming a check
you could not perform.

The example below shows an incomplete publication check rather than marking it as passed:

```md
### Validation Log

- [x] Sources: Required sources, explicit points, attachments, conflicts, and repair limits accounted for.
- [x] Structure & Content: Opening H2, heading hierarchy, meaning, expiring facts, links, and Australian English verified.
- [x] Syntax & Cleanup: Docs blocks, dividers, escaping, code fences, sanitisation, and tool artifact removal verified.
- [ ] Rendering & Routes: Local preview and layout inspection pending; build and link checks passed.
- [ ] Edits & Publication: No deployed route or host revision was available to inspect.
- [x] Records & Limits: Audit records stored outside the leaf; the missing publication evidence is recorded.
```

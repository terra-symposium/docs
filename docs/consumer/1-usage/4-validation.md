---
title: Validation
description: Check a Docs leaf from source coverage through rendering, publication, and history.
---

## Validation process

Follow the same path for a new page and a direct edit. A successful build proves that the site compiled; the remaining checks establish that the page preserves its sources and works in the target renderer. Check saving and publication when the host supports them.

For a small change to an established Markdown page, use the short cycle below. Use the full five-stage process for a new page, a substantial rewrite, or a change that needs a source coverage record.

<Nodes
nodes={[
{"id":"sources","type":"origin","data":{"title":"1. Account for sources"}},
{"id":"draft","type":"process","data":{"title":"2. Review the draft"}},
{"id":"render","type":"process","data":{"title":"3. Inspect the rendered page"}},
{"id":"publish","type":"process","data":{"title":"4. Check edits and publication"}},
{"id":"record","type":"terminator","data":{"title":"5. Record the result"}}
]}
edges={[
{"id":"sources-draft","source":"sources","target":"draft"},
{"id":"draft-render","source":"draft","target":"render"},
{"id":"render-publish","source":"render","target":"publish"},
{"id":"publish-record","source":"publish","target":"record"}
]}
direction="TB"
height={650}
/>

### Routine page changes

For a repository-backed Markdown site, keep the source and published route in sync:

1. Edit the file under `docs/`. Check its frontmatter and first H2; keep images beside the page and use relative source paths.
2. Preview the changed route with `pnpm run docs`. Read the page and try its links, code examples, images, and interactive blocks.
3. Run `pnpm run build` and review the diff. Deploy the folder configured by `docs.out` using the site's normal release process.
4. Open the published route and check the same navigation, links, and assets there.

If the edit migrates legacy Docs markup, follow [Migrate content](/developer/repo/content-migration/) before changing files in bulk.

## 1. Account for sources

Establish what the leaf must preserve before writing or changing it. This gives every later check a known source to compare against.

### Source coverage

Check the source record and every usable attachment. Account for each explicit list point, name conflicts or missing material, and reject suspiciously short output. During a direct edit, preserve relevant content and attachments. A generated page should combine related concepts and examples into a useful reference rather than list files or replay a lecture in order.

### Gaps and repair limit

Resolve or state missing material and conflicts before writing. Return an exact validation failure to a bounded repair attempt.

:::caution[Stop after four failed repairs]

After the fourth failed attempt, preserve the diagnostics and stop without writing.

:::

## 2. Review the draft

Check the written leaf against the source record before relying on a successful build. Review both its meaning and the syntax that carries it.

### Meaning and provenance

Read the page from top to bottom against its sources. Compare names, dates, props, defaults, behaviour, constraints, links, examples, and the order of ideas. Check that it explains context the implementation cannot show in plain Australian English. Keep the page focused on the reader's task and use a meaningful Docs block where it clarifies a substantial relationship. Remove tool citation artifacts such as `[cite]`, `[cite: 1–2]`, and `[cite_start]`, while retaining source links that help readers reach a destination. Keep provenance in the validation record outside the published body.

Recheck facts that can expire: commands, version requirements, API names, external links, and screenshots. Keep copyable text in source or code blocks rather than relying on a screenshot of it.

### Supported syntax

Check the authored syntax before rendering. Do not invent JSX children for ordinary blocks, wrap prose in a generic `:::docs` directive, or add a Markdown divider after frontmatter. Escape `<`, `:`, or `$` only when the parser would otherwise treat them as HTML, a YAML field boundary, or math. Use a longer outer fence to demonstrate a fence inside a fence, and check that its rendered example matches the literal source. Use a brief, single-line AI-facing comment only when it preserves intent a future author might miss; do not repeat visible prose or fill the page with comments. Keep audience assumptions, exclusions, and unresolved questions in the authoring brief when they do not belong in the published leaf.

### Pre-output check

For AI-generated page content, scan the complete draft against its sources, the opening H2, supported block syntax, links, and citation markers before sending it. If a check fails, repair the draft and scan it again. Do not present the page or mark a check complete until the revised draft passes. This loop happens within draft review; the five-stage validation path continues only after it passes.

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
direction="LR"
height={360}
/>

Remove tool artifacts such as `[cite]`, numbered `[cite: …]` markers, and `[cite_start]` without deleting useful source links. To find numbered markers in an editor, search for `\[cite:\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*\]`, then search separately for `\[cite_start\]` and plain `[cite]`.

## 3. Inspect the rendered page

Check what readers actually see and use. A compiled site alone does not show whether the intended content survived rendering.

### Build and route

Run the configured Docs build and relevant tests, then open the page's real route in the target renderer. Compare headings, prose, lists, tables, asides, code, diagrams, links, images, and attachments with the source. Inspect a narrow layout and a second page for navigation labels or descriptions leaking between pages. Confirm that unsupported or disabled source remains recoverable instead of disappearing or appearing as raw JSON.

### Conversion and interaction

When conversion changes, check Markdown-to-value and value-to-Markdown round trips, including heading levels, marks, list nesting, table cells, block attributes, diagrams, links, and attachments. Run browser tests when editor behaviour changes. A local preview verifies local rendering; publishing also requires a check of the deployed route.

### Navigation and assets

Moving a file or changing its number prefix changes its URL. Update incoming links, then check the old and new routes. [Tree handling](/consumer/1-usage/2-tree-handling/) explains labels, ordering, and hidden pages.

| Change                         | Check in preview and after publication                                   |
| ------------------------------ | ------------------------------------------------------------------------ |
| Rename a page or folder        | Sidebar order, page URL, and incoming links                              |
| Replace an image or attachment | Relative source path, rendered image or download, and alt text           |
| Hide a page                    | Sidebar and search visibility; access control at the web host if private |
| Change `docs.base`             | Nested links and assets at the public base path                          |

## 4. Check edits and publication

Where the host supports editing or publication, follow the page through its save and release workflow. Docs parses and renders the content; the host supplies routes, assets, and registered custom blocks and controls authentication, permissions, persistence, publication, and asset storage. Verify those boundaries against the host's actual behaviour and record.

### Saved edits

For editable content, save, reload, and compare the same meaning. If the host exposes revisions, check that concurrent edits cannot silently overwrite one another. Confirm publication separately when the host supports it.

### Published access

When publishing is supported, verify authorised reads and writes, attachment ownership, and published content and attachment URLs through the host's workflow. After release, inspect the deployed route and record the source revision when available.

### Version history

Keep the page's evolution available without cluttering its published body. Track repository-backed Markdown or MDX pages with Git. If a remote host supports history, verify that its revisions can be read and that a future author can trace the published revision back to the material and decisions that produced it.

## 5. Record the result

Leave enough evidence for another author to understand the outcome. Keep this record outside the published leaf.

### Required records

Retain these records so another author can reproduce the path from source material to the published leaf. Include the draft's hierarchy, meaning, links, blocks, citation cleanup, routes, interaction states, attachment handling, and revision in the relevant audit or publication record.

| Record             | What it establishes                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Source manifest    | Which sources and attachments were available, including failed collection or missing material. |
| Coverage audit     | How each distinct source point and explicit list item was handled in the leaf.                 |
| Generation trace   | How collected material and authoring decisions produced the final draft.                       |
| Publication record | Which source revision, deployed route, interaction states, and attachment URLs were inspected. |

### Response log

Every AI-generated page response must end with a concise Validation Log after the page body. Keep that log in the accompanying response or workflow record, outside the content saved as the published page. Report failed or unverified checks truthfully rather than checking them off.

```md
### Validation Log

- [x] Sources: Required material, explicit points, and attachments accounted for.
- [x] Structure: First body heading is H2; later headings follow the hierarchy.
- [x] Content: Meaning, links, and Australian English checked against sources.
- [x] Syntax: Blocks and literal examples checked in the target renderer.
- [x] Citations: Tool citation markers removed; useful source links retained.
- [x] Result: Rendered route, edits, and publication checked where applicable.
```

### Limits

State any access or rendering limit concretely rather than claiming a check you could not perform.

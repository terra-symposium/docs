---
title: Playwright tests
description: Run Docs browser tests and inspect routes, interaction states, and screenshots.
---

## Run

Run the browser suite from this repository's root after `pnpm install --frozen-lockfile`:

```sh
pnpm run test:browser
```

The command builds the package, builds the Astro test site in `dist/site/`, builds the published Markdown site in `dist/docs/`, then runs two Playwright configurations. Both launch Chromium against a local HTTP server; neither needs a remote Docs account or production database.

| Configuration                           | Site served                                          | What it selects                                                        |
| --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `config/playwright.config.ts`           | Astro fixtures from `dist/site/`, port `4335`        | Workspace and editor tests with declared viewport coverage             |
| `config/playwright.published.config.ts` | Generated site from `dist/docs/`, port `4336`        | Published Markdown, MDX, and static editor smoke tests                 |
| `config/playwright.static.config.ts`    | An already running Astro fixture site on port `4335` | Every declared test, without the normal viewport or site split filters |

The normal command collects 95 Chromium project cases from 93 distinct test definitions. The main configuration has 87 cases and the published configuration has 8. One responsive workspace test runs at three widths, accounting for the two extra cases. The unfiltered inventory has 93 test definitions in 22 spec files. See [Selection](#selection) for how viewport and site selection work.

To inspect the current selection without running browsers:

```sh
pnpm exec playwright test --list --reporter=list --config config/playwright.config.ts
pnpm exec playwright test --list --reporter=list --config config/playwright.published.config.ts
pnpm exec playwright test --list --reporter=list --config config/playwright.static.config.ts
```

## Workspace

The six specs under `tests/browser/workspace/` contain 29 tests across the generated site, the local workspace, and the hosted demo. Their shared fixture in `tests/browser/support/workspace-fixture.ts` resets the demo's `localStorage` and fails on uncaught page errors, console errors, or failed requests.

| Area                  | Tests | What the browser does                                                                                                                                                                                 |
| --------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static editing        |     3 | Edits a Markdown page and downloads its new source; opens Tree handling without an editor crash and preserves rich blocks on download; saves a local embedded workspace as Markdown.                  |
| Routes and reading    |     6 | Mounts standalone nested navigation; keeps the selected leaf, URL, and document aligned; hides a redundant single-tree selector; renders dividers, numbered lists, and live hue changes.              |
| Shell and navigation  |     5 | Checks header, toolbar, sidebar, and leaf actions; switches leaves without reload; follows sibling links; uses heading permalinks and the page contents list; opens deletion and attachment controls. |
| Tree operations       |     6 | Creates, renames, duplicates, downloads, deletes, reorders, and merges trees, branches, and leaves, then checks persisted order, content, and attachments.                                            |
| Attachments and edits |     4 | Uploads, opens, downloads, and removes files; saves visual title and body edits; restores a revision; selects another leaf after deleting the active one.                                             |
| Host capabilities     |     5 | Checks tree creation and keyboard menus; tree rename, color, and deletion; remote visual editing; local read-only modes; and host branding versus leaf metadata.                                      |

The hosted demo uses a browser-local adapter. These tests exercise the visible controls and persistence across reloads in that fixture; they do not prove that a consumer's database, authentication, or server permissions work. [Host integration](/developer/component/host-integration/) describes those host responsibilities.

## Blocks

The 14 specs under `tests/browser/components/terra/editor/docs/` contain 48 tests. They load `editor-harness` with Portable Text fixtures through `tests/browser/support/editor.ts` and inspect rendered controls, emitted values, and compatibility with older content.

| Spec        | Tests | Coverage                                                                                                                                                             |
| ----------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accordion` |     2 | Converts legacy accordion records to Markdown and opens their panels with the shared Styling control.                                                                |
| `callout`   |     3 | Edits the title and nested body; imports a directive with rich text and serializes the edited result.                                                                |
| `code`      |     5 | Edits source and language, copies code, preserves real newlines and literal `\n`, and renders received source with a header and copy control.                        |
| `embed`     |     1 | Shows an embed's title and size without making a remote request.                                                                                                     |
| `image`     |     2 | Edits image metadata and deletes only the selected image block.                                                                                                      |
| `math`      |     2 | Renders and edits a display formula, checks KaTeX fonts, and renders inline math within a paragraph.                                                                 |
| `nesting`   |     4 | Checks allowed root and nested insertions, migrated table editing and reload, and conversion of legacy groups to Markdown.                                           |
| `nodes`     |     5 | Preserves canvas height, renders nodes and edges, and lays out unpositioned nodes, self loops, and compound groups without browser errors.                           |
| `quiz`      |     4 | Covers the opt-in generation, review, run, score, and discard flow; default toolbar state; retry after host failure; and invalid endpoint data.                      |
| `raw`       |     1 | Shows unsupported source as read-only content.                                                                                                                       |
| `registry`  |     3 | Checks available block insertions, per-block opt-outs without source loss, and when the attachment picker permits a visual embed.                                    |
| `table`     |     8 | Edits structure; preserves inline code and legacy Sanity/Docs cell shapes; imports Markdown; edits heading, rows, and columns; and inserts a table from the toolbar. |
| `tabs`      |     5 | Converts legacy tab records to Markdown, switches panels with Styling, and renders source-backed and legacy nested table cells.                                      |
| `tsdocs`    |     3 | Hides the remote panel without a scope, shows generated reference pages for a scope, and reports a failed scope load.                                                |

The block tests use fixture content and mocked host responses. They verify the component behavior in a browser, including actual editing where the spec says so; they do not fetch live third-party data.

## Published pages

`tests/browser/markdown-rendering.spec.ts` has five tests against the built Markdown site:

1. An MDX code fixture displays a language header, highlighted source, and working copy button.
2. An MDX diagram fixture renders its start and finish nodes.
3. A Markdown page hydrates Styling tabs and accordions, and both controls respond to clicks.
4. The presentation fixture keeps its title spacing and displays one highlighted code surface.
5. The mode selector's popover uses the expected surface in light and dark themes. This test skips itself when the installed Styling version is older than the required control variant.

The published configuration also runs three workspace tests from `static-source.spec.ts` and `rendering.spec.ts`: Markdown Save downloads updated source, Tree handling preserves rich blocks, and a standalone Astro page mounts nested navigation. These check the generated site rather than only the Astro test fixture.

## Visual checks

`tests/browser/visual.spec.ts` declares 11 tests against `/parity-demo/`. Three compare full-page screenshots at desktop, breakpoint, and mobile widths. The others inspect long and empty descriptions, the mode menu, Edit toolbar, Attachments empty state, leaf and branch context menus, and the attachment dialog. The screenshot provenance and tolerance are recorded in `tests/browser/visual-baseline.md`.

These comparisons capture the current Docs design. Review a difference against the intended UI before updating a baseline.

## Selection

The normal configurations use `withResponsivePlaywright` with `viewportPolicy: 'declared'`. A test needs a viewport tag, or a supported responsive declaration, to enter those projects. The main suite excludes the published smoke titles using the regular expression in `config/playwright-selection.mjs`; the published suite includes the same titles.

All 22 spec files now enter the normal command. The main configuration includes the callout, math, nodes, and visual cases at a declared desktop collection viewport; the visual cases set their own reference widths inside each test. The published configuration handles its three static editor smokes and five Markdown/MDX cases. Compare both `--list` inventories with the final run report: a collected case is not proof of a passing case.

The rest of the repository checks, including unit tests and the Markdown sanitizer, are in [Quality and tests](/developer/repo/quality-and-tests/).

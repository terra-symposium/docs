---
title: Testing
description: Choose Docs checks, inspect browser coverage, and interpret results.
---

## Choose a check

Run commands from the repository root after `pnpm install --frozen-lockfile`. Install `uv` for Quality's Python checks; the Quality scripts load pinned tools from `config/python-quality-requirements.txt`. CI uses Python 3.12.

| Command                  | What it checks                                                              |
| ------------------------ | --------------------------------------------------------------------------- |
| `pnpm run docs:sanitize` | Authored Markdown migration and syntax findings; exits nonzero on findings. |
| `pnpm run check`         | Prettier, ESLint, and TypeScript.                                           |
| `pnpm run build`         | Published library output and styles.                                        |
| `pnpm run docs`          | Library and static documentation site build.                                |
| `pnpm run test:unit`     | Package unit tests after a library build.                                   |
| `pnpm run test:browser`  | Astro and published-site browser suites described below.                    |
| `pnpm run test`          | Unit and browser suites.                                                    |
| `pnpm run quality:all`   | Full repository Quality gate; findings exit nonzero.                        |
| `pnpm run quality:check` | Alias for the same full Quality gate.                                       |

Quality, build, and functional tests run separately so each result is visible. `quality:fix` can edit files; inspect its diff, then rerun `quality:all` and the affected tests.

## Browser suites

`pnpm run test:browser` builds the package, the Astro test site in `dist/site/`, and the published Markdown site in `dist/docs/`, then runs two Playwright configurations. Both launch Chromium against a local HTTP server; neither needs a remote Docs account or production database.

| Configuration                           | Site served                                   | What it selects                                             |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `config/playwright.config.ts`           | Astro fixtures from `dist/site/`, port `4335` | Workspace and editor tests with declared viewport coverage  |
| `config/playwright.published.config.ts` | Generated site from `dist/docs/`, port `4336` | Published Markdown, MDX, and static editor smoke tests      |
| `config/playwright.static.config.ts`    | Running Astro fixture site on port `4335`     | Every declared test without normal viewport or site filters |

The normal command collects 96 Chromium project cases from 94 test definitions. The main configuration has 88 cases and the published configuration has 8. One responsive workspace test runs at three widths. The unfiltered inventory has 94 test definitions in 22 spec files. A collected case is not proof of a passing case; compare both configuration inventories with the final run report.

## Coverage

The suites cover navigation, editable blocks, static publication, and visual states.

### Workspace

The six specs under `tests/browser/workspace/` contain 29 tests across the generated site, local workspace, and hosted demo. Their shared fixture in `tests/browser/support/workspace-fixture.ts` resets the demo's `localStorage` and fails on uncaught page errors, console errors, or failed requests.

| Area                  | Tests | What the browser does                                                                                                                                                                                 |
| --------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static editing        |     3 | Edits a Markdown page and downloads its source; opens Tree handling without an editor crash and preserves rich blocks on download; saves a local embedded workspace as Markdown.                      |
| Routes and reading    |     6 | Mounts standalone nested navigation; keeps the selected leaf, URL, and document aligned; hides a redundant single-tree selector; renders dividers, numbered lists, and live hue changes.              |
| Shell and navigation  |     5 | Checks header, toolbar, sidebar, and leaf actions; switches leaves without reload; follows sibling links; uses heading permalinks and the page contents list; opens deletion and attachment controls. |
| Tree operations       |     6 | Creates, renames, duplicates, downloads, deletes, reorders, and merges trees, branches, and leaves, then checks persisted order, content, and attachments.                                            |
| Attachments and edits |     4 | Uploads, opens, downloads, and removes files; saves visual title and body edits; restores a revision; selects another leaf after deleting the active one.                                             |
| Host capabilities     |     5 | Checks tree creation and keyboard menus; tree rename, color, and deletion; remote visual editing; local read-only modes; and host branding versus leaf metadata.                                      |

The hosted demo uses a browser-local adapter. These tests exercise visible controls and fixture persistence across reloads; they do not prove that a consumer's database, authentication, or server permissions work. [Host integration](/developer/component/host-integration/) describes those responsibilities.

### Blocks

The 14 specs under `tests/browser/components/terra/editor/docs/` contain 48 tests. They load `editor-harness` with Portable Text fixtures through `tests/browser/support/editor.ts` and inspect rendered controls, emitted values, and compatibility with older content.

| Spec        | Tests | Coverage                                                                                                                              |
| ----------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------- |
| `accordion` |     2 | Converts legacy accordion records to Markdown and opens panels with the shared Styling control.                                       |
| `callout`   |     3 | Edits title and nested body; imports a directive with rich text and serializes the edited result.                                     |
| `code`      |     5 | Edits source and language, copies code, preserves real newlines and literal `\\n`, and renders source with a header and copy control. |
| `embed`     |     1 | Shows an embed's title and size without making a remote request.                                                                      |
| `image`     |     2 | Edits image metadata and deletes only the selected image block.                                                                       |
| `math`      |     2 | Renders and edits display math, checks KaTeX fonts, and renders inline math within a paragraph.                                       |
| `nesting`   |     4 | Checks allowed insertions, migrated table editing and reload, and conversion of legacy groups to Markdown.                            |
| `nodes`     |     5 | Preserves canvas height, renders nodes and edges, and lays out unpositioned nodes, self-loops, and compound groups.                   |
| `quiz`      |     4 | Covers opt-in generation, review, run, score, and discard; default toolbar state; host failure retry; and invalid endpoint data.      |
| `raw`       |     1 | Shows unsupported source as read-only content.                                                                                        |
| `registry`  |     3 | Checks block insertions, per-block opt-outs without source loss, and attachment picker eligibility.                                   |
| `table`     |     8 | Edits structure; preserves rich and legacy cells; imports Markdown; edits headings, rows, and columns; inserts from toolbar.          |
| `tabs`      |     5 | Converts legacy tabs, switches panels, and renders source-backed and legacy nested table cells.                                       |
| `tsdocs`    |     3 | Hides remote panel without a scope, shows generated references, and reports failed scope loads.                                       |

These tests use fixture content and mocked host responses. They verify browser behavior, including actual editing where specified; they do not fetch live third-party data.

### Published pages

`tests/browser/markdown-rendering.spec.ts` defines five tests against the built Markdown site. They check highlighted/copyable MDX code, rendered MDX diagrams, hydrated Markdown tabs and accordions, selected fonts and highlighted code on the Blocks reference, and the presentation mode popover in light and dark themes. The presentation test skips when the installed Styling version lacks the required control variant.

The published configuration also runs three workspace tests from `static-source.spec.ts` and `rendering.spec.ts`: Markdown Save downloads updated source, Tree handling preserves rich blocks, and a standalone Astro page mounts nested navigation. These check the generated site rather than only the Astro fixture.

### Visual checks

`tests/browser/visual.spec.ts` declares 11 tests against `/parity-demo/`. Three compare full-page screenshots at desktop, breakpoint, and mobile widths. The others inspect long and empty descriptions, the mode menu, Edit toolbar, Attachments empty state, leaf and branch context menus, and attachment dialog. Screenshot provenance and tolerance are recorded in `tests/browser/visual-baseline.md`. Review differences against the intended UI before updating a baseline.

## Select and interpret results

The normal configurations use `withResponsivePlaywright` with `viewportPolicy: 'declared'`. A test needs a viewport tag or supported responsive declaration to enter those projects. The main suite excludes the published smoke titles using the regular expression in `config/playwright-selection.mjs`; the published suite includes them. All 22 spec files enter the normal command. The main configuration includes callout, math, nodes, and visual cases at a declared desktop collection viewport; visual cases set their own reference widths inside each test.

To inspect collection without running browsers:

```sh
pnpm exec playwright test --list --reporter=list --config config/playwright.config.ts
pnpm exec playwright test --list --reporter=list --config config/playwright.published.config.ts
pnpm exec playwright test --list --reporter=list --config config/playwright.static.config.ts
```

For Markdown edits, run the sanitizer and site build, then inspect the changed route. For library changes, run `check`, `build`, and relevant unit or browser coverage. Run both suites when a change crosses package and site boundaries. For public API changes, verify exported types and update the [API reference](/developer/component/blocks/) and [Host integration](/developer/component/host-integration/).

CI runs the sanitizer, build, full Quality gate, static Docs build, and the suites listed in `config/tests.json` on pull requests. A green static build does not prove that a page rendered meaningfully: open the route and inspect its content, interactions, and layout.

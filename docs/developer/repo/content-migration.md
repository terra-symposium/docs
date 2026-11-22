---
title: Migrate content
description: Check legacy Docs Markdown, apply safe repairs, and preserve source data.
---

## Inspect first

The sanitizer lives in the Docs **source checkout**, under `scripts/docs-sanitize/`. It is not included in the published npm package. Run it against a consumer's authored Markdown folder:

```sh
python3 /path/to/docs/scripts/docs-sanitize/cli.py check /path/to/consumer/docs
```

`check` makes no edits and exits nonzero when it finds a problem. Add `--json` for a machine-readable report. The checker covers delimiter spacing, obsolete `<CodeBlock>` and `<DocsBlock>` tags, old `NodesBlock` shims, content dividers, and missing or empty diagram data.

## Apply safe repairs

Use the same checkout to run the deterministic fix, then inspect every changed file:

```sh
python3 /path/to/docs/scripts/docs-sanitize/cli.py fix /path/to/consumer/docs
python3 /path/to/docs/scripts/docs-sanitize/cli.py check /path/to/consumer/docs
```

The fixer can normalize supported delimiters and convert literal legacy blocks. It does not reconstruct missing graph nodes or edges. Recover those from the original frontmatter or source history; leave a finding visible if the source is unavailable. Never replace a diagram with invented empty arrays to make the check pass.

The deterministic fixes put Docs delimiters on separate lines with blank lines around the body, convert literal `<CodeBlock>` props to fenced Markdown, and convert supported literal `<DocsBlock>` payloads. Inspect the diff, run `check` again, and build the consumer site. Add a fixture under `scripts/docs-sanitize/` before extending a transformation.

## Recover manually

Automated fixes do not decide the meaning of obsolete rich blocks. Inspect each source before moving it to native Markdown or current component syntax:

| 🧩 Case                     | Preserve or repair                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧱 Other obsolete blocks    | Migrate their data; do not use placeholders.                                                                                                                                                        |
| 🪢 Legacy `NodesBlock` shim | Remove the authored import and `export const Nodes = props => <NodesBlock block={props} />` shim so the built-in `Nodes` is used. Keep imports inside code examples and unrelated application code. |
| 🕸️ Diagram frontmatter      | Resolve `frontmatter.*` references from the original source or archive. Keep the original inline `nodes` and `edges` objects, one per line. An empty array is a finding, not recovered data.        |

If diagram source data is unavailable, report that limit instead of inventing a diagram.

## Check the scan

CI runs `pnpm run docs:sanitize` against this repository's `docs/` tree. Pass another root to inspect a consumer. The CLI skips generated `dist`, installed dependencies, and migration audit artifacts; do not treat those directories as authored content. The implementation and fixtures live in `scripts/docs-sanitize/` in the Docs source checkout.

## Verify the migration

1. Compare the diff with the original page.
   - Account for every block, link, asset, and attachment.
2. Build the consumer's site and open the changed routes in a browser.
3. Check used blocks and narrow-screen layout.
   - Include code fences, tabs, accordions, and diagrams.

The `scripts/docs-sanitize/README.md` file in the Docs source checkout describes the checks and skip rules. Add a fixture under `scripts/docs-sanitize/` before extending a transformation. The [Docs sanitization skill](/agents/skills/docs-sanitization/) gives the content-preservation rules.

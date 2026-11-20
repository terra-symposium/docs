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

## Verify the migration

1. Compare the diff with the original page and account for every block, link, asset, and attachment.
2. Build the consumer's site and open the changed routes in a browser.
3. Check code fences, tabs, accordions, diagrams, and narrow-screen layout where used.

The `scripts/docs-sanitize/README.md` file in the Docs source checkout describes the checks and skip rules. Add a fixture under `scripts/docs-sanitize/` before extending a transformation. The [Docs sanitization skill](/agents/skills/docs-sanitization/) gives the content-preservation rules.

---
name: docs-sanitization
description: Audit and safely repair Terra Docs Markdown migrations, including fenced blocks, diagram data, and legacy component tags.
---

# Docs sanitization

Use the shared CLI from the Docs repository when cleaning Markdown in a Docs consumer:

```sh
python3 /path/to/docs/scripts/docs-sanitize/cli.py check /path/to/consumer/docs
python3 /path/to/docs/scripts/docs-sanitize/cli.py fix /path/to/consumer/docs
```

`check` is read-only and exits nonzero for findings. `fix` only performs deterministic transformations: splitting Docs delimiters onto their own lines with blank lines around the body, converting literal `<CodeBlock>` props to fenced Markdown, and converting supported literal `<DocsBlock>` payloads. Run `check` again after `fix`. CI runs `pnpm run docs:sanitize` against this repository's `docs/` tree. Pass another root to audit a consumer.

## Preserve the authored meaning

- A block opener such as `|||[TypeScript API]`, `===[Details]`, or `:::note[Note]` occupies its own line. Leave one blank line before its body and before the matching closer. See the [block contract](../../../developer/component/blocks.md).
- Fenced code uses a language info string, including `text` when no better language applies. Single backticks stay inline and never receive a code-block header or copy button. Use a fence longer than any backtick run inside the example.
- `<CodeBlock>` and `<DocsBlock>` are obsolete in authored Markdown. Convert safe literal code tags with `fix`; migrate other rich blocks to their native Markdown or current component syntax after inspecting their data. Do not replace them with placeholders.
- Docs supplies its built-in `Nodes` component. Remove the old `NodesBlock` import and `export const Nodes = props => <NodesBlock block={props} />` shim from authored pages. Preserve imports inside code examples and unrelated application imports.
- Remove standalone Markdown `---` dividers from page content; presentation spacing belongs to the Docs styles. Preserve the opening and closing `---` frontmatter fences and examples inside code fences.
- Preserve `<Nodes>` graph data when moving content out of frontmatter. Inline `nodes` and `edges` must contain the original objects, each on one line. Resolve `frontmatter.*` references from the original source or archive; an empty array is a finding, not valid recovered data. If the source is unavailable, leave the finding and report it rather than inventing a diagram.
- Use Markdown tables for ordinary tabular text. Keep HTML tables when classes or fragile embedded components require it.
- Do not scan generated `dist`, installed dependencies, or migration audit artifacts as authored content. The CLI skips those directories. Review the diff after a fix, then run the consumer's Docs build.

The CLI implementation and fixtures live in `scripts/docs-sanitize/`. Add a fixture for each new failure mode before broadening a transformation.

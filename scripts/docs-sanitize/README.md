# Docs Markdown sanitizer

Run `pnpm run docs:sanitize` in this repository for the CI check. For a consumer, pass its authored Markdown root to `python3 scripts/docs-sanitize/cli.py check ROOT`. Use `fix ROOT` for safe edits, then check again and review the diff.

Checks cover delimiter blank lines, legacy `<CodeBlock>` and `<DocsBlock>` tags, obsolete `NodesBlock` import/export shims, content dividers, `<Nodes>` references to removed frontmatter, and absent or empty diagram arrays. Frontmatter and code fences are preserved.

The fix mode consolidates the reusable temporary migration scripts: block-spacing normalization, literal code-tag conversion, and supported image, accordion, and node payload conversion. Recovery scripts that embedded specific Website or Systems archive paths were intentionally replaced by the missing-data check. Recover those diagrams from their original frontmatter or archive by hand; the sanitizer never fabricates data.

`--json` emits findings for other CI systems. `check` returns exit code 1 when it finds any problem.

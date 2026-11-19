---
name: align
description: Compare generated content with production Docs locally.
metadata:
  related-files:
    - src/lib/markdown-model.ts
    - src/components/blocks.tsx
    - tests/blocks.test.mjs
---

# Align generated Docs content

Use this skill to compare Canvas-derived output with a representative production Docs page and improve the local generation contract. Judge structure, information density, block choice, and source coverage alongside parseability. Apply [author](../../../docs/1-authoring/authoring.md)'s schema-governed writing rules to the generated leaf; this skill adds transport, validation, and comparison rules. For an explicitly requested saved Gem change, read [Gem maintenance](gem-maintenance.md).

When editing Docs Markdown callouts, leave a blank line immediately after the opening fence and immediately before the closing `:::`. Keep the callout body between those blank lines so Prettier and the Docs parser retain its block structure. Apply the same spacing to other fenced Docs blocks when the formatter would otherwise wrap body text onto a fence line.

The generation driver and schema live in Website. Inspect the current Website checkout before relying on a command or provider behavior. A comparison needs a saved Canvas capture and a representative production Docs leaf.

:::note[Evidence needed]

If either the source capture or production leaf is missing, report the gap rather than claiming that generated output matches production.

:::

## Prepare the comparison

Read production examples and target facts through Docs MCP. Use the saved Canvas capture and its attachments for source facts; production examples teach form, not facts. Before changing a prompt, inspect the prompt version, the representative leaf's Markdown, `sanity/schemas/docs.tsx`, the parser and renderer, relevant actions, and the Playwright Canvas scraper. Include the relevant [verbatim schema directives](../../../docs/1-authoring/authoring-schema.md) in the generation context rather than substituting a paraphrase or a filename alone.

Keep artifacts local, such as in Downloads. Do not call `docs.leaf.generate`, `docs.leaf.write`, or another Sanity mutation. Use the browser and authentication method authorised for the task. Inspect the Website driver before choosing headed or non-headed execution, and stop on authentication failure. Keep credentials, cookies, storage state, and environment values out of artifacts. Commit only when asked.

## Run a local iteration

1. Save the prior Gem ID, description, knowledge filenames, and exact instructions locally. Record each prompt revision in the [prompt journal](gem-references/prompt-journal.md) with its date, prompt, Gem ID, mode, context files, and validation.
2. If the requested iteration needs a saved Gem change, follow [Gem maintenance](gem-maintenance.md). Reload and verify the saved instructions and knowledge labels, then keep the local driver prompt in step with the Gem output contract.
3. Generate from the local Canvas capture or fixture with the current Website driver. Inspect the raw response before normalisation.
4. Run the shared `HealWorkflow` and `_coverage.mjs` validator described in [Gem maintenance](gem-maintenance.md). Keep raw output and audit diagnostics. Pass exact failures into each retry; the initial attempt plus three retries is the maximum.
5. Compare the valid output with the production leaf. Revise only for a recorded failure in structure, block choice, source coverage, or the output contract.

The comparison should account for these distinct kinds of evidence.

| Check            | Evidence to inspect                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source coverage  | Full page body and readable attachments; distinct facts, lists, questions, tasks, code, requirements, deliverables, dates, and actionable links. |
| Synthesis        | Concepts and relationships rather than a file inventory, Canvas-week outline, or transcript dump.                                                |
| Production style | Connected prose, hierarchy, information density, and blocks that expose real relationships.                                                      |
| Validity         | Raw transport contract, supported syntax, structural validation, attachment coverage, and bounded retries.                                       |

A title-only or link-only item is a source limitation, not permission to infer its contents. Exhausted retries are failure, not partial success.

## Check the output contract

Check the current Website prompt and extractor before testing. The old contract requires the response's first bytes to be an opening triple-backtick `markdown` fence and newline, and its final bytes to be the matching closing fence. Require exactly one outer pair, nothing outside it, no citation markers or UI labels, and an H2 as the first body line. The body is Markdown/MDX text, never a `markdown`, `content`, or other field. The extractor accepts three or more backticks and some unfenced output, so verify the stronger raw-response contract directly. Require canonical `<Code language="...">` for multiline code and no triple backticks inside the body.

Put the output contract first, followed by the schema's authoring directives verbatim, source authority, exact block grammar, then a silent final check. Do not paraphrase the schema's purpose, voices, list-preservation rule, or leaf-body instructions into a different requirement. Use native HTML tables for repeated or multidimensional data when the Website parser accepts them; keep block components out of table cells. Verify each block delimiter and attribute against the target parser, then request a complete corrected artifact after a driver error rather than a repair explanation.

For inline `<Nodes>` data, put one complete node or edge object on each line. Keep that object's fields and nested objects together on the same line; do not expand its keys across multiple lines. If Prettier would expand those objects, put `<!-- prettier-ignore -->` immediately before the `<Nodes>` tag.

Keep style rules general. Do not turn a single production example into a rule or mistake a model's repair explanation for a corrected artifact.

:::note[Schema and parser disagreement]

The supplied Website schema comment labels `===` as tabs and `|||` as accordions, while the Docs parser maps them in the opposite direction. Resolve that disagreement in the current generation target before calling either form canonical. Check the actual block registry and parser for examples rather than relying on a prompt claim that every block has one. The schema's authoring rules govern the writing; executable parser behavior governs syntax.

:::

## Document fixture changes

Generation fixtures and drivers need TSDoc stating their agent-iteration purpose, local-only boundary, and structural contract. Follow the [Hygiene skill's source readability guidance](../../../../standards/.agents/skills/quality/references/hygiene.md).

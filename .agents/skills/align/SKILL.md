---
name: align
description: Compare generated content with production Docs locally.
metadata:
  related-files:
    - src/lib/markdown-model.ts
    - src/components/blocks.tsx
    - tests/blocks.test.mjs
---

# Canvas Docs Generation Iteration

Use only to improve the Canvas source adapter for Docs generation. For general authoring, follow the [Docs authoring skill](../docs-authoring/SKILL.md); for saved Gem changes, follow the [Docs Gem skill](../gem/SKILL.md). The goal is production-like structure, information density, and block choice, not merely parseable output.

This skill lives in Docs, but the generation driver and schema live in Website. Before relying on a command or a provider behavior, inspect the current Website checkout at the paths below. A read-only comparison also needs a saved Canvas capture and a representative production Docs leaf; without both, report the missing evidence rather than claiming the outputs match.

## Safety and inputs

- Read production examples and target facts through Docs MCP.
- Never call `docs.leaf.generate`, `docs.leaf.write`, or another Sanity mutation. Save artifacts locally, such as in Downloads.
- Use the browser and authentication method authorized for the task. Do not substitute another browser for one the user explicitly requested.
- Inspect the current Website driver before selecting headed or non-headed execution. Stop on authentication failure instead of opening another session.
- Never expose credentials, cookies, storage state, or environment values. Do not commit unless explicitly asked.

Before a prompt change, provide the Gem with:

1. Representative production leaf Markdown showing content and the block forms actually accepted by its current target parser.
2. The prompt version being tested.
3. `sanity/schemas/docs.tsx`, parser/renderer sources, relevant actions, and the Playwright Canvas scraper.

Production examples teach form, never source facts.

## Iteration steps

1. Save the prior Gem configuration locally: ID, description, knowledge filenames, and exact instructions.
2. Add an immutable numbered record to the [Docs Gem prompt journal](https://github.com/terra-symposium/docs/blob/development/.agents/skills/gem/references/prompt-journal.md) with date, exact prompt, Gem ID, mode, context files, and validation.
3. Update Gem context through isolated Playwright Chrome; reload and verify saved instructions and file labels. Uploads may persist even when the save button is disabled.
4. Keep the local Playwright driver prompt synchronized with the Gem output contract.
5. Generate from a local Canvas fixture or saved scrape with the current Website driver. Never patch Sanity or reuse Dia without authorization.
6. Inspect the raw response before normalization. The current prompt asks for one outer `markdown` fence, no outside text, and an H2 first body line. Its extractor accepts three or more backticks and also accepts some unfenced output, so verify the stronger prompt contract yourself. It currently requires `<Code>` for code samples and rejects inner triple backticks. Confirm source facts are retained without invention.
7. Run the shared `HealWorkflow` and `_coverage.mjs` validator described in the [Docs Gem skill](https://github.com/Terra-Symposium/docs/blob/development/.agents/skills/gem/SKILL.md). Preserve raw/audit output; the initial attempt plus three retries is the maximum. Pass exact failures and requested corrections into the next attempt. Exhaustion is failure, not partial success.
8. Revise only to address a recorded failure. Repeat until structure, block distribution, and attachment coverage meet the contract.

## Prompt design

Put the output contract before style guidance. Require:

- one fenced Markdown artifact and no wrapper, labels, prose, or JSON outside it;
- tables in syntax supported by the target parser; do not assume raw HTML is accepted by the Website generation contract;
- `<Code language="...">` examples while the current Website driver forbids inner triple backticks;
- permitted Docs blocks only; no invented components;

concise headings and one idea per bullet, with natural prose and lines under 140 characters where practical;

- inline `<code>` for technical tokens and `$...$` for symbolic relationships;

tables for repeated/comparison data, concise asides for salient constraints, `<Nodes>` for real sequences, accordions for secondary detail, and numbered lists only for ordered procedures;

- a silent structural self-check and a complete corrected artifact when the driver reports an error.

Keep style guidance generic; do not turn one source example into a universal rule. Test the output contract, not whether the model explains its repair.

The current Website schema comment labels `===` as tabs and `|||` as accordions, while the Docs parser maps them in the opposite direction. Resolve that disagreement in the target source before claiming either form is canonical for generated content. The current Website prompt also refers to schema examples for every block, but the inspected schema may omit examples; check the actual block registry and parser instead of repeating that claim.

## Test documentation

Generation fixtures and drivers need TSDoc stating their agent-iteration purpose, local-only boundary, and structural contract. Follow the [Hygiene skill's source readability guidance](../../../../standards/.agents/skills/quality/references/hygiene.md).

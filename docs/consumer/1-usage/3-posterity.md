---
title: Posterity
description: Preserve decisions, source context, and retrieval paths for future readers and agents.
---

## Context

Preserve the reason a page exists and the constraints behind its advice. Code shows how a system works; a durable explanation records the business need, architectural decision, trade-off, and outcome that code alone cannot show. A performance refactor that leaves behaviour intact should rarely require rewriting that explanation.

Keep the context that a future author will need in an authoring brief:

- Record the reader's prior knowledge, exclusions, and unresolved questions.
- Trace claims to their source and the reason the final wording was chosen.
- Put context in published prose when readers need it.
  - Use a `context` field only when the host supports it.
  - Do not invent fields for repository-backed Docs pages.
- Add new information to the earlier study concept it extends.
  - Do not repeat that explanation in the newest leaf.

For example, a pricing brief can state that the reader has already seen the features page, is comparing a competitor, and needs an explanation of return on investment rather than technical specifications. This guides the draft without adding unsupported frontmatter.

## AI comments

Use a short, single-line `{/* comment */}` only when an agent may otherwise miss an important intent or ambiguity. Keep it beside the relevant content. Do not restate visible prose, expose private source data, or fill the page with instructions to the agent.

## AI tasks

Give an agent the source material, intended reader, desired outcome, transformation, and preservation boundary. The [Authoring guide](/consumer/1-usage/0-authoring/) distinguishes Synthesise, Convert, Critique, Compare, and Polish. If a document arrives without a task, use Convert: reorganise one source while preserving every distinct point. A request to polish changes wording and hierarchy, not facts; a request to compare identifies both shared and missing information.

When assigning the task:

1. Keep source data separate from instructions.
2. Check what the agent actually retrieved before relying on its draft.
3. Record uncertain or conflicting claims instead of inventing a resolution.

## Provenance

Keep a source manifest, coverage audit, and revision trail outside the published leaf. Retain useful source links in the page when readers need to follow them.

| Source of the page                   | Revision trail                             |
| ------------------------------------ | ------------------------------------------ |
| 📄 Repository-backed Markdown or MDX | Git history                                |
| ☁️ Hosted document                   | The host's revision system, when available |

A future author should be able to trace a claim to its source and understand why the final wording was chosen. [Validation](/consumer/1-usage/4-validation/) specifies the checks and records required before publication.

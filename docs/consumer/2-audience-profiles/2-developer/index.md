---
title: Developer
description: Explain software decisions, interfaces, and implementation to developers.
---

## Reader

Write for a developer integrating, maintaining, or extending a system. State the reader's likely system knowledge and the decision or task they need to handle. Keep the explanation objective: show how the implementation serves a domain goal, including constraints and trade-offs.

## Goal

Organise guidance by feature or decision rather than by source file. Explain the problem, the chosen approach, its consequences, and the contract developers rely on. Define unfamiliar terms; show how components, APIs, data, and state relate. Keep code snippets small enough to explain, but include imports or surrounding context required to use them.

| Reader need         | Lead with                 | Include                                                |
| ------------------- | ------------------------- | ------------------------------------------------------ |
| Integrate an API    | The result and contract   | Inputs, outputs, errors, and a working example         |
| Change a feature    | The domain goal           | Relevant components, data flow, constraints, and tests |
| Preserve a decision | The problem and rationale | Alternatives, trade-offs, and consequences             |

## Tone

Be precise, economical, and candid about uncertainty. Prefer stable concepts and contracts over a line-by-line narration of the implementation. Explain specialist terms when they are not part of the expected platform knowledge.

## Patterns

Use a decision record when a technical choice affects future integrations or changes.

### Decision records

Use a decision record for a choice likely to affect future changes. Keep its sections consistent: **Context** (problem and constraints), **Decision** (chosen approach), **Consequences** (benefits and costs), and **Alternatives** (credible options considered). Link each section to the feature or API it affects.

:::example[Decision record]

**Context:** Printed handouts include controls that readers do not need.

**Decision:** Use CSS print queries to hide those controls.

**Consequences:** Printed pages are easier to use; screen behavior stays unchanged.

**Alternatives:** A separate PDF could work, but it creates another version to maintain.

:::

## Sources

Check public contracts against the current API reference, implementation, tests, and release notes as relevant. Record the versions and sources used. Distinguish a tested guarantee from an inferred behavior, and link to the owner of details that may change.

## Validation

- Explain why the choice exists, not just which functions or files implement it.
- Distinguish stable contracts from implementation details that may change.
- State constraints and failure behavior where they affect integration.
- Verify names, examples, and behavior against the current API or code.
- Trace the explanation to its feature and domain goal.
- Ask a developer unfamiliar with the subsystem to use the page for a realistic change or integration task, then repair missing context and contract details.

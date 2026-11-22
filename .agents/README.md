# Agent skills

Skill instructions are authored in Docs. Run `pnpm run skills:prepare` to generate executable skills.

| Skill                      | Purpose                                                                                                                                                                                                                       | Source                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| custom-components          | Add reusable React/TSX examples to Docs Markdown pages while keeping the shared Docs layout, generated navigation, and existing Styling UI.                                                                                   | [docs/consumer/2-authoring/components/SKILL.md](../docs/consumer/2-authoring/components/SKILL.md)     |
| docs-content-render-parity | Diagnose and fix mismatches between local Markdown or remote Docs records and what a Docs instance displays. Use for content conversion, host adapters, rich blocks, TOCs, attachments, or shared Docs rendering regressions. | [docs/consumer/2-authoring/parity/SKILL.md](../docs/consumer/2-authoring/parity/SKILL.md)             |
| docs-sanitization          | Audit and safely repair Terra Docs Markdown migrations, including fenced blocks, diagram data, and legacy component tags.                                                                                                     | [docs/consumer/2-authoring/sanitization/SKILL.md](../docs/consumer/2-authoring/sanitization/SKILL.md) |

3 skills.

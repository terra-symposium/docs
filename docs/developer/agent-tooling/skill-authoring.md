---
title: Skill authoring
description: Author repository skills as Docs pages and compile them for agent discovery.
---

## Author a skill

Agent skill authoring keeps the Markdown page as the source of truth, then compiles it for agent discovery.

### Define the source

Write each skill as one dedicated `docs/**/SKILL.md` page. Its Markdown body is the instruction source for agents and also appears on the Docs site. Add this frontmatter:

```yaml
---
name: example-skill
description: Use this skill for a specific repeatable task.
skill: true
metadata:
  related-files:
    - path/to/current/source.ts
---
```

Keep links to detailed Markdown references and required assets relative to the skill page. Put them in sibling `references/`, `assets/`, `examples/`, `scripts/`, or `agents/` folders; the compiler copies those folders into the generated skill bundle. `metadata.related-files` names existing repository files that establish the workflow. Use `[]` when there is no such file. Keep the body readable as raw Markdown; generated skills must not depend on Docs-only rendering.

### Prepare the bundle

Install `@terra-symposium/skills` as a development dependency, then run `terra-skills prepare` from the repository root. The command writes `.agents/skills/` for agent discovery. Run `terra-skills check` to compare that output with the Docs source without rewriting files. Preparation refuses to replace a hand-authored skill directory. Add `.agents/skills/` to Git ignore rules and rerun preparation after changing a skill page. Start a new agent session or refresh discovery after preparation.

## Reuse the API

The package also exports `compileSkills(root)`, `prepareSkills(root)`, and `checkSkills(root)` for build tooling. `@terra-symposium/skills/authoring.md` exports this guide for tools that need it without a running Docs site.

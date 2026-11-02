---
title: Skills inventory
description: Build a searchable inventory of repository skills in a Docs site.
---

# Skills inventory

Docs exports a reusable `SkillsExplorer` component for repositories that keep agent guidance in `SKILL.md` files. The Docs build indexes skill files in the repository and writes the cache to `dist/cache/skills.generated.json`.

For example, add `docs/skills/index.mdx` and pass the generated cache to the component:

```mdx
import skills from '../../dist/cache/skills.generated.json';
import { SkillsExplorer } from '@terra-symposium/docs/skills';

<SkillsExplorer client:load skills={skills} />
```

The index searches repository files named `SKILL.md`, including skills stored under `.agents/skills`, `.codex/skills`, or package-specific folders. The page groups skills by their owning repository path and shows their descriptions, frontmatter metadata, source paths, and full Markdown instructions. Rebuild Docs after changing skill files so the cached inventory stays current.

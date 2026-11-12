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


## Storage

The standalone editor component is controlled: the host supplies `value` and receives edits in `onChange`. Repository-backed pages use `DocsLocalWorkspace` to render Markdown and adjacent files without an account or server. A remote Docs installation mounts `DocsWorkspace` and implements the `DocsHostAdapter` operations required for drafts, publishing, history, and attachment upload.

```tsx
const [value, setValue] = useState<DocsValue>(initialValue);

<Docs mode="edit" value={value} onChange={setValue} />;
```

Do not save on every keystroke. Let the host load a draft, save it with a revision check, and publish it explicitly. The host adapter contract is:

```ts
type DocsHostAdapter = {
  capabilities: DocsHostCapabilities;
  invoke(operation: DocsActionOperation, input?: unknown): Promise<DocsActionResult>;
  loadDraft?(path: string): Promise<DocsHostDocument | null>;
  publishDraft?(path: string): Promise<void>;
};
```

The host must authenticate every write and draft or history read. Use a compare-and-swap revision check so parallel editors cannot overwrite one another. Public readers should receive only published content and published attachment URLs. Local repository-backed hosts use the read-only local adapter and expose no browser write controls.

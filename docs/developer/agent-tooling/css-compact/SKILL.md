---
name: css-compact
description: Compact CSS and DOM styling hooks with utilities, pruning, and audited renames.
skill: true
metadata:
  related-files:
    - src/styles/prose.css
    - src/components/terra/pages/docs/_main.tsx
    - src/components/terra/pages/docs/_editable.tsx
    - docs/developer/component/styling.md
    - tests/browser/workspace/static-source.spec.ts
---

# CSS compaction

Use this skill when cleaning a stylesheet such as `src/styles/prose.css`, replacing one-off custom styling with Tailwind utilities, pruning unused rules, or shortening internal DOM hooks such as `data-docs-body-editor` to `data-editor`.

## Workflow

1. Read the target stylesheet, its importing/build configuration, and the components that produce or consume its selectors. Check the current worktree and preserve unrelated changes.
2. Inventory custom selectors and their usage with `rg`. Trace each class, data attribute, and state hook through JSX, CSS, scripts, tests, fixtures, and documented host integrations. Account for dynamically composed names before calling a rule unused.
3. Prefer inline Tailwind utilities for styles that belong to one component instance. Keep custom CSS for shared typography, pseudo-elements, complex selectors, and states or integrations that utilities cannot express clearly. Remove only rules with no live use or a clear utility replacement.
4. Shorten an internal class or data attribute only after confirming every producer and consumer is in scope. Search both the old and proposed names, including exact attribute selectors, to catch collisions and semantic overlap. A generic name such as `data-editor` may be ambiguous beside more specific editor hooks; retain a namespace when it helps distinguish the element or protect host integrations. Rename consistently in markup, CSS, event handling, tests, fixtures, and docs. Keep public or host-consumed selectors stable unless the task explicitly includes their migration; document compatibility requirements where needed.
5. Review the diff for duplicated utilities, stale selectors, accidental specificity increases, and unrelated changes. Keep names semantic and short enough to scan; avoid replacing descriptive names with ambiguous abbreviations.

## Verification

- Run the repository's CSS/style build and the relevant application build.
- Run focused tests that exercise the changed selector or hook; add a regression test when removing or renaming a hook could silently break behavior.
- Use browser verification when spacing, responsive behavior, or visual states change. Inspect the affected route at the relevant viewport and check computed geometry, not just source classes.
- Run `git diff --check` and report the selector inventory, checks, and any public integration that prevented a rename.

## Example

For `data-docs-body-editor`, search the complete repository before renaming. Its producer and three consumers are in `_main.tsx`; `_editable.tsx` checks editor readiness, `prose.css` styles it, and `static-source.spec.ts` uses it to edit a page and verify the saved Markdown download. Check whether the proposed shorter name is already used and still distinguishes this surface from other editor hooks. Update every consumer and run the focused browser test.

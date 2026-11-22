---
title: Tasks
description: Choose the transformation and preservation boundary for a Docs writing task.
---

## Choose the task

Choose what the request asks you to do with the material. These transformations have different preservation boundaries. If a document arrives without a task, use **Convert**.

When assigning an AI task, provide the source material, intended reader, desired outcome, transformation, and preservation boundary. Keep source data separate from instructions. Check what the agent actually retrieved before relying on its draft, and record uncertain or conflicting claims instead of inventing a resolution. Polish changes wording and hierarchy, not facts; Compare identifies both shared and missing information.

:::example[Name the transformation]

Avoid an instruction that silently changes the source's scope:

```md
Task: Polish the page and remove repeated or awkward points.
```

Prefer a task with a clear preservation boundary:

```md
Task: Convert the supplied guide into a Docs page.
Keep: every distinct fact, list item, example, link, and caveat.
Change: hierarchy and wording where needed for the reading path.
```

:::

===[Synthesise]

Merge and reorder several sources into one coherent flow while preserving every distinct point.

===

===[Convert]

Restructure one source without losing its information.

===

===[Critique]

Evaluate the content's strengths, gaps, and evidence, with little attention to styling.

===

===[Compare]

Match facts from two or more sources and show what is absent as well as what is present.

===

===[Polish]

Improve hierarchy, flow, wording, and presentation without changing the facts.

===

Return to the [Leaf guide](/consumer/1-usage/1-leaf/) to apply the task to a page.

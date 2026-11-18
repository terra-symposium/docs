---
name: scrape
description: Collect authorized Canvas source material for a local Terra Docs drafting or alignment task.
---

# Scrape

Use this skill when a Docs task needs Canvas pages, files, or transcripts as source material. The result is a local capture with a coverage record that an author or alignment run can inspect.

## Collect the source

Follow the Scraping repository's [Canvas collection skill](../../../../scraping/.agents/skills/canvas/SKILL.md) in the current checkout. It owns access rules, capture methods, provenance, and coverage validation. If that checkout is unavailable, use source material the user supplies or report the gap.

Keep the capture and `coverage.json` together outside this repository. The coverage record should identify each visible item and say whether it was saved, excluded, or inaccessible. Keep source text separate from any explanation written about it.

Capture the full readable page body and attachment contents, including explicit lists, questions, tasks, code, dates, and links. A title, filename, or module-item URL is not a substitute for the source body. Preserve source wording and provenance; [author](../../../docs/1-authoring/authoring.md) owns synthesis and reader-facing prose.

## Hand off the capture

Give the next stage the local paths and coverage record. State missing and excluded items so it does not claim complete coverage.

| Intended result                                              | Next skill                                       |
| ------------------------------------------------------------ | ------------------------------------------------ |
| A reader-facing Docs page                                    | [author](../../../docs/1-authoring/authoring.md) |
| A local comparison of generated content with production Docs | [align](../align/SKILL.md)                       |

:::note[Collection boundary] Collection alone does not authorise publishing a page, changing the saved Gem, or writing a Docs leaf. :::

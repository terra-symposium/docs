---
name: generation-content-authoring
description: Generate and review local Docs content from authorized source material.
metadata:
  related-files:
    - src/lib/markdown-model.ts
---

# Generate Docs content

Use this skill when drafting or revising Docs-owned Markdown from supplied or authorized sources. Follow [Docs authoring](../docs-authoring/SKILL.md) for page structure, supported blocks, links, and verification.

1. Confirm the source set, intended audience, destination page, and requested output.
2. Keep source text and generated prose separate. Track source names, dates, coverage, and uncertainties in working notes; never invent missing material.
3. Draft into this repository’s authored Markdown/MDX files. Review claims, code, links, assets, and block syntax against the sources and the Docs component reference. Compare each source item with the draft, record omissions and unsupported claims, and verify source-to-draft link parity: account for every relevant source link, justify any omitted link, and check that each cited target resolves correctly.
4. Run `pnpm run docs:build`, inspect the rendered route and interactive blocks, and compare rendered links with the approved draft for losses or altered targets. Review the diff. Use `pnpm run test` when the conversion pipeline changes.

This workflow writes local Docs files only. Do not invoke the Website generation specs or write to Sanity. Publication follows the Docs repository’s normal review and deployment workflow.

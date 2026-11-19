---
title: Docs styling
description: Spacing rules for rendered and editable Docs content.
order: 3
---

Docs uses a 16px gap between adjacent content blocks in view and edit modes, including blocks inside callouts. Block margins do not add to that gap. Lists, tables, and controls keep the spacing needed within their own structure.

## Headings

Headings have extra space **above** them to mark a new section. Their space below remains the standard 16px block gap.

| Heading    | Top space after another block |
| ---------- | ----------------------------: |
| `h2`       |                          48px |
| `h3`       |                          32px |
| `h4`, `h5` |                          24px |
| `h6`       |                          20px |

A heading that is the first block in its content container has no top margin. The same rules apply in rendered content, the editor, nested callout content, and print layout.

The shared rules live in `src/styles/prose.css`. Use the existing content containers when composing a page so spacing comes from one source; avoid adding margins to individual blocks.

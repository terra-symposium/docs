---
title: Styling in Docs
description: How the Styling package, Docs components, and prose styles form one workspace.
---

## Purpose and ownership

Docs uses `@terra-symposium/styling` for reusable controls and a hue-based visual system. The aim is a consistent interface across Terra sites while keeping document content readable and editable. Styling owns the shared component API, variants, fonts, global control styles, and palette helpers. Docs owns the document model, Markdown rendering, editor behavior, navigation, and prose rules specific to a reading surface.

| Concern                  | Source of truth                                                | Examples in Docs                                |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------------------- |
| Controls and interaction | Styling `src/components/ui/` and `@terra-symposium/styling/ui` | Buttons, tabs, accordions, dialogs, checkboxes  |
| Palette and fonts        | Styling hue helpers and `global.css`                           | Sidebar accent, control colors, type families   |
| Document structure       | Docs Markdown model and renderers                              | Headings, lists, tables, asides, code, diagrams |
| Reading rhythm           | Docs `src/styles/prose.css`                                    | Block gaps, headings, callouts, code, lists     |
| Workspace layout         | Docs site and workspace components                             | Navigation, toolbar, content column             |

The [Styling component catalog](https://github.com/Terra-Symposium/styling/tree/development/docs/styling/1-colouring) documents the upstream controls. Its [component pipeline guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/0-repository-guide/3-component-pipeline.md) explains how TypeScript metadata, authored guidance, demos, and routes become that catalog.

## From Styling to a Docs page

1. Styling builds its public UI entry point and `global.css`. The Docs package imports that compiled stylesheet in `src/styles/style.css` and imports shared controls from `@terra-symposium/styling/ui`.
2. Docs adds `docs-theme.css` and `prose.css`, then builds its public `style.css`. Hosts import `@terra-symposium/docs/style.css` once for the complete page. The source also builds an internal `workspace.css` for integrations that already load Styling's UI bundle; it is not a separate public package export.
3. The site reads Markdown or MDX from `docs/`, builds the navigation tree and search index, then renders each page through the shared workspace. The same prose rules cover View and Edit content; the host supplies routes, data, and permissions.
4. A visual change is checked in both a static page and the editable workspace, at narrow and wide widths. A component change is also checked against the Styling catalog and its public export.

:::example[Checklist rendering]

A Markdown task item such as `- [x] Confirm the title` is parsed by Docs. `MarkdownContent` renders its state with Styling's `Checkbox`, disabled for read-only content. Styling supplies the control; Docs decides that the source is a checklist and preserves the text during conversion.

:::

## Prose and hierarchy

The document should lead with the reader's purpose, then use H2 sections, short introductions, and blocks that show a real relationship. The [Authoring guide](/consumer/1-usage/0-authoring/) covers the writing decisions; the [Blocks reference](/consumer/1-usage/2-blocks/) gives supported source forms. Styling's component prose has a different job: its source JSDoc describes the public API, authored notes explain appropriate use and accessibility, and live examples show behavior. These sources should agree, but they are maintained in their owning repository.

Docs uses a 16px gap between adjacent content blocks in View and Edit. Callout content uses a 12px gap, with no bottom margin on its last block. Lists, tables, and controls keep the spacing needed within their own structure.

| Heading    | Top space after another block |
| ---------- | ----------------------------: |
| `h2`       |                          64px |
| `h3`       |                          16px |
| `h4`, `h5` |                          24px |
| `h6`       |                          20px |

The first heading in a content container has no top margin. Docs keeps these rules in `src/styles/prose.css`; do not add one-off margins to authored pages to compensate for a renderer problem.

## Change the right layer

| If the problem is...                                | Change and verify...                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| A shared control's variant, state, or accessibility | Styling component and its demo; run its build and `docs:check`.             |
| A Docs block's parsing or round trip                | Docs Markdown model and renderer; run unit tests and inspect View and Edit. |
| Spacing or typography inside an article             | Docs prose stylesheet; inspect Markdown, MDX, callouts, and narrow layouts. |
| Site navigation or page routes                      | Docs catalog and layout; build the site and open the affected route.        |

See [Develop Docs](/developer/repo/development/) for this repository's checks and [Quality and tests](/developer/repo/quality-and-tests/) for the exact commands.

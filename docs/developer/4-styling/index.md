---
title: Styling in Docs
description: Find which repository owns a Docs visual or interaction issue.
---

## Find the owner

When a Docs page looks wrong, trace the symptom to the layer that controls it before changing CSS or a component. The boundary can cross repositories: Docs interprets document meaning, Styling supplies shared controls and palette tools, and the host chooses the page data and hue.

| 🧭 Symptom                                                                   | 🛠️ Likely owner                                                                                                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎛️ A shared button, tab, accordion, or checkbox looks or behaves incorrectly | Styling component, variant, or usage note. Start at its [component reference](https://github.com/Terra-Symposium/styling/tree/development/docs/styling/1-colouring). |
| 🧩 A Markdown construct is parsed or converted incorrectly                   | Docs Markdown model and renderer. Compare source, View output, and Edit round trip.                                                                                  |
| 🎨 The page has the wrong accent colour                                      | Trace host hue → Docs theme mapping → Styling palette output. Change the first incorrect value in that chain.                                                        |
| 📝 Article headings, lists, or callouts have the wrong spacing               | Docs `src/styles/prose.css`. Compare the affected block in View and Edit.                                                                                            |
| 🧭 Sidebar, toolbar, or page layout is misplaced                             | Docs workspace or site layout. Inspect the affected route.                                                                                                           |

For shared controls, Styling owns the public component API and its supported variants. For authored documents, Docs owns the meaning and conversion of Markdown. A rendered element can involve both: fix the layer whose behavior is wrong.

:::example[Trace a checklist]

Docs parses `- [x] Confirm the title` as a checked task item. It keeps the task text and state during conversion, then renders Styling's shared `Checkbox` in read-only mode. If the source becomes the wrong block, inspect Docs parsing; if the checkbox control itself is wrong, inspect Styling.

:::

## Follow the page path

Styling builds the shared controls, fonts, and global styles. Docs imports those controls and styles, then adds its theme mapping, article rhythm, Markdown rendering, and workspace. The Docs site or an embedding host supplies the route, content, permissions, and optional hue. An embedding host imports the complete Docs stylesheet once:

```tsx
import '@terra-symposium/docs/style.css';
```

The [host integration guide](/developer/component/host-integration/) explains host-owned data and theme inputs. The [site pipeline](/developer/repo/site-pipeline/) traces a repository page through catalog, rendering, and static output.

## Verify the change

| Change                                | Required check                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎛️ Styling control or variant         | In the Styling repository, run `pnpm run build`, `pnpm run docs:check`, and relevant component tests. Inspect the catalog and detail route; exercise keyboard use, responsive layout, colour variants, dark mode, and copyable examples. Read the [component pipeline guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/0-repository-guide/3-component-pipeline.md). |
| 🧩 Docs parsing or conversion         | Run the relevant unit and browser checks. Compare Markdown source with View output and the Edit round trip.                                                                                                                                                                                                                                                                                        |
| 📝 Docs article styles or site layout | Run `pnpm run docs`, open the changed route, and inspect the actual page at wide and narrow widths.                                                                                                                                                                                                                                                                                                |

Use [Quality and tests](/developer/repo/quality-and-tests/) for the exact Docs commands and what each one proves. A successful build confirms compilation; it does not confirm the page looks or behaves correctly.

For heading hierarchy and block choice, use the [Authoring guide](/consumer/1-usage/0-authoring/) and [Blocks reference](/consumer/1-usage/2-blocks/). For component props and host contracts, use the [component reference](/developer/component/blocks/).

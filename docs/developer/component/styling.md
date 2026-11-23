---
title: Styling
description: Trace Docs fonts, colours, tokens, and controls to their source.
---

## Visual system

Docs appearance comes from three owners: Styling supplies fonts and shared controls, the host supplies a hue, and Docs maps that hue to page tokens. This page uses its own headings, prose, callouts, and tabs as examples; the same page is the preview.

### Type

The Docs workspace uses Inter for its chrome and reading surface. The article title uses Authentic Sans; the Docs wordmark in the sidebar uses Avara. Compare the title, this paragraph, and the sidebar wordmark above, then trace each role to its font utility and source.

| Visible role           | Family and utility           | Where Docs applies it                                                      |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Workspace and controls | Inter · `font-docs`          | `.workspace` in `src/components/terra/pages/docs/_main.tsx`                |
| Article title          | Authentic Sans · `font-sans` | View title in `_main.tsx`; article heading rules in `src/styles/prose.css` |
| Sidebar wordmark       | Avara · `font-serif`         | Brand link in `src/components/terra/pages/docs/_sidebar.tsx`               |

Styling registers the local font files in `styling/src/styles/global.css` and maps the families in `styling/src/lib/tailwind-preset.ts`. The web family names are `Authentic Sans`, `Avara`, and `Inter`. See the [Styling typography guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/1-colouring/4-typography.md) for their broader roles.

If a face looks wrong, inspect the element's class and computed `font-family`, then check the font request in the browser. The utility identifies the intended family; the computed style and loaded file show what the reader actually receives.

### Colour

The active host hue changes the primary and complementary scales; light and dark mode select the corresponding token values. The callouts and selected tab on this page show those tokens in context. This reference does not hard-code swatches: inspect a real page surface to see its active value.

| Layer        | Input                | Result                                             |
| ------------ | -------------------- | -------------------------------------------------- |
| 🧭 Host      | Hue number or `null` | Selects an accent palette or neutral palette       |
| 🎨 Styling   | `colors(hue)`        | Builds primary and base gray scales                |
| 🧩 Docs      | `docsHueTheme`       | Adds complementary secondary and gray scales       |
| 🌗 Theme CSS | Light or dark mode   | Selects the token values used by surfaces and text |

Docs creates the complementary scales in `src/lib/docs-theme.ts`:

```ts
const [primary, baseGray] = colors(hue);
const [secondary, gray] = hue === null ? [baseGray, baseGray] : colors(invert(hue));
```

`src/styles/docs-theme.css` maps these scales to `--primary-*`, `--secondary-*`, and `--gray-*`. In `src/styles/prose.css`, page surfaces use lower-numbered steps, borders use middle steps, and main text uses step `12`.

|||[Docs site]

`src/components/SiteLayout.astro` sets the site default hue to `145`. Change that input when the site needs another palette.

|||

|||[Embedded Docs]

Pass a hue number for a themed palette, or `null` for neutral scales. Load `@terra-symposium/docs/style.css` once in the host application.

|||

The [Styling hue guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/1-colouring/0-hue.mdx) explains the full scale. When a color is wrong, inspect the computed token on the affected element before changing the palette; a correct hue can still be applied to the wrong surface step.

### Controls

Styling owns shared control appearance and interaction. Docs parses Markdown, supplies content, and connects host actions. The tabs below are Docs Markdown rendered with Styling's shared tab controls:

|||[Reader]

Choose the option that matches the reader's route. The selected tab, panel boundary, and focus behavior come from the shared control.

|||

|||[Editor]

Docs supplies each panel's Markdown. Use adjacent `|||[Title]` directives in a `.md` leaf to create the tabs.

|||

The shared button variants are React controls, so Markdown does not create an interactive button by itself. Find live button examples and variants in the [Styling component catalog](https://github.com/Terra-Symposium/styling/tree/development/docs/styling/1-colouring). The [component pipeline guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/0-repository-guide/3-component-pipeline.md) traces a control from source through usage and generated API reference.

:::example[Shared component boundary]

Use the built-in Markdown blocks for content structure such as tabs, accordions, and callouts. Register a host custom block only when authored Markdown needs a React component with behavior or a data contract that those blocks cannot express.

:::

## Troubleshoot

Choose the source layer from the visible defect. A successful build confirms compilation; it does not confirm that the correct font loaded, a token reached the intended surface, or a shared control behaves as expected.

===[Font fallback]

Check the element class and computed `font-family`, then inspect the font request. The workspace should resolve to Inter, the article title to Authentic Sans, and the sidebar wordmark to Avara. Check the family registration in Styling's `src/styles/global.css` if the file did not load.

===

===[Wrong accent or surface]

Trace the host hue into `docsHueTheme`, then inspect the selected light/dark alias and the computed token on the affected element. Fix the first layer whose value is wrong.

===

===[Shared control looks wrong]

If the control's appearance or interaction is wrong, inspect its Styling component and variant. If Markdown produces the wrong control or state, inspect the parser in `src/components/MarkdownContent.tsx`.

===

===[Article rhythm or layout]

Inspect `src/styles/prose.css` for article heading, table, and callout rules. Check the affected route at wide and narrow widths to identify wrapping or spacing problems.

===

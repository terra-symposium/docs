---
title: Docs typography, colour, and components
description: Trace Docs fonts, hue-generated colours, and shared controls to their sources.
---

## Appearance pipeline

Docs appearance is assembled from three sources: Styling assets and UI, Docs theme and article rules, and the hue chosen by the site or embedding host. Follow each layer to the source that supplies it.

### Styling package

Styling registers font files and shared CSS in `styling/src/styles/global.css`, defines font and colour utilities in `styling/src/lib/tailwind-preset.ts`, and exports controls from `styling/src/components/ui/`. Its font files are packaged locally; Docs does not fetch them from a font service.

### Docs workspace

`src/styles/style.css` imports Styling's global CSS, then adds Docs theme and prose styles. `src/lib/docs-theme.ts` maps the host hue to CSS variables; `src/styles/docs-theme.css` selects light or dark values; `src/styles/prose.css` styles article content. An embedding host loads the complete stylesheet once:

```tsx
import '@terra-symposium/docs/style.css';
```

### Site or embedding host

The site sets its default hue to `145` in `src/components/SiteLayout.astro`. Workspace props accept a hue or `null` for a neutral palette. The site or host also supplies the route and content; Docs applies them within the shared workspace.

## Typography

Styling registers the font families in `styling/src/styles/global.css`. Their role tokens are mapped in `styling/src/lib/tailwind-preset.ts`.

| Family and token                               | Use in Docs                                       |
| ---------------------------------------------- | ------------------------------------------------- |
| 🎭 Avara Bold / Bold Italic · `font-serif`     | Docs brand in the sidebar and not-found heading.  |
| 🎛️ Authentic Sans 90 / 130 / 150 · `font-sans` | Article title and Docs page heading.              |
| 📖 Inter variable Roman / Italic · `font-docs` | Workspace, article prose, and interface controls. |

Docs applies `font-docs` to the workspace in `src/components/terra/pages/docs/_main.tsx`; article text and interface controls inherit Inter. The article `h1` uses `font-sans` in `src/styles/prose.css`, and the Docs page title uses it in `_main.tsx`, so those headings use Authentic Sans. The sidebar brand and not-found heading use `font-serif`. Check these classes and the computed font before changing a font file.

The [Styling typography guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/1-colouring/4-typography.md) describes the general brand roles. Follow the Docs-specific `font-docs` mapping when diagnosing the Docs reading surface.

## Colour

The host chooses a hue, Styling calculates colour scales, and Docs maps them to semantic tokens:

1. Choose the hue.
   - `src/components/SiteLayout.astro` defaults the site to `145`.
   - Workspace props accept a hue number or `null` for neutral scales.
2. Generate the colour scales.
   - Docs calls Styling's `colors(hue)` and `colors(invert(hue))`.
   - Those calls provide primary, complementary secondary, and gray scales.
   - With `null`, Docs uses the neutral scale for all three roles.
3. Select the light or dark values.
   - `src/styles/docs-theme.css` maps the generated values to semantic tokens.
   - Tokens range from `--primary-1` to `--primary-12`.
   - Docs also defines `--secondary-*` and `--gray-*` tokens.
4. Use the tokens by role.
   - Components and prose use these values for surfaces and text.
   - Steps 1, 5–7, 8–9, and 12 cover backgrounds, borders, actions, and text.

The Styling [hue guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/1-colouring/0-hue.mdx) defines the token roles.

This separates a wrong input from a wrong result. Check the host hue, then Docs' mapping, then Styling's palette output. If the values are correct but a surface uses the wrong token, change the component or prose rule that assigns it.

## Shared components

Docs imports shared controls from `@terra-symposium/styling/ui`; their implementation, props, and variants live in Styling. Docs owns the Markdown meaning and placement of each control.

| What appears in Docs                               | Ownership split                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 Tabs, accordions, and checklist controls        | Styling implements `Tabs`, `Accordion`, and `Checkbox`. Docs parses the source and provides the read-only task state in `src/components/MarkdownContent.tsx`. |
| 🎛️ Buttons and form controls                       | Styling supplies public controls. Docs places them in its toolbar and editor under `src/components/terra/pages/docs/`.                                        |
| 📝 Article headings, spacing, callouts, and tables | Styling supplies fonts, palette tokens, and utilities. Docs applies article rules in `src/styles/prose.css`.                                                  |

For live examples and supported variants, browse the [Styling component catalog](https://github.com/Terra-Symposium/styling/tree/development/docs/styling/1-colouring). The [component pipeline guide](https://github.com/Terra-Symposium/styling/blob/development/docs/styling/0-repository-guide/3-component-pipeline.md) identifies the component source, usage note, demo, and generated reference to keep together.

## Diagnose a mismatch

### Font fallback

Check `font-docs` on the workspace and the computed font on the article. If the family is correct but its glyphs fall back, inspect the font declarations in Styling's `global.css` and the local font requests in the browser.

### Wrong accent or surface colour

Inspect the host's hue, the values returned by `docsHueTheme`, the aliases in `docs-theme.css`, and the computed token at the affected element. Change the first layer whose output is wrong.

### Shared control looks or behaves incorrectly

Change the Styling component, variant, usage note, or demo. In the Styling repository, run `pnpm run build`, `pnpm run docs:check`, and relevant tests; inspect keyboard use, responsive layout, light and dark colours, and copyable examples. If the Markdown source becomes the wrong control or state, fix Docs parsing in `src/components/MarkdownContent.tsx` instead.

### Article rhythm or layout is wrong

Change Docs `src/styles/prose.css` for article typography, heading rhythm, tables, and callouts. Run `pnpm run docs` and inspect the affected route at wide and narrow widths. For exact Docs commands and their limits, see [Quality and tests](/developer/repo/quality-and-tests/).

A successful build confirms compilation. It does not confirm the computed font, resolved colour, or rendered interaction.

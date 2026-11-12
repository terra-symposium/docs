---
name: custom-components
description: Add reusable React/TSX examples to Docs Markdown pages while keeping the shared Docs layout, generated navigation, and existing Styling UI.
---

# Custom components in Docs

Use this skill when a Markdown or MDX page needs a live React component, demo, or generated API view.

## Keep the component beside its page

- Put the TSX file beside the Markdown or MDX page that uses it, inside the same section directory. Use a page-specific sibling such as `_components.tsx`; do not create a generic `components/` folder for page content.
- Import the TSX component from the MDX page and render it there. The shared Docs layout already owns the page shell, navigation, and table of contents.
- Do not add an Astro wrapper just to place a TSX component inside the Docs layout. If the shared Markdown route does not render MDX components, fix that route or its slot rendering in the Docs repo. Astro may define a route when the URL needs one, but it must not duplicate or wrap the Docs layout for page content.
- Let Docs generate the sidebar and page TOC from the Markdown tree and headings. Do not hand-build navigation or manually register page headings.
- Keep nested pages under their parent leaf path so the default Docs route matching keeps that leaf active and leaves sibling pages visible.

## Reuse the shared UI

- Before adding markup or styles, inspect `@terra-symposium/styling/ui` and reuse its components and variants. Prefer components such as `DataTable`, `Card`, `Button`, `ButtonLink`, and the existing form and display controls where they fit the content.
- Do not create a CSS file for a Docs component page. Use the shared components’ built-in presentation; add only small existing utility classes when layout needs them.
- Keep examples data-driven when a shared component accepts rows or columns. Render generated component APIs with shared tables rather than custom card grids or signature styling.

## Verify the page in Docs

- Check the real MDX route, component output, generated TOC, and sidebar state in the Docs layout.
- Confirm that loading a component page keeps its parent leaf active and its sibling leaves visible.
- Check the browser console for MDX, React, or hydration errors. If a component is absent, repair the shared MDX rendering path instead of adding an Astro wrapper.

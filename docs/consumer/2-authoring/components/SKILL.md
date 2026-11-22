---
name: custom-components
description: Build and register custom Docs components in a hosted workspace.
skill: true
metadata:
  related-files:
    - site/src/components/SiteMarkdownPage.astro
    - src/components/SiteLayout.astro
---

# Custom components in Docs

Use this skill when a Docs page needs a React component, demo, or generated API view. A `.md` leaf is rendered as Markdown; use `.mdx` when the page must import and render TSX. The [component reference](/developer/component/blocks/) covers blocks supplied by a hosted application.

## Add a component to an MDX leaf

1. Put a leaf-specific TSX file, such as `_components.tsx`, beside the `.mdx` leaf in its branch directory. Keep the example and its page together.
2. Import the component from the MDX leaf and render it where the explanation needs it. Keep the page title and description in frontmatter and use ordinary headings for the page TOC.
3. Use the existing `SiteMarkdownPage.astro` route and `DocsSiteLayout` shell. Fix their MDX slot rendering if the component is missing; do not wrap the leaf in a second Docs layout.
4. Open the leaf's direct route. Check its component, sidebar selection, sibling leaves, and generated TOC.

Keep nested pages under their parent leaf path so the parent stays active in navigation. Use a sibling TSX file for page-only components so its owner is clear.

## Reuse the shared UI

- Before adding markup or styles, inspect `@terra-symposium/styling/ui` and reuse its components and variants. Prefer components such as `DataTable`, `Card`, `Button`, `ButtonLink`, and the existing form and display controls where they fit the content.
- Use the shared components' presentation and small existing utility classes for layout. Keep page-specific CSS out of the Docs component page.
- Keep examples data-driven when a shared component accepts rows or columns. Render generated component APIs with shared tables rather than custom card grids or signature styling.

## Verify the page in Docs

- Build the Docs site, then check the real MDX route, component output, generated TOC, and sidebar state in the Docs layout.
- Confirm that loading a component page keeps its parent leaf active and its sibling leaves visible.
- Check the browser console for MDX, React, or hydration errors. If a component is absent, trace the shared MDX rendering path before changing the page shell.

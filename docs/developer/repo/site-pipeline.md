---
title: Site pipeline
description: Trace a Markdown file through the Docs CLI, catalog, renderer, and static output.
---

## Follow a page

The generated site is a static publication of authored files. The browser can display it without a storage service; editing and publishing in a browser require the separate [host integration](/developer/component/host-integration/).

| Stage   | Input                                                                 | Output and owner                                                               |
| ------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Author  | `docs/index.md` and `.md` or `.mdx` leaves in tree and branch folders | Frontmatter, H2 body, relative assets; repository owner                        |
| Prepare | `bin/docs.mjs build` or `dev`                                         | Search index and copied assets under `_docs/`; Docs CLI                        |
| Catalog | `site/src/lib/catalog.ts`                                             | Ordered routes, navigation tree, labels, visibility, and image URLs; Docs site |
| Render  | Astro routes and `SiteMarkdownPage.astro`                             | Shared Docs layout with Markdown or MDX body; Docs site                        |
| Publish | `docs build`                                                          | Static files in `docs.out`; repository's web host deploys them                 |

## Prepare content

The CLI scans Markdown and MDX files under `docs/`. Only `index.md` or `index.mdx` may sit directly at that root; other pages belong in folders. It rejects duplicate routes and a user-authored `404` route. A page hidden by frontmatter remains routable but is omitted from navigation and search. Assets beside pages are copied to `_docs/assets/`; the catalog rewrites relative image paths to those copies.

The catalog sorts source paths numerically, so filename prefixes control navigation order and remain in URLs. [Tree handling](/consumer/1-usage/2-tree-handling/) documents renames, labels, and visibility.

## Render the workspace

Astro makes the static routes. Markdown pages pass their source to the shared Docs renderer; MDX pages render compiled content inside the same `DocsSiteLayout`. The layout supplies the sidebar, title, toolbar, breadcrumb when there is a parent page, and the content area. Built-in blocks such as tabs, asides, diagrams, and code are documented in [Syntax](/consumer/1-usage/0-syntax/).

Docs imports Styling controls and theme tokens, then adds prose rules for reading and editing. [Styling in Docs](/developer/4-styling/) explains that ownership boundary. A blank but successful HTTP response is not enough to validate a page: inspect the body, links, images, and interactive blocks in a browser.

## Check the output

1. Run `pnpm run docs:sanitize` to catch supported legacy Markdown forms in this repository.
2. Run `pnpm run docs` to build the library and static site. The build output lists generated routes.
3. Open changed routes in the local preview or built site. Check the visible page, sidebar, search, relative assets, and a narrow viewport.
4. Deploy the configured output folder and repeat the route and asset checks at the public base path.

For the exact commands and CI coverage, see [Quality and tests](/developer/repo/quality-and-tests/). Consumer sites use their own `docs` and `build` scripts as described in [Run a site](/consumer/0-configuration/1-site-operations/).

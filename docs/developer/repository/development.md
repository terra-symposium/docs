---
title: Development
description: Preview Docs and trace authored Markdown to a published site.
---

## Follow a page

The Docs package builds and serves a site from a repository's Markdown. The package is reusable code; each generated site has its own pages, settings, and output folder.

<Nodes
  direction="LR"
  nodes={[
    { id: 'source', type: 'data', data: { title: 'Markdown source' } },
    { id: 'cli', type: 'process', data: { title: 'Docs CLI' } },
    { id: 'catalog', type: 'process', data: { title: 'Site catalog' } },
    { id: 'site', type: 'terminator', data: { title: 'Static site' } },
  ]}
  edges={[
    { id: 'source-cli', source: 'source', target: 'cli' },
    { id: 'cli-catalog', source: 'cli', target: 'catalog' },
    { id: 'catalog-site', source: 'catalog', target: 'site' },
  ]}
/>

The CLI prepares search data and assets. The catalog turns source paths and frontmatter into routes; Astro renders the pages and shared Docs shell.

:::note[Package and site are different outputs]

The npm package supplies the CLI and site renderer. A site build uses that package to produce static files from the consumer's own content. Updating the package does not replace those pages or settings. [Release](/developer/repository/release-and-upgrades/#package-and-starter-template) explains the starter template boundary.

:::

## Preview the source

Choose the command for the repository you are working in:

|||[Docs checkout]

Run `pnpm dev` from this repository. It builds the local package, then serves this checkout's `docs/` tree. Save downloads edited Markdown; replace the source file to keep the edit.

|||

|||[Consumer site]

Run `pnpm run docs` to start the installed CLI against the consumer's `docs/`. Run `pnpm run build` to create `dist/docs/`; `docs preview` serves that existing build.

|||

The [README](../../../README.md) records the required Node and pnpm versions. For test, check, and CI command selection, use [Testing](/developer/repository/testing/).

## Render a leaf

Use Markdown for Docs blocks. Use MDX only when the page needs Astro-compiled components.

|||[Markdown]

`.md` files pass through the Docs Markdown renderer. It parses titled callouts, tabs, accordions, diagrams, and the other built-in blocks.

|||

|||[MDX]

`.mdx` files render Astro-compiled content inside the same Docs site layout. Docs callout, tab, and accordion delimiters are not parsed there.

|||

Both formats use the shared Docs shell. See [Blocks](/consumer/1-usage/2-blocks/) for source forms and the [API reference](/developer/component/blocks/) for component contracts.

## Find the source

| Concern                | Source to inspect                                        |
| ---------------------- | -------------------------------------------------------- |
| Public package exports | `src/lib/index.ts` and `package.json`                    |
| Astro entry points     | `src/lib/astro.ts` and `src/components/SiteLayout.astro` |
| CLI commands           | `bin/docs.mjs` and `bin/init.mjs`                        |
| Route catalog          | `site/src/lib/catalog.ts`                                |
| Markdown page route    | `site/src/pages/[...slug].astro`                         |
| Generated styles       | `scripts/build-styles.mjs` and `src/styles/`             |

`pnpm run build` generates block guidance, compiles the library, and builds its stylesheet. The npm allowlist and starter-copy behavior are described in [Release](/developer/repository/release-and-upgrades/).

## Check the result

1. Run `pnpm run docs:sanitize` on authored Markdown.
2. Run `pnpm run docs` to build the package and site.
3. Open each changed route.
   - Check its content, navigation, search, and asset links.
   - Check the layout at a narrow viewport.
4. Deploy the configured output folder.
   - Recheck public routes and asset URLs.

The consumer's site pipeline uses its own manifest, settings, and output folder. The package provides the tools that run that pipeline.

# Terra Docs

Terra Docs is the shared Terra documentation workspace and Markdown site generator. A repository can use the npm package for an entire Docs site or embed its React editor and viewer in another application.

## Create a repository Docs site

Create a repository from the [Terra Docs starter](https://github.com/Terra-Symposium/docs-template) or install the package in an existing repository:

```sh
pnpm add -D @terra-symposium/docs
```

Add Markdown files under `docs/`, then run:

```sh
pnpm exec terra-docs dev
pnpm exec terra-docs build
```

The package creates the routes, navigation, Terra workspace, search index, and 404 page. `docs/index.md` is the home page; nested directories group navigation. `.mdx` files can import interactive examples. Optional `title`, `description`, `hue`, and `sidebar` frontmatter are available when needed. Build output defaults to `docs-dist/`.

Configure a deployment base path with `--base /project-docs/`, and optionally set `--site`, `--title`, and `--description`. Each repository builds its own site; the starter CI checks builds and leaves deployment to the repository owner.

## Create an instance

Start with the [instance installation guide](docs/getting-started.md). The React component can be installed into any React 19 app:

```sh
pnpm add @terra-symposium/docs
```

```tsx
import { Docs } from '@terra-symposium/docs';
import type { DocsValue } from '@terra-symposium/docs';
import '@terra-symposium/docs/style.css';
```

To work on the package itself, clone this repository and run its component playground and Docs site. Markdown hosts can use `renderMarkdown`, `markdownToDocsValue`, and `docsValueToMarkdown`; remote hosts implement the [storage provider](docs/storage.md).

## Run the playground and docs site

Requirements: Node.js 24.12+, pnpm 10.30.3. Run `pnpm install --frozen-lockfile`, then use:

```sh
pnpm dev        # Vite component playground
pnpm docs:dev   # Package-owned Astro site reading this repository's docs/ folder
```

The launcher delegates port acquisition to Terra Quality, then starts the dev server with strict port handling. Host apps use this shared launcher; set DOCS_DEV_PORT to override their preferred port.

Build commands: `pnpm run check`, `pnpm run build`, `pnpm run build:demo`, and `pnpm run docs:build`.

The reusable block registry includes accordions, tabs, tables, callouts, code, images, embeds, math, diagrams, raw Markdown, and TypeScript documentation. All are available by default; hosts can disable individual members with the `blocks` prop. Local repository pages stay read-only in the browser.

## Embed a Docs workspace

The shared workspace accepts sections containing groups and leaves. Each leaf owns its attachment links; files are never navigation entries. The host provides URLs, storage, access decisions, and mutations.

```tsx
import { DocsSiteLayout } from '@terra-symposium/docs';
import type { DocsSection } from '@terra-symposium/docs';

const sections: DocsSection[] = [
  {
    title: 'Guides',
    groups: [
      {
        title: 'Getting started',
        leaves: [
          {
            title: 'Install',
            href: '/install/',
            attachments: [{ title: 'Example PDF', href: '/files/install/example.pdf' }],
          },
        ],
      },
    ],
  },
];

<DocsSiteLayout
  title="My Docs"
  nodes={[]}
  sections={sections}
  currentPath="/install/"
  attachments={sections[0].groups[0].leaves[0].attachments}
>
  <article>Document content</article>
</DocsSiteLayout>;
```

`DocsSiteLayout` delegates to the canonical shared workspace and is intended for static React pages. Repository-backed hosts should use `DocsLocalWorkspace`, which loads each leaf and its adjacent attachments from the host-provided tree and remains read-only. Remote hosts should use `TerraDocsWorkspace` with a `DocsHostAdapter`; that adapter supplies the original tree controls and performs create, rename, duplicate, reorder, attachment, export, and delete operations after applying the host's own permission checks.

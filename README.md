# Docs

Docs is the shared Terra documentation workspace and Markdown site generator. A repository can use the npm package for an entire Docs site or embed its React editor and viewer in another application.

## What it does

Not applicable.

## Prerequisites

Not applicable.

## Get started

### Run the playground and docs site

Requirements: Node.js 24.12+, pnpm 10.30.3. Run `pnpm install --frozen-lockfile`, then use:

```sh
pnpm run dev    # Vite component playground
pnpm run docs   # Package-owned Astro Docs site reading this repository's docs/ folder
```

The launcher delegates port acquisition to Terra Quality, then starts the dev server with strict port handling. Host apps use this shared launcher; set DOCS_DEV_PORT to override their preferred port.

Build with `pnpm run build`; run package checks with `pnpm run check`. Build the demo directly with `pnpm exec vite build`.

The reusable block registry includes accordions, tabs, tables, callouts, code, images, embeds, math, diagrams, raw Markdown, and TypeScript documentation. All are available by default; hosts can disable individual members with the `blocks` prop. Local repository pages stay read-only in the browser.

Hosts can enable the ephemeral leaf quiz flow with `quiz={{ toolbar: true, generate }}` on `DocsLocalWorkspace`, `DocsStaticWorkspace`, or `DocsWorkspace`. The `generate` callback receives the current leaf title and Markdown plus the requested question count and types, and must return `{ title, questions }`. Multiple-choice questions use `{ type: 'multipleChoice', prompt, opts, answer, explanation?, section? }`; keyword questions use `{ type: 'keyword', prompt, answers, keywords?, explanation?, section? }`. Hosts should implement that callback through a server endpoint and keep `OPENAI_API_KEY` in server-side secret storage. The shared Docs package never accepts or stores API keys.

Individual leaves can expose the same flow with the `<Quiz />` Markdown component. The repository-level toolbar option is off by default.

## Usage

### Create a repository Docs site

Copy the [Docs starter files](https://github.com/Terra-Symposium/docs/tree/development/template) into a repository, or install the package in an existing repository:

```sh
pnpm add -D @terra-symposium/docs
```

Add Markdown files under `docs/`, then run:

```sh
pnpm run docs
pnpm run build
```

The package creates the routes, navigation, Terra workspace, search index, and 404 page. `docs/index.md` is the home page; nested directories group navigation. `.mdx` files can import interactive examples. Optional `title`, `description`, `hue`, and `sidebar` frontmatter are available when needed. Build output defaults to `dist/docs/`.

Move the full agent tree into `docs/agents/`. `SKILL.md` files there route as the index page for their folder, so the complete tree uses normal Docs navigation, search, and asset handling. The Agents section is included by default. Set `docs.includeAgents` to `false` in the repository's `package.json`, or pass `--agents false`, to hide it for one Docs instance.

Set each site's `title` and `description` explicitly in its `docs` configuration in `package.json` (or pass `--title` and `--description`). The launcher does not infer site metadata from the npm package name or description. Configure `docs.base`, `docs.site`, and `docs.out` alongside those values. Each repository builds its own site; the starter CI checks builds and leaves deployment to the repository owner.

### Create an instance

Start with the [instance installation guide](docs/development/getting-started/). The React component can be installed into any React 19 app:

```sh
pnpm add @terra-symposium/docs
```

```tsx
import { Docs } from '@terra-symposium/docs';
import type { DocsValue } from '@terra-symposium/docs';
import '@terra-symposium/docs/style.css';
```

To work on the package itself, clone this repository and run its component playground and Docs site. Markdown hosts can use `renderMarkdown`, `markdownToDocsValue`, and `docsValueToMarkdown`; remote hosts implement the [storage provider](docs/development/storage/).

## Configuration and security

Not applicable.

## Development and structure

### Embed a Docs workspace

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

`DocsSiteLayout` delegates to the canonical shared workspace and is intended for static React pages. Repository-backed hosts should use `DocsLocalWorkspace`, which loads each leaf and its adjacent attachments from the host-provided tree and remains read-only. Remote hosts should use `DocsWorkspace` with a `DocsHostAdapter`; that adapter supplies the original tree controls and performs create, rename, duplicate, reorder, attachment, export, and delete operations after applying the host's own permission checks.

## Validation

Not applicable.

## Deployment and operations

Not applicable.

## Data, privacy, and limitations

Not applicable.

## References

Not applicable.

## Contributing

Not applicable.

## Credits and license

Not applicable.

# Terra Docs

Terra Docs is a reusable React document editor and viewer, Markdown site generator, and documentation workspace. Repositories can use the package for a complete Docs site or embed its React components in another application. This repository includes a Vite consumer demo, Astro integration, interface documentation, and unit and browser coverage.

## Getting started

Requires Node.js 24.12+ and pnpm 10.30.3. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run dev
pnpm run docs
```

`pnpm run dev` starts the Vite component playground. `pnpm run docs` starts the package-owned Astro Docs site using this repository's `docs/` folder. The shared launcher delegates port acquisition to Terra Quality, then starts the dev server with strict port handling. Host apps use this launcher; set `DOCS_DEV_PORT` to override their preferred port.

Build the library with `pnpm run build`, run package checks with `pnpm run check`, and build the demo directly with `pnpm exec vite build`.

### Commands

Run `pnpm test`, `pnpm test:browser`, and `pnpm test:consumer` as applicable. The repository checks its library, consumer demo, Astro integration, and documentation site.

## Security and Limitations

The package renders user-authored document content and includes HTML sanitization. Integrators must preserve sanitization and workspace boundaries; rendering does not authorize access to private content.

The package never accepts or stores API keys. Hosts that enable quiz generation should implement the `generate` callback through a server endpoint and keep `OPENAI_API_KEY` in server-side secret storage. The quiz toolbar is off by default.

## Structure

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

The package creates routes, navigation, the Terra workspace, search index, and 404 page. `docs/index.md` is the home page; nested directories group navigation. MDX files can import interactive examples. Optional frontmatter supports `title`, `description`, `hue`, and `sidebar` fields (`label`, `order`, and `hidden`). Build output defaults to `dist/docs/`.

The Docs content root is also the default package root for resolving the consumer's dependencies. If a repository keeps its package manifest and `node_modules` in a nested directory, set `DOCS_PACKAGE_ROOT` to that directory relative to the Docs content root (for example, `DOCS_PACKAGE_ROOT=config pnpm --dir config run build`). `DOCS_ROOT` continues to select the directory containing `docs/` and the build output.

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

Markdown hosts can use `renderMarkdown`, `markdownToDocsValue`, and `docsValueToMarkdown`; remote hosts implement the [storage provider](docs/development/storage/).

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

`DocsSiteLayout` delegates to the canonical shared workspace and is intended for static React pages. Repository-backed hosts should use `DocsLocalWorkspace`, which loads each leaf and its adjacent attachments from the host-provided tree and remains read-only. Remote hosts should use `DocsWorkspace` with a `DocsHostAdapter`; the adapter supplies the original tree controls and performs create, rename, duplicate, reorder, attachment, export, and delete operations after applying the host's own permission checks.

The reusable block registry includes accordions, tabs, tables, callouts, code, images, embeds, math, diagrams, raw Markdown, and TypeScript documentation. All are available by default; hosts can disable individual members with the `blocks` prop. Local repository pages stay read-only in the browser.

Hosts can enable the ephemeral leaf quiz flow with `quiz={{ toolbar: true, generate }}` on `DocsLocalWorkspace`, `DocsStaticWorkspace`, or `DocsWorkspace`. The `generate` callback receives the current leaf title and Markdown plus the requested question count and types, and must return `{ title, questions }`. Multiple-choice questions use `{ type: 'multipleChoice', prompt, opts, answer, explanation?, section? }`; keyword questions use `{ type: 'keyword', prompt, answers, keywords?, explanation?, section? }`. Individual leaves can expose the same flow with the `<Quiz />` Markdown component.

## References

- [Interface guide](docs/interface.md)
- [Storage provider guide](docs/development/storage/)
- [Test migration notes](TEST_MIGRATION.md)
- [Package exports](package.json)
- [Apache-2.0 license](LICENSE)

## Contributing

Document interface changes and keep consumer examples aligned with package exports. To work on the package itself, clone this repository and run the component playground and Docs site.

## Credits and license

The package declares [Apache-2.0](LICENSE). Review third-party dependency and asset terms separately.

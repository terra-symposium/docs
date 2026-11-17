---
title: Develop Terra Docs
description: Work on the package and documentation site.
---

Use Node.js from `.nvmrc` and pnpm 10.30.3:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run docs:dev
```

The command starts the Astro documentation site, which renders these same `docs/` files. Build the package and site with `pnpm run build` and `pnpm run docs:build`.

## Update the guide's workspace

The guide reads its pages from this repository's `docs/` directory and renders them with the published `@terra-symposium/docs` workspace. The package is installed under the `@terra-symposium/docs-site` alias so imports do not resolve to this checkout's older library source.

Each Markdown file becomes a route. The section selector and page tree follow the directory structure, so adding or moving a page does not require editing a navigation list. The local dev and preview servers send `Cache-Control: no-store` for live content.

After a package release, update the installed workspace with `pnpm update @terra-symposium/docs-site`. The running Astro guide reloads when the lockfile changes; edits to local pages also appear during development. The lockfile records the package version used for a reproducible build.

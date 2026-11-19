---
title: Develop Docs
description: Work on the package and documentation site.
---

Use Node.js from `config/.nvmrc` and pnpm 10.30.3:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` builds the package, then serves this repository's Docs site from `docs/`. The site is read-only. Markdown and search data refresh as files change, and edits to Docs UI source such as the toolbar hot-reload in the same host.

Run `pnpm run check` for package checks, `pnpm run build` for the library, and `pnpm run docs` to build the Docs site.

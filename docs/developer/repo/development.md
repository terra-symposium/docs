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

`pnpm dev` builds the package, then serves this repository's Docs site from `docs/`. Save downloads an edited Markdown file; replace the repository file to keep the change. Markdown and search data refresh as files change. Edits to Docs UI source rebuild the package and reload the page in the same host.

Run `pnpm run check` for package checks, `pnpm run build` for the library, and `pnpm run docs` to build the Docs site.

## Next tasks

- [Quality and tests](/developer/repo/quality-and-tests/) lists the exact commands and CI coverage.
- [Playwright tests](/developer/repo/playwright-tests/) walks through browser coverage and the current selection limits.
- [Site pipeline](/developer/repo/site-pipeline/) traces authored files through search, navigation, rendering, and static output.
- [Migrate content](/developer/repo/content-migration/) covers legacy Markdown and the sanitizer in this source checkout.
- [Release and upgrade](/developer/repo/release-and-upgrades/) covers publication and verification in consumers.

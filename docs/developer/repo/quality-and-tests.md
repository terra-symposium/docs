---
title: Quality and tests
description: Run the Docs package checks and understand what each result proves.
---

## Choose a check

Run commands from this repository's root after `pnpm install --frozen-lockfile`. Install `uv` for Quality's Python checks; the Quality scripts load the pinned tools from `config/python-quality-requirements.txt` automatically. CI uses Python 3.12. [Develop Docs](/developer/repo/development/) covers the local preview.

| Command                  | What it checks                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run docs:sanitize` | Authored Markdown migration and syntax findings; exits nonzero on findings.                                                                         |
| `pnpm run check`         | Prettier, ESLint, and TypeScript.                                                                                                                   |
| `pnpm run build`         | Published library output and styles.                                                                                                                |
| `pnpm run docs`          | Library and static documentation site build.                                                                                                        |
| `pnpm run test:unit`     | Package unit tests after a library build.                                                                                                           |
| `pnpm run test:browser`  | Astro and published-site browser suites after builds; see [Playwright tests](/developer/repo/playwright-tests/) for the selected and omitted specs. |
| `pnpm run test`          | Unit and browser suites.                                                                                                                            |
| `pnpm run quality:all`   | Full repository Quality gate; findings exit nonzero.                                                                                                |
| `pnpm run quality:check` | Alias for the same full Quality gate.                                                                                                               |

:::note[Separate gates]

Quality, build, and functional tests run separately so each result is visible. `quality:fix` can edit files; inspect its diff, then rerun `quality:all` and the affected tests.

:::

## Follow the change

- For a Markdown edit, run `docs:sanitize` and `docs`, then inspect the changed page in the browser.
- For library code, run `check`, `build`, and the relevant unit or browser suite. Run both suites when the change crosses the package and site boundary.
- For a public API change, verify the exported types and update its [component reference](/developer/component/blocks/) and [host integration guide](/developer/component/host-integration/).

CI runs the sanitizer, build, full Quality gate, static Docs build, and the suites listed in `config/tests.json` for pull requests. A green static build does not prove that a page rendered meaningfully: open the route and inspect its content, interactions, and layout.

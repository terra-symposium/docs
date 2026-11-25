# Docs

Docs lets teams write, read, and share rich documents in their applications.

## Get started

Requires Node.js 24.12+ and pnpm 10.30.3. From the repository root:

```sh
pnpm install
pnpm run docs:dev
```

The Docs site serves this repository's [`docs/`](docs/index.md) pages. Build the library with `pnpm build`; see the [component reference](docs/0-installation/component.md) for integration details.

## Generate a site for another repository

Install `@terra-symposium/docs` in a repository with Markdown pages under `docs/`, then run `pnpm exec docs build`. The command generates the shared Docs workspace, navigation, search index, and not-found page under `dist/docs/`. Use `pnpm exec docs dev` while authoring. Set `docs.title`, `docs.description`, `docs.base`, `docs.site`, `docs.out`, and `docs.includeAgents` in the host `package.json`, or pass the corresponding `--title`, `--description`, `--base`, `--site`, `--out`, and `--agents` options to the CLI.

From the repository root, run `pnpm quality:all`, `pnpm test`, `pnpm test:browser`, and `pnpm test:consumer` as applicable.

## Configuration

The package renders user-authored document content and includes HTML sanitization. Integrators should preserve sanitization and workspace boundaries; do not treat rendering as authorization for private content.

## Validation

| Command                  | Checks                        |
| ------------------------ | ----------------------------- |
| `pnpm run quality`       | Changed and untracked files   |
| `pnpm run quality:all`   | Full configured Quality scope |
| `pnpm run test`          | Project test suite            |
| `pnpm run test:browser`  | Browser tests                 |
| `pnpm run test:consumer` | Consumer integration tests    |
| `pnpm run build`         | Build output                  |

Quality can apply safe fixes; review the diff before committing.

## Contributing

`src/` contains exported library components and styles; `docs/` is both the site content and repository documentation, `tests/` contains Node and browser tests, and `template/` provides a consumer starter.

Document interface changes and keep consumer examples aligned with the package exports.

Open a pull request against `development` and review the results of [`check.yml`](.github/workflows/check.yml) before merging. Keep unrelated changes out of the pull request.

## Documentation

- [Agent skills](.agents/README.md), including the Docs authoring workflow
- [Documentation site source](docs/index.md)
- [Component reference](docs/0-installation/component.md)
- [Package exports](package.json)
- [Apache-2.0 license](LICENSE)

## License

The package declares [Apache-2.0](LICENSE). Review third-party dependency and asset terms separately.

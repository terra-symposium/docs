# Terra Docs

Terra Docs lets teams write, read, and share rich documents in their applications.

## Get started

Requires Node.js 24.12+ and pnpm 10.30.3. From the repository root:

```sh
pnpm install
pnpm dev
```

Vite opens the demo at `127.0.0.1`. Build the library with `pnpm build`; see the
[interface guide](docs/interface.mdx) for integration details.

From the repository root, run `pnpm quality:all`, `pnpm test`, `pnpm test:browser`, and
`pnpm test:consumer` as applicable.

## Configuration

The package renders user-authored document content and includes HTML sanitization. Integrators
should preserve sanitization and workspace boundaries; do not treat rendering as authorization for
private content.

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

`src/` contains exported library components and styles; `docs/` documents the interface, `tests/`
contains Node and browser tests, and `template/` provides a consumer starter.

Document interface changes and keep consumer examples aligned with the package exports.

Open a pull request against `development` and review the results of
[`check.yml`](.github/workflows/check.yml) before merging. Keep unrelated changes out of the pull
request.

## Documentation

- [Interface guide](docs/interface.mdx)
- [Package exports](package.json)
- [Apache-2.0 license](LICENSE)

## License

The package declares [Apache-2.0](LICENSE). Review third-party dependency and asset terms
separately.

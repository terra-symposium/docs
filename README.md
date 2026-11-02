# Terra Docs

A reusable React document editor and viewer with Markdown, Portable Text, diagram, PDF, and local-workspace components. The repository includes a Vite consumer demo, Astro integration, interface documentation, and unit and browser coverage.

## Getting started

Requires Node.js 24.12+ and pnpm 10.30.3. From the repository root:

```sh
pnpm install
pnpm dev
```

Vite opens the demo at `127.0.0.1`. Build the library with `pnpm build`; see the [interface guide](docs/interface.md) for integration details.

### Commands

From the repository root, run `pnpm check`, `pnpm test`, `pnpm test:browser`, and `pnpm test:consumer` as applicable.

## Security and Limitations

The package renders user-authored document content and includes HTML sanitization. Integrators should preserve sanitization and workspace boundaries; do not treat rendering as authorization for private content.

## Structure

`src/` contains exported library components and styles; `demo/` is the Vite consumer. `docs/` documents the interface, `test/` contains Node tests, and `template/` provides a consumer starter.

## References

- [Interface guide](docs/interface.md)
- [Test migration notes](TEST_MIGRATION.md)
- [Package exports](package.json)
- [Apache-2.0 license](LICENSE)

## Contributing

Document interface changes and keep consumer examples aligned with the package exports.

## Credits and license

The package declares [Apache-2.0](LICENSE). Review third-party dependency and asset terms separately.

# Docs starter

A repository template for a static documentation site powered by the Terra Docs package.

## Getting started

Create a repository with GitHub's **Use this template** button, then install its dependencies and start the site:

```sh
pnpm install
pnpm run docs
```

Write documentation in `docs/`. Add `index.md` for the home page and nested `.md` or `.mdx` files for guides. Folder names and filenames create URLs and navigation automatically. MDX pages can import interactive examples from the project source.

### Commands

Build the static site into `dist/docs/` with `pnpm run build`. The template CI checks that build; configure a host and deployment workflow when the repository is ready to publish.

## Security and Limitations

Optional Markdown frontmatter supports `title`, `description`, `hue`, and `sidebar` fields (`label`, `order`, and `hidden`). The generated not-found page always uses the shared Docs interface; a host-specific `docs/404.md` override is not supported.

## Structure

The `docs/` directory holds Markdown and MDX pages. The Docs package generates routes, navigation, search, the workspace, and the 404 page.

## References

See the parent [Terra Docs README](../README.md) and the package's [Apache-2.0 license](../LICENSE) for integration and licensing details.

## Contributing

Keep starter configuration aligned with the Docs package commands and supported frontmatter.

## Credits and license

This template is part of the Terra Docs workspace and uses its [Apache-2.0 license](../LICENSE). Check third-party terms for imported examples and assets.

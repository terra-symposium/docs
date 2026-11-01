# Docs starter

Create a repository with GitHub's **Use this template** button, then install its dependencies:

```sh
pnpm install
pnpm docs:dev
```

Write documentation in `docs/`. Add `index.md` for the home page and any nested `.md` or `.mdx` files for guides. Folder names and filenames create URLs and navigation automatically. MDX pages can import interactive examples from the project source.

Build the static site into `dist/docs/` with `pnpm docs:build`. The template CI checks that build; configure a host and deployment workflow when the repository is ready to publish.

Optional Markdown frontmatter supports `title`, `description`, `hue`, and `sidebar` fields (`label`, `order`, and `hidden`). A `docs/404.md` file customizes the generated not-found page.

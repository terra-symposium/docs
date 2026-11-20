# Docs site

This site turns Markdown files in `docs/` into a static documentation website. No application code is required.

## Write and preview

Run `pnpm run docs` and open the local address it prints. Then:

- Replace `docs/index.md` with your home page.
- Add pages in folders under `docs/`; filenames become URLs.
- Set the title and description in `package.json` under `docs`.

## Publish

Run `pnpm run build` and publish `dist/docs/` with a static web host. The included GitHub Actions workflow checks that the site builds; it does not deploy it.

The starter's error reporting URL points to a local placeholder. Set `docs.errorReporting.endpoint` to your own receiver if you want error reports.

For syntax and authoring guidance, see the [Terra Docs documentation](https://github.com/Terra-Symposium/docs). Browser editing and access controls require a separate host integration.

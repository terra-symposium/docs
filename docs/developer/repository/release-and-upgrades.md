---
title: Release
description: Publish a Docs package version and verify consuming sites after an upgrade.
---

## Package and starter template

The **package** is the versioned npm dependency, `@terra-symposium/docs`. It supplies the CLI, runtime components, site renderer, and files selected by `package.json` `files`.

The **starter template** is a set of files copied into a new consumer project by `docs init`. `bin/init.mjs` copies selected files from `template/`, including `package.json` and `docs/index.md`. The consumer then owns that copy. A later package upgrade updates the installed CLI and runtime; it does not overwrite the consumer's copied configuration or Markdown.

| Change                                  | Update                     |
| --------------------------------------- | -------------------------- |
| Runtime, CLI, or renderer behavior      | Package source and version |
| Files copied by future `docs init` runs | `template/` source         |
| Existing consumer's settings or pages   | That consumer's repository |

Template files are included in the npm package only when listed in `package.json` `files`. Check both the copy list in `bin/init.mjs` and the package allowlist when changing the starter.

## Prepare a release

The package version lives in `package.json`. Changesets are configured in `.changeset/config.json` with `development` as their base branch. The `.github/workflows/publish.yml` release workflow runs on `main`: it skips a version already on npm, otherwise installs dependencies, builds, and publishes the current package version. Pull request CI runs the full Quality gate before merge.

1. Record the user-visible change in a changeset.
   - Update the affected consumer or developer guide.
2. Choose relevant commands from [Testing](/developer/repository/testing/).
   - Read Quality findings even when its command succeeds.
3. Review the version and packed files before merging.
   - Only paths in `package.json` `files` ship to npm.
   - Developer guides and sanitizer scripts stay in this repository.
4. Verify the published version and package contents.
   - Do this before upgrading a consumer.

Run `pnpm exec changeset` to write a changeset and `npm pack --dry-run --json` to inspect the publishable files. Packaging does not include every repository file; check `package.json` `files` when a consumer needs a new runtime asset.

## Upgrade a consumer

An updated dependency range does not change an installed lockfile or a server already running. In each consumer repository:

1. Set `@terra-symposium/docs` to the intended published version.
   - Reinstall dependencies and commit the updated lockfile.
2. Compare the integration with [Host integration](/developer/component/host-integration/).
   - Check the [API reference](/developer/component/blocks/) for contract changes.
   - Review relevant API, CSS, and Markdown changes.
3. Build the consumer and run relevant checks.
   - Open its Docs routes and inspect navigation, blocks, and assets.
   - Check editing or publication when the host enables them.
4. Restart the preview to load the new package.
   - Check the deployed site separately after its release.

For a pnpm consumer, `pnpm up @terra-symposium/docs@VERSION` updates the dependency and lockfile; replace `VERSION` with the published version selected for that repository.

For a Markdown migration during the upgrade, use [Migrations](/developer/repository/content-migration/) before changing source in bulk.

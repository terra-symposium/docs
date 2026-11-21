---
title: Release and upgrade
description: Publish a Docs package version and verify consuming sites after an upgrade.
---

## Prepare a release

The package version lives in `package.json`. Changesets are configured in `.changeset/config.json` with `development` as their base branch. The `.github/workflows/publish.yml` release workflow runs on `main`: it skips a version already on npm, otherwise installs dependencies, builds, and publishes the current package version. Pull request CI runs the full Quality gate before merge.

1. Record the user-visible change in a changeset and update the affected consumer or developer guide.
2. Run the relevant checks from [Quality and tests](/developer/repo/quality-and-tests/). Read any Quality findings even when the command exits successfully.
3. Review the package version and packed files before merging. Only paths listed in `package.json` `files` ship to consumers; developer guides and the sanitizer scripts remain in this source repository.
4. After the release workflow, verify the published version and package contents before upgrading a consumer.

Run `pnpm exec changeset` to write a changeset and `npm pack --dry-run --json` to inspect the publishable files. Packaging does not include every repository file; check `package.json` `files` when a consumer needs a new runtime asset.

## Upgrade a consumer

An updated dependency range does not change an installed lockfile or a server already running. In each consumer repository:

1. Update `@terra-symposium/docs` to the intended published version and reinstall dependencies, committing the lockfile with the manifest change.
2. Check the integration against [Host integration](/developer/component/host-integration/) and the [component reference](/developer/component/blocks/). Review API, CSS, and Markdown changes that affect that consumer.
3. Build and run the consumer's relevant tests. Open its actual Docs routes; check navigation, rich blocks, assets, and editing or publication where enabled.
4. Restart any active preview so it loads the newly installed package. Check the deployed site separately after its release.

For a pnpm consumer, `pnpm up @terra-symposium/docs@VERSION` updates the dependency and lockfile; replace `VERSION` with the published version selected for that repository.

For a Markdown migration during the upgrade, use [Migrate content](/developer/repo/content-migration/) before changing source in bulk.

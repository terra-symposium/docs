---
title: Operate
description: Preview, build, and publish a Markdown Docs site after setup.
---

## Preview

Start with a project configured by [Get started](/consumer/0-configuration/0-install/). Run the preview from the directory containing `package.json`:

```sh
pnpm run docs
```

Open the address printed by the command. Edit a file under `docs/`, then check its page, navigation, search result, links, images, and narrow-screen layout. The preview is for local review; it does not publish changes.

## Build

When the pages are ready, stop the preview and run:

```sh
pnpm run build
```

The `docs.out` setting in `package.json` names the output folder. With `"out": "dist/docs"`, publish **the contents of `dist/docs/`** to your static host. Set `docs.site` to the public origin and `docs.base` to the path beneath it. For a site at `https://docs.example.com/handbook/`, use:

```json
{
  "docs": {
    "site": "https://docs.example.com",
    "base": "/handbook/",
    "out": "dist/docs"
  }
}
```

Keep the other `docs` settings from [Get started](/consumer/0-configuration/0-install/), including the required error report receiver. A successful build creates files locally; deploy them using your host's normal release process.

## Check

Use the public URL after deployment, since a local preview cannot prove that the host serves the correct base path or assets.

1. Open the home page and one nested page directly from their URLs.
2. Follow a sidebar link and a link inside a page; check that images and attachments load.
3. Search for a visible page. Check that a page marked `sidebar.hidden: true` stays out of navigation and search.
4. Open a missing route and confirm the site's 404 page appears.

:::caution[Private pages need host access control]

`sidebar.hidden` removes a page from navigation and search but leaves its URL available. Restrict private content at the web host.

:::

For page order and visibility, see [Tree handling](/consumer/1-usage/2-tree-handling/). For a fuller review of a page's content, use [Validation](/consumer/1-usage/4-validation/).

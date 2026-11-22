---
title: Get started
description: Create a Docs site, choose an editing workflow, and publish your pages.
---

The `Docs` repo turns Markdown files into a visualised documentation website. If your team needs to edit and publish in a browser, a developer can instead connect the Docs workspace to an existing React application. Follow the steps below in order, using the instructions for your chosen setup where they differ.

## 1. Prepare

Use Node.js 24.12 or newer and pnpm 10.30.3 or newer. Work in the project that will own your documentation. If you do not have one yet, create an empty project:

```sh
mkdir my-docs
cd my-docs
pnpm init
```

Install Docs in that project:

```sh
pnpm add @terra-symposium/docs
```

This installs the package without creating content or choosing an editing workflow. Browser editing also requires a React 19 application; a new empty project does not provide one.

## 2. Configure storage

Select one path, complete its steps, then continue with site configuration below.

|||[Local]

Use Markdown files to publish a website. No application code is needed.

1. Create a folder named `docs` at the project root. This is where the website will read its pages.
2. Create `docs/index.md` for the home page. Step 4 shows a page example.
3. Add the `docs` settings and preview/build scripts to `package.json` in step 3.
4. Edit pages in a text editor, or select **Edit** on the site and press **Save** to download an updated Markdown file. Replace the original file with the download, then commit and deploy it. The browser cannot write directly to the source repository.

Use [Tree handling](/consumer/1-usage/2-tree-handling/) for page order and navigation, and [Syntax](/consumer/1-usage/0-syntax/) for rich blocks.

|||

|||[Hosted]

Use browser editing in an existing React application. The application must supply:

- Pages and routes so Docs can find a document and build its navigation tree.
- Draft storage and revision checks so edits survive reloads without overwriting another editor's work.
- Accounts and permissions for reading drafts, editing, viewing history, and publishing.
- Published content and authorized attachment URLs for readers.

A developer then connects the workspace:

1. Import `@terra-symposium/docs/style.css` and mount `DocsWorkspace` on the application's Docs route.
2. Implement a `DocsHostAdapter` that loads the tree and documents and sends draft and publish actions to the server.
3. Enforce read and write permissions on the server. The adapter's capability flags only control which buttons appear.
4. Check that editors can save and publish while readers receive only published content.

The [workspace and host adapter contract](/developer/component/blocks/#workspace-shell) lists the required props and operations. A JSON setting alone cannot enable browser editing.

|||

## 3. Configure project

For a Local site, open `package.json` and add the `scripts` and `docs` objects below. Keep the other package fields. Replace the example domain and report endpoint with your own:

```json
{
  "scripts": {
    "docs": "docs dev",
    "build": "docs build"
  },
  "docs": {
    "title": "Acme Docs",
    "description": "Guides for Acme users",
    "site": "https://docs.example.com",
    "base": "/",
    "out": "dist/docs",
    "host": "127.0.0.1",
    "port": 3000,
    "includeAgents": false,
    "errorReporting": {
      "site": "acme-docs",
      "endpoint": "https://reports.example.com/docs",
      "delivery": "http"
    }
  }
}
```

| Setting                | What to change                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`, `description` | Name the site and explain who it helps.                                                                                                                           |
| `site`, `base`         | Set the public origin. Use `base: "/handbook/"` if the site is published at `https://docs.example.com/handbook/`.                                                 |
| `out`                  | Choose the folder to publish; this example uses `dist/docs`.                                                                                                      |
| `host`, `port`         | Set the address for local preview. Change or remove these entries if you want another address, then restart the preview.                                          |
| `includeAgents`        | Set to `true` to include `docs/agents/` in navigation and search.                                                                                                 |
| `errorReporting`       | Give this site an identifier and your own server endpoint. `delivery: "http"` sends reports to that receiver; `"email"` requires an endpoint that sends the mail. |

:::caution[Provide a real report receiver]

Docs requires an error report endpoint to build a Local site, but it does not create a receiver. The URL above is an example. Keep mail credentials on your server.

:::

For a Hosted workspace, set the site title on `DocsWorkspace` and connect routes, storage, and permissions through its host adapter. The application's own configuration controls its deployment. For a custom sidebar in an embedded site, see [Tree handling](/consumer/1-usage/2-tree-handling/#set-an-embedded-sidebar).

## 4. Add pages

A page needs a clear title, a short description, and a body that starts with an H2 heading. For a Markdown website, put metadata at the top of each file:

:::example[A first guide]

Save this as `docs/0-guides/0-install.md`:

```md
---
title: Install Acme
description: Set up your first Acme project.
sidebar:
  label: Install
---

## Prepare your project

Install the tools your project needs before continuing.
```

:::

Folders create navigation trees and branches. Number prefixes set their order and remain in the URL; [Tree handling](/consumer/1-usage/2-tree-handling/) explains labels, ordering, and hidden leaves. Keep images beside their leaf and use relative paths. In a hosted workspace, the application supplies equivalent leaf metadata and navigation through its adapter.

Use the [Authoring guide](/consumer/1-usage/1-authoring/) to plan each page and the [Syntax index](/consumer/1-usage/0-syntax/) to see the available blocks.

===[Optional blocks and navigation]

| Feature                                                   | How to use it                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Built-in tables, images, asides, tabs, math, and diagrams | Write the form shown in the [Syntax index](/consumer/1-usage/0-syntax/). They need no separate installation.                                                          |
| Custom blocks                                             | A developer registers a renderer through the hosted workspace's `customBlocks` prop. A `package.json` setting cannot register a React component.                      |
| Quiz and TypeScript reference                             | The application must supply the quiz generator or reference data. Adding `<Quiz />` or `<TsDocs />` alone does not provide them.                                      |
| Manual sidebar in an embedded site                        | A developer passes ordered `trees` to `DocsSiteLayout`. A local site uses the folders and filenames described in [Tree handling](/consumer/1-usage/2-tree-handling/). |

In a hosted workspace, a developer can also disable a built-in renderer when mounting `DocsWorkspace`:

```tsx
<DocsWorkspace {...workspaceProps} blocks={{ embed: false }} customBlocks={myBlocks} />
```

Here `workspaceProps` supplies the required host, tree, route, permission, and title; `myBlocks` contains renderers registered by the application. Omit either optional prop when unused. See the [component reference](/developer/component/blocks/) for the full contract.

===

## 5. Preview

For a Markdown website, start the local preview and open the address it prints:

```sh
pnpm run docs
```

For a hosted workspace, start your application's development server and open its Docs route. In either case, check the rendered headings, code, images, links, navigation, and narrow-screen layout. Follow [Validation](/consumer/1-usage/4-validation/) before publishing.

## 6. Publish

For a Markdown website, stop the preview and build the site:

```sh
pnpm run build
```

Publish `dist/docs/`, or the folder set by `docs.out`, with a static web host. A successful build creates the files; it does not deploy them.

For subsequent changes and checks at the public URL, see [Run a site](/consumer/0-configuration/1-site-operations/) and [Validation](/consumer/1-usage/4-validation/).

For a hosted workspace, deploy the React application and its document API. Verify that editors can save and publish and that readers see only published content.

:::warning[Protect private content at the host]

Hiding a page from navigation does not protect its URL. Restrict a private static site at the web host. For browser editing, authenticate reads and enforce write, draft, history, and publish permissions on the server.

:::

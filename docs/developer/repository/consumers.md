---
title: Docs consumers
description: Local repository audit of Docs package resolution and host boundaries.
hidden: true
---

## Audit scope

This historical audit covers Desktop repositories with an `@terra-symposium/docs` dependency, a `docs` command, or a Docs route on 2 November 2026. Versions below reflect that date and are not a current installation inventory. For the repeatable upgrade process, use [Release](/developer/repository/release-and-upgrades/); for application responsibilities, use [Host integration](/developer/component/host-integration/).

## Integration patterns

The useful distinction across consumers is the boundary each host owns:

| Pattern                  | Docs supplies                                                 | Consumer supplies                                                      |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Markdown site            | CLI, generated routes, navigation, search, and rendered pages | Markdown source, site settings, assets, static deployment              |
| Local embedded workspace | Shared editor and Markdown download on Save                   | Tree, branch, and leaf routes, content and asset URLs                  |
| Hosted workspace         | Editor, navigation, rich blocks, and action UI                | Authenticated reads, drafts, writes, publication, history, attachments |

Use [Development](/developer/repository/development/) for the first pattern and [Host integration](/developer/component/host-integration/) for the latter two. Verify a consumer's current installed version and running site in that repository rather than using the historical table as an upgrade checklist.

## Consumer versions

| Repository        | Declared / installed | Renderer and CSS                       | Host responsibility                                                    |
| ----------------- | -------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Docs              | local `0.4.3` source | Shared site, workspace, package CSS    | Package implementation and its own Markdown catalog                    |
| Docs template     | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Template content and site configuration                                |
| Standards         | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Markdown and site configuration                                        |
| Styling           | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | API reference generation and Markdown                                  |
| Systems           | `^0.4.22` / `0.4.22` | `docs` CLI, shared CSS                 | Structure synchronization and Markdown                                 |
| Compression       | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Assessment content and site configuration                              |
| Personal Docs     | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Personal content and site configuration                                |
| Portfolio Styling | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Portfolio content and base path                                        |
| RMA Sports        | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Business content and site configuration                                |
| Salesphere root   | `0.4.3` / `0.4.3`    | `docs` CLI, shared CSS                 | Static site content                                                    |
| Salesphere Astro  | `^0.4.3` / `0.4.3`   | `DocsWorkspace`, package CSS           | Tree loading, routes, actions, authorization                           |
| Uni notes         | `^0.4.3` / `0.4.3`   | `DocsLocalWorkspace`, package CSS      | Content tree, routes, links, quiz capability                           |
| Website Astro     | `0.4.3` / `0.4.3`    | `DocsWorkspace`, package CSS           | Sanity loading, routes, permissions, custom blocks                     |
| Website Sanity    | none / none          | No Docs renderer or CSS import found   | Sanity schema and data                                                 |
| Playlist Atlas    | none                 | Own Astro content renderer and app CSS | Product-specific guide site; outside the Terra Docs workspace contract |

Uni notes uses the shared workspace at runtime; its local code does not implement a second document renderer. Website and Salesphere use the remote host adapter. The static sites use the shared CLI. Consumer lockfiles and active previews must be refreshed after each package release; a manifest alone does not change a running server.

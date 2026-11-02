---
title: Docs consumers
description: Local repository audit of Docs package resolution and host boundaries.
order: 9
---

This audit covers Desktop repositories with an `@terra-symposium/docs` dependency, a `docs` command, or a Docs route on 2 November 2026. Versions below reflect the `0.4.3` rollout; each host keeps data loading and routing in its own repository.

| Repository        | Declared / installed | Renderer and CSS                       | Host responsibility                                                    |
| ----------------- | -------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Docs              | local `0.4.3` source | Shared site, workspace, package CSS    | Package implementation and its own Markdown catalog                    |
| Docs template     | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Template content and site configuration                                |
| Standards         | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Markdown and site configuration                                        |
| Styling           | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Component reference generation and Markdown                            |
| Business Docs     | `^0.4.3` / `0.4.3`   | `docs` CLI, shared CSS                 | Structure synchronization and Markdown                                 |
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

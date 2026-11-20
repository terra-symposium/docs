---
title: Docs interface
description: Choose the Docs API, host contract, and styling reference for an integration.
---

## Choose an integration

Start with the smallest surface that meets the reader's task. A repository-backed Markdown site needs no application code; [Get started](/consumer/0-configuration/0-install/) covers that path. An application can embed one controlled `Docs` value, a static layout that downloads edited Markdown, or a hosted workspace with server-backed editing.

| Need                                                  | Read next                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| Props, rich blocks, and Markdown conversion           | [Component reference](/developer/component/blocks/)        |
| Routes, storage, permissions, drafts, and publication | [Host integration](/developer/component/host-integration/) |
| Shared controls, palette, and document prose styling  | [Styling in Docs](/developer/4-styling/)                   |
| Static site generation and navigation                 | [Site pipeline](/developer/repo/site-pipeline/)            |

## Keep the boundary clear

Docs renders values and exposes controls. The host owns document identity, persistence, asset URLs, and access decisions. A control being hidden or disabled in the browser is not authorization; the server must enforce each operation. The [host integration guide](/developer/component/host-integration/) shows where that contract is implemented.

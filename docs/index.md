---
title: Terra Docs
description: Install an independent document editor and viewer in your own application.
---

Terra Docs is a reusable React editor and viewer. Put it inside an application you own, then decide there how documents are saved, who can open them, and when they are published. Docs edits and renders the value you give it.

| If you want to…                   | Start with…                                            |
| --------------------------------- | ------------------------------------------------------ |
| Put the editor in an application  | [Create an instance](/0-installation/getting-started/) |
| Connect durable storage           | [Storage providers](/0-installation/storage/)          |
| See modes, props, and rich blocks | [Component reference](/0-installation/component/)      |
| Write a page for readers          | [Write a Docs page](/1-authoring/authoring/)           |
| See the blocks rendered           | [Docs blocks in use](/1-authoring/structured-blocks/)  |

## Install an instance

The [getting started guide](/0-installation/getting-started/) builds a small host app with in-memory state. That proves the editor works; the [storage guide](/0-installation/storage/) explains the boundary you must add before edits become durable.

## Current release scope

The package supports Portable Text text and the reusable rich blocks listed in the [component reference](/0-installation/component/). Repository-backed instances can render Markdown and adjacent assets. Remote instances can add draft saving, publishing, history, and uploads through a host-provided storage adapter. The host supplies authentication and permissions.

:::note[The boundary to remember] Docs owns editing and rendering. Your application owns storage, identity, permissions, and release decisions. :::

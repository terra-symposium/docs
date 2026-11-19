---
title: Deploy an instance
description: Build and deploy the host application.
---

The library has no global configuration object, each instance is selt hosted through using the template associated with this repo.

For the Vite starter created in [Create an instance](./getting-started/):

<CodeBlock language="sh" code={"pnpm build"} />

Publish the generated `dist/` directory with your static host. If your host uses server-side rendering, follow its React client-component requirements. Configure document APIs and credentials in the host's deployment environment; never put secrets in browser code.

Persistence, authorization, and backups are supplied by the host application.

## Requirements

- Node.js 24.12 or newer
- pnpm 10.30.3 or newer
- React 19

## Create the host app

<CodeBlock language="sh" code={"pnpm create vite my-docs --template react-ts\ncd my-docs\npnpm install\npnpm add react react-dom"} />

Install the published package when a release is available:

<CodeBlock language="sh" code={"pnpm add @terra-symposium/docs"} />

For development against this repository before publication, use a local package link:

<CodeBlock language="sh" code={"pnpm add /path/to/docs"} />

The host app remains its own project and Git repository. React and React DOM are peer dependencies and must be installed by the host.

## Add the editor

Replace the starter component with:

<CodeBlock language="tsx" code={"import { useState } from 'react';\nimport { Docs } from '@terra-symposium/docs';\nimport type { DocsValue } from '@terra-symposium/docs';\nimport '@terra-symposium/docs/style.css';\n\nexport default function App() {\n const [value, setValue] = useState<DocsValue>([]);\n return <Docs mode=\"edit\" value={value} onChange={setValue} />;\n}"} />

Run `pnpm dev`. This example stores changes in memory; saving and loading are responsibilities of the host app. See [storage](../storage/) before using it for durable documents.

---
title: Deploy an instance
description: Build and deploy the host application.
---

The library has no global configuration object, each instance is selt hosted through using the template associated with this repo.

For the Vite starter created in [Create an instance](./getting-started/):

```sh
pnpm build
```

Publish the generated `dist/` directory with your static host. If your host uses server-side rendering, follow its React client-component requirements. Configure document APIs and credentials in the host's deployment environment; never put secrets in browser code.

Persistence, authorization, and backups are supplied by the host application.

## Requirements

- Node.js 24.12 or newer
- pnpm 10.30.3 or newer
- React 19

## Create the host app

```sh
pnpm create vite my-docs --template react-ts
cd my-docs
pnpm install
pnpm add react react-dom
```

Install the published package when a release is available:

```sh
pnpm add @terra-symposium/docs
```

For development against this repository before publication, use a local package link:

```sh
pnpm add /path/to/docs
```

The host app remains its own project and Git repository. React and React DOM are peer dependencies and must be installed by the host.

## Add the editor

Replace the starter component with:

```tsx
import { useState } from 'react';
import { Docs } from '@terra-symposium/docs';
import type { DocsValue } from '@terra-symposium/docs';
import '@terra-symposium/docs/style.css';

export default function App() {
  const [value, setValue] = useState<DocsValue>([]);
  return <Docs mode="edit" value={value} onChange={setValue} />;
}
```

Run `pnpm dev`. This example stores changes in memory; saving and loading are responsibilities of the host app. See [storage](../storage/) before using it for durable documents.

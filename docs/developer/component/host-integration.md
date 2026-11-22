---
title: Host integration
description: Connect Docs to routes, storage, permissions, and optional rich blocks.
---

## Choose a surface

The [Get started guide](/consumer/0-configuration/0-install/) covers the no-code Markdown site. Use a React integration when an application already owns documents or needs server-backed editing.

| Surface              | Use it when                                             | Host supplies                                                            |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Docs`               | One controlled document                                 | `value`; `onChange` in edit mode; saving outside the component           |
| `DocsSiteLayout`     | An embedded leaf with Markdown download on Save         | Ordered trees, current route, rendered content and source Markdown       |
| `DocsLocalWorkspace` | A repository-backed tree with Markdown download on Save | Leaf index, route tree, and asset URLs                                   |
| `DocsWorkspace`      | A hosted workspace with editing                         | Adapter, tree, current route, permission, draft and publication services |

Import the package stylesheet once in the host application:

```tsx
import '@terra-symposium/docs/style.css';
```

## Connect a hosted workspace

`DocsWorkspace` receives the current tree, route, document title and content, permission, and a `DocsHostAdapter`. The adapter owns route resolution, asset URLs, reads, and mutations. Start with the exported `DocsWorkspaceProps` and `DocsHostAdapter` types and the [component reference](/developer/component/blocks/#workspace-shell).

1. Load the navigation tree and the current published document on the server or route loader. Pass their data as `tree`, `pathname`, `title`, and `content`.
2. Implement `host.invoke` for the operations the UI needs, beginning with `read.doc.list`, `read.doc.get`, and `write.doc.save` if editing is enabled. Return `{ data }` or `{ error }`.
3. Set `host.capabilities` and the page's `permission` from the signed-in user's access. Enforce every read and mutation again on the server; UI flags do not grant access.
4. If the host supports separate drafts and publication, implement `loadDraft(path)` and `publishDraft(path)`. Store drafts durably and handle concurrent edits in the host's storage layer.
5. Resolve attachment URLs through authorized host endpoints. Test a reader, an editor, and a user without access against actual server responses.

For example, the application can send adapter operations to its own API. This route must verify the session and authorize each operation before it reads or writes data:

```tsx
import { DocsWorkspace } from '@terra-symposium/docs';
import type { DocsHostAdapter } from '@terra-symposium/docs';

const host: DocsHostAdapter = {
  capabilities: { read: true, write: canEdit, publish: canPublish },
  async invoke(op, input) {
    const response = await fetch('/api/docs/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, input }),
    });
    if (!response.ok) return { error: `Docs request failed: ${response.status}` };
    return response.json();
  },
};

<DocsWorkspace
  host={host}
  tree={tree}
  pathname={pathname}
  permission={canEdit ? 'write' : 'read'}
  title={document.title}
  content={document.content}
/>;
```

The host must supply `tree`, `pathname`, `document`, and access decisions from its own route loader. Add `loadDraft` and `publishDraft` to the adapter only when those server operations exist.

:::warning[Guard the data boundary]

Docs renders and edits values supplied by the host. It does not authenticate users, persist drafts, or protect private URLs on the server.

:::

## Add optional behavior

Pass `blocks` to disable selected built-in renderers and `customBlocks` to register host-specific components. The host supplies data and access rules for quizzes and TypeScript references. A quiz generator callback belongs behind a server endpoint; keep its credentials on the server. See [Syntax](/consumer/1-usage/1-syntax/) for the authored forms and [Component reference](/developer/component/blocks/) for the block contracts.

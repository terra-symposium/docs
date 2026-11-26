---
title: Host integration
description: Connect Docs to routes, storage, permissions, and optional rich blocks.
---

## Choose a surface

The [Get started guide](/consumer/0-configuration/0-install/) covers the no-code Markdown site. Use a React integration when an application already owns documents or needs server-backed editing.

| Surface               | Use it when                                             | Host supplies                                                             |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Docs`                | One controlled document                                 | `value`; `onChange` in edit mode; saving outside the component            |
| `DocsStaticWorkspace` | Static Markdown tree with the shared Docs navigation    | Ordered trees, current path, Markdown source, optional quiz configuration |
| `DocsSiteLayout`      | An embedded leaf with Markdown download on Save         | Required `nodes`, ordered trees, current route, and rendered content      |
| `DocsLocalWorkspace`  | A repository-backed tree with Markdown download on Save | Leaf index, route tree, and asset URLs                                    |
| `DocsWorkspace`       | A hosted workspace with editing                         | Adapter, tree, current route, permission, draft and publication services  |

Import the package stylesheet once in the host application:

```tsx
import '@terra-symposium/docs/style.css';
```

## Connect a hosted workspace

`DocsWorkspace` receives the current tree, route, document title and content, permission, and a `DocsHostAdapter`. The adapter owns route resolution, asset URLs, reads, and mutations. Start with the exported `DocsWorkspaceProps` and `DocsHostAdapter` types and the [API reference](/developer/component/blocks/#workspace-shell). Related adapter contracts include `DocsHostCapabilities`, `DocsHostOperationContracts`, `DocsActionOperation`, `DocsActionResult`, `DocsResolvedRoute`, `DocsHostTreeNode`, `DocsHostDocument`, `DocsHostAttachment`, and `DocsHostUser`.

1. Load the tree and published document in the route loader.
   - Pass `tree`, `pathname`, `title`, and `content` to Docs.
2. Implement `host.invoke` for operations the UI needs.
   - Start with list and get; add save when editing is enabled.
   - Return `{ data }` or `{ error }`.
3. Set capabilities and page permission from host authentication.
   - Recheck every read and mutation on the server.
   - UI flags alone do not grant access.
4. Add draft and publish methods when the host supports them.
   - Store drafts durably and handle concurrent edits.
5. Resolve attachment URLs through authorized host endpoints.
   - Check reader, editor, and denied responses from the server.

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

## Register extensions

Pass `blocks` to disable selected built-in renderers and `customBlocks` to register host-specific components. The host supplies data and access rules for quizzes and TypeScript references. A quiz generator callback belongs behind a server endpoint; keep its credentials on the server. See [Blocks](/consumer/1-usage/2-blocks/) for the authored forms and [API reference](/developer/component/blocks/) for the block contracts.

### Add a quiz

Set `quiz={{ toolbar: true, generate }}` on `DocsStaticWorkspace`, `DocsLocalWorkspace`, or `DocsWorkspace`. `generate` receives the leaf title, Markdown, requested count, and question types. It returns `{ title, questions }`; validate external results with `parseDocsQuiz` before displaying them.

Supported question shapes are:

- Multiple choice uses `prompt`, `opts`, and `answer` fields.
- Keyword questions use `prompt` and `answers` fields.
- Either type may include `explanation` and `section`.

Keep generation behind a host endpoint so credentials and provider access stay on the server. Generated questions and answers live in the page session; the Docs component does not save quiz results. The toolbar is off unless enabled. Individual Markdown leaves use `<Quiz />` for generation or `<Quiz data={{...}} />` for a source-controlled JSON bank when the host registers that block. In Docs View, a final `## Quiz` plus authored bank is shown through a page-level Quiz button and dialog. See the [README quiz contract](../../../README.md#security-and-limitations) for a complete example.

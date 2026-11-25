---
title: Docs integrations
description: Choose a Docs surface and keep consumer artifacts in sync.
order: 1
---

Docs separates shared rendering from the application that owns document data. Choose the public surface that matches where content comes from, then keep identity, persistence, and routing at the host boundary.

| Integration                       | Docs surface                                | Host responsibility                                                                                        |
| --------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Standalone editor                 | `Docs`                                      | Pass a Portable Text value, handle `onChange`, and save it in the host.                                    |
| Repository-backed Markdown        | `DocsLocalWorkspace`                        | Supply local pages and assets; the workspace renders them read-only.                                       |
| Static root `docs/` site          | `docs` CLI or `DocsSiteLayout`              | Configure the site metadata and content; Docs builds routes, navigation, search, and the shared workspace. |
| Remote records or a host database | `TerraDocsWorkspace` with `DocsHostAdapter` | Load records, authorize actions, persist revisions, resolve routes, and provide attachment URLs.           |

## Check the resolved package

An application can use a published package, a local link, or a previously built artifact. Confirm which copy the application resolves before diagnosing a mismatch:

```sh
pnpm list @terra-symposium/docs --depth 0
pnpm why @terra-symposium/docs
```

Keep the consumer lockfile consistent with its manifest. After changing the package version or source, reinstall the selected artifact and restart the active preview so it does not keep serving an older build. Import the package stylesheet from the host entry point:

```ts
import '@terra-symposium/docs/style.css';
```

## Verify a consumer change

Use the checks declared by the consumer repository. For this package, `pnpm run test:consumer` builds and opens the packaged workspace fixture. Check the rendered host data, navigation, stylesheet, and browser console against the exact package artifact the application uses; a successful package build alone does not verify a downstream consumer.

Keep routes, identity, authorization, data loading, saving, publishing, and durable storage in the host application. The shared workspace supplies common navigation and rendering; a host adapter connects those controls to host-owned data and capabilities.

---
title: API reference
description: Choose Docs components and check their document contracts.
---

## Install Docs

```tsx
import { Docs } from '@terra-symposium/docs';
import type { DocsProps, DocsValue, DocsMode } from '@terra-symposium/docs';
import '@terra-symposium/docs/style.css';
```

The package also exports `DocsStaticWorkspace` for static Markdown trees, `DocsLocalWorkspace` for repository-backed editing, and `DocsNavigation` when an application needs the shared tree navigation alone. `DocsMarkdown` renders a Markdown string with the Docs block registry; `renderMarkdown` provides the corresponding HTML string API for server rendering. Import names and subpath entry points are listed in the repository's `package.json` and `src/lib/index.ts`.

`Docs` is also exported as `TerraDocsWorkspace`; its `DocsProps`, `DocsMode`, and `DocsValue` types define the controlled editor. `DocsNavigation` accepts `DocsNavNode[]`. Tree shapes are typed by `DocsTree`, `DocsBranch`, `DocsLeaf`, `DocsGroup`, `DocsSection`, and `DocsAttachment`; use the shape matching the workspace surface instead of converting between them implicitly.

## Host and quiz runtime

`DocsWorkspace` installs its `DocsHostAdapter` and `customBlocks` through `configureDocsHost`. Hosts using that workspace should pass these as props rather than configure the runtime separately. `getDocsHostAdapter` returns the adapter currently installed for custom components that need to read host settings. The configuration is shared by the mounted Docs runtime.

For quizzes, set `quiz` on a workspace and provide the host-owned `generate` callback; the [Host integration guide](/developer/component/host-integration/#add-a-quiz) documents its input, output, and question shapes. `parseDocsQuiz` validates generated data, and `DocsQuizGenerator` is the shared quiz interface used by the workspace toolbar. The exported `DocsQuizConfig`, `DocsQuizGenerationInput`, `DocsQuizQuestion`, `DocsQuizQuestionType`, and `DocsQuizDocument` types describe that contract.

## Component props

`DocsValue` is a Portable Text block array. The editor and viewer support paragraphs, headings 2–6, quotes, bold, italic, underline, strikethrough, links, and the reusable rich blocks below. The host controls persistence and authorization.

| Prop        | Edit mode               | View mode               |
| ----------- | ----------------------- | ----------------------- |
| `mode`      | Required: `edit`        | Required: `view`        |
| `value`     | Current document        | Document to render      |
| `onChange`  | Required; reports edits | Not accepted            |
| `className` | Optional wrapper class  | Optional wrapper class  |
| `blocks`    | Per-block opt-out flags | Per-block opt-out flags |

## Rich blocks

Markdown tabs (`|||[Title]`) and accordions (`===[Title]`) render with the shared Styling controls. The editor inserts and saves these as Markdown. Existing structured Portable Text records in consumer-owned stores are converted to Markdown when loaded; this compatibility adapter does not add structured tab or accordion editor controls. Repository-owned Docs pages use the Markdown syntax directly. The remaining block registry includes tables, callouts, code, images, embeds, math (including inline math), diagrams, raw Markdown, and TypeScript documentation. Code is document content; there is no raw document-code mode.

To disable a member in one instance, set its flag to `false`:

```tsx
<Docs mode="edit" value={value} onChange={setValue} blocks={{ embed: false, nodes: false }} />
```

The same options can be passed to `renderMarkdown(markdown, blocks)`. Unknown or disabled structured source stays visible as escaped source, so it is not silently discarded.

### Markdown forms

`markdownToDocsValue(source)` and `docsValueToMarkdown(value)` bridge local Markdown and visual editing. Supported forms include:

| Content             | Source form and behavior                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prose               | Markdown paragraphs, headings 2–6, quotes, marks, links, and inline math. H1 imports as normal text.                                                                                                     |
| Lists               | Ordered and unordered Markdown lists, including nested items.                                                                                                                                            |
| Tables              | GFM or HTML tables import as editable blocks and export as pipe tables. A bold caption may precede a table.                                                                                              |
| Images              | A standalone `![alt](./image.png "Title")` paragraph imports as an image block; an inline image stays in paragraph source.                                                                               |
| Code and math       | Fenced code needs a language. Backticks stay inline; `$$` marks display math.                                                                                                                            |
| Callouts            | Docs parses titled `:::` callouts in `.md`; Astro MDX does not parse them.                                                                                                                               |
| Tabs and accordions | Use the adjacent titled source directives shown below. Keep delimiters on their own lines with blank lines around each body.                                                                             |
| Diagrams and embeds | Use `<Nodes direction="TB" nodes={[...] } edges={[...] } />` or `<Embed src="..." title="..." />`. In `.md`, node and edge arrays must be JSON: double-quoted keys and strings, with no trailing commas. |

```md
|||[Title]

Panel content

|||

===[Title]

Panel content

===
```

Static `.md` routes pass source through Docs' Markdown renderer, which handles its callouts, tabs, and accordions. Static `.mdx` routes render Astro-compiled content in the Docs shell; use a React component there or keep Docs Markdown syntax in a `.md` leaf.

The `.md` renderer does not evaluate JavaScript inside JSX attributes. For `<Nodes>`, use complete JSON arrays inside braces; single-quoted strings, unquoted keys, expressions, and trailing commas are not valid diagram data and will remain source instead of rendering a diagram.

Unknown Markdown tokens and disabled block syntax are kept as raw source. Store images and attachments beside the Markdown file and use relative paths.

## Workspace shell

`DocsSiteLayout` (React) and `@terra-symposium/docs/site-layout.astro` are static-host adapters around the same Docs workspace used by the local and remote providers. They render the tree selector, nested branches and leaves, document header, and View/Attachments toolbar. For React, `nodes` and `currentPath` are required even when you pass `trees`; use `nodes={[]}` when navigation comes entirely from trees. Pass `trees` as an ordered array of `{ title, branches: [{ title, leaves: [{ title, href, description?, updatedAt?, attachments? }] }] }`. Each attachment belongs to its leaf and appears in Attachments mode. Existing hosts can continue passing the legacy `sections` and `groups` shape while migrating.

Pass `breadcrumbParent={{ title, href }}` to a static host when a page has a parent reference. The breadcrumb appears above the document body and links back to that parent.

Local hosts use `DocsLocalWorkspace`. Its editor Save action downloads Markdown that can replace the source file; it does not publish the change. Remote hosts mount `DocsWorkspace` with a `DocsHostAdapter`; the adapter supplies capabilities and routes all reads and mutations to the host. The shared UI does not decide identity or authorization.

## Raw source

A raw block preserves source that Docs cannot safely interpret. It displays the original Markdown or MDX as source, except a horizontal-rule token, which renders as a divider. Use it as a recovery format and resolve the unsupported content with the host before relying on it as a live feature.

:::example[Raw source]

|||[Good]

<UnknownWidget />

Keep the original source recoverable while checking the missing renderer.

|||

|||[Bad]

Unknown widget.

This loses the original source and suggests the widget is working.

|||

:::

:::tip[Authoring]

|||[Code]

```md
<UnknownWidget />
```

|||

|||[UI]

1. Select **Edit** and place the cursor where the literal source belongs.
2. Press **+ Insert content** and choose **Raw**.
3. Enter the source and confirm it stays visible.
   - Use prose, code, or a supported block for ordinary Markdown.

![The Insert content menu in the Docs editor, with Raw highlighted](./blocks/ui/insert-raw.png)

|||

:::

:::note[Syntax]

- Keep data in a typed `raw` block when Markdown cannot preserve it.
- A rule token renders as a divider; other raw source stays literal.

:::

:::caution[Constraints]

- Raw source is preserved for recovery, not executed as a component.
- Do not describe an unregistered block as a working interactive feature.

:::

### Variants

Choose the variant that matches the reader's task; the examples show the intended form and a misuse.

| Variant                                                                          | Good example                                                | Bad example                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| Unknown syntax ; Preserve unrecognized or disabled source for recovery.          | `Keep the complete original token.`                         | `Drop it or present it as a live component.` |
| Horizontal rule ; Render a standalone `---`, `***`, or `___` token as a divider. | `Use a rule only for a meaningful break.`                   | `Use dividers between every paragraph.`      |
| Typed payload ; Preserve fields that plain Markdown would lose.                  | ``<DocsBlock type="raw" data={...} />` with original data.` | `Rewrite the data as ordinary prose.`        |

## Lower-level exports

The root package barrel exposes these additional APIs. They are lower-level pieces used by the shared workspace; start with the workspace components above unless an integration needs to compose the editor or renderer directly.

| API group                  | Exports                                                                                                                                                                                          | Role                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Markdown conversion        | `markdownToDocsValue`, `docsValueToMarkdown`                                                                                                                                                     | Convert between Markdown source and the visual editor's document value.                                                          |
| Block registry             | `DOCS_BLOCK_TYPES`, `DOCS_BLOCK_FIELDS`, `enabledDocsBlocks`, `defaultDocsBlock`, `DocsRichBlock`, `DocsBlockOptions`, `DocsBlockType`, `DocsEditorBlockType`, `RichBlock`                       | Inspect or construct the built-in rich block registry.                                                                           |
| Host runtime               | `configureDocsHost`, `getDocsHostAdapter`, `DocsCustomBlock`                                                                                                                                     | Install or inspect the host adapter and host-registered block renderers. Normal `DocsWorkspace` use configures these from props. |
| Quiz                       | `DocsQuizGenerator`, `parseDocsQuiz`, `DocsQuizConfig`, `DocsQuizDocument`, `DocsQuizGenerationInput`, `DocsQuizQuestion`, `DocsQuizQuestionType`                                                | Render quiz controls and validate generated quiz data; see [Host and quiz runtime](#host-and-quiz-runtime).                      |
| Editor and block renderers | `DocsContentEditor`, `renderCallout`, `renderCode`, `Embed`, `renderImage`, `renderMathBlock`, `DocsInlineMath`, `NodesBlock`, `Raw`, `renderTable`, `TsDocs`, `DocsHeading`, `DOCS_BLOCK_ICONS` | Compose the editor or individual built-in content renderers.                                                                     |
| Export and attachments     | `ExportDialog`, `DocsExportOpts`, `ExportTgt`, `ATTCH_TYPES`                                                                                                                                     | Build export controls or work with the workspace's attachment categories.                                                        |

The published declarations define the full TypeScript signature for each export. Check the installed package's declarations when composing a lower-level API, and keep an example and contract note here when an integration depends on it.

## Validation

Verify a Docs leaf from source coverage through rendering, publication, and history using the five-stage linear process below, as merely building the site does not confirm that the Markdown is valid. Small changes may require only some of these stages, whereas large changes require all five.

<Nodes
nodes={[
{"id":"sources","type":"origin","data":{"title":"1. Account for sources"}},
{"id":"draft","type":"process","data":{"title":"2. Review the draft"}},
{"id":"render","type":"process","data":{"title":"3. Inspect the rendered page"}},
{"id":"publish","type":"process","data":{"title":"4. Check edits and publication"}},
{"id":"record","type":"terminator","data":{"title":"5. Record the result"}}
]}
edges={[
{"id":"sources-draft","source":"sources","target":"draft"},
{"id":"draft-render","source":"draft","target":"render"},
{"id":"render-publish","source":"render","target":"publish"},
{"id":"publish-record","source":"publish","target":"record"}
]}
direction="TB"
/>

## 1. Account for sources

Check the source record and every usable attachment before writing, resolving or stating missing material and conflicts up front. Return any exact validation failure to a bounded repair attempt.

:::caution[Stop after four failed repairs]

Agents must note that after the _fourth_ failed attempt accessing an attachment, you must preserve the diagnostics and stop without writing the leaf.

:::

## 2. Review the draft

Author, sanitise, and verify the Markdown leaf under `docs/` before rendering. Check its frontmatter and opening H2 heading, keep images beside the page using relative source paths, and use a meaningful Docs block wherever it clarifies a substantial relationship.

### Content and artifact cleanup

Read the page from top to bottom against its sources to verify names, dates, props,
defaults, behaviour, constraints, links, examples, and the order of ideas. Confirm that
the prose stays focused on the reader's task and explains context the implementation
cannot show in plain Australian English. Recheck expiring facts—commands, version
requirements, API names, external links, and screenshots—and keep copyable text in
source or code blocks rather than screenshots.

Strip leftover AI tool citation markers (`[cite]`, numbered markers such as
`[cite: 1–2]` or `[cite: …]`, and `[cite_start]`)
without deleting useful source links. In an editor, search for numbered markers with
`\[cite:\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*\]`,
then search separately for `\[cite_start\]` and plain `[cite]`.

Expand the two reference collections below to verify authored markup rules and run
automated sanitisation on legacy Docs migrations.

===[Syntax and formatting rules]

Check authored markup against the [block contract](/developer/component/blocks/) and Docs
blocks documentation before rendering:

- Do not invent generic directives such as `:::docs`.
- Place every block opener (such as `|||[TypeScript API]`, `===[Details]`, or `:::note[Note]`) on its own line
  - Leave one blank line before its body
  - Leave one blank line before the matching closer.
- Remove standalone `---` dividers from page content because presentation spacing belongs to the Docs styles
  - Preserve only the opening and closing `---` frontmatter fences and examples inside code fences.
- Escape `&lt;`, `:`, or `$` only when the parser would otherwise treat them as HTML, a YAML field boundary, or math.
- Give every fenced code block a language info string
  - Use `text` when no better language applies
  - Keep single backticks inline so they never receive a code-block header or copy button.
- Use a fence longer than any backtick run inside the example
  - E.g. such as a longer outer fence to demonstrate a fence inside a fence)
  - Verify that the rendered example matches the literal source.
- Use Markdown tables for ordinary tabular text, keeping HTML tables when classes or fragile embedded components require them.
- Use a brief, single-line AI-facing comment only when it preserves intent a future author might miss
  - Do not repeat visible prose or filling the page with comments.
- Keep audience assumptions, exclusions, and unresolved questions in the authoring brief when they do not belong in the published leaf.

===

===[Legacy markup migration and sanitisation]

If the edit migrates legacy Docs markup, follow
[Migrate content](/developer/repo/content-migration/) before changing files in bulk, and
use the shared `docs-sanitization` skill
(`scripts/docs-sanitize/cli.py`, with implementation and fixtures in
`scripts/docs-sanitize/`) to audit and safely repair fenced blocks, diagram
data, and legacy component tags:

<Code language="sh">{`python3 /path/to/docs/scripts/docs-sanitize/cli.py check /path/to/consumer/docs
python3 /path/to/docs/scripts/docs-sanitize/cli.py fix /path/to/consumer/docs`}`

`check` is read-only and exits nonzero for findings, whereas `fix`
performs only deterministic transformations: splitting Docs delimiters onto their own
lines with blank lines around the body, converting literal
`&lt;CodeBlock&gt;` props to fenced Markdown, and converting supported
literal `&lt;DocsBlock&gt;` payloads. CI runs
`pnpm run docs:sanitize` against this repository's `docs/` tree
(pass another root to audit a consumer), and the CLI skips generated `dist`,
installed dependencies, and migration audit artifacts—do not scan those directories as
authored content. After running `fix`, run `check` again, review
the diff, and run the consumer's Docs build; add a fixture in
`scripts/docs-sanitize/` for each new failure mode before broadening a
transformation.

Complete these manual migration checks alongside automated fixes:

- Convert safe literal `&lt;CodeBlock&gt;` and `&lt;DocsBlock&gt;`
  tags with `fix`, and migrate other obsolete rich blocks to native Markdown
  or current component syntax after inspecting their data rather than replacing them
  with placeholders.
- Remove the legacy `NodesBlock` import and
  `export const Nodes = props =&gt; &lt;NodesBlock block=&#123;props&#125; /&gt;`
  shim from authored pages so the built-in `Nodes` component is used, while
  preserving imports inside code examples and unrelated application imports.
- Preserve `&lt;Nodes&gt;` graph data when moving content out of frontmatter:
  inline `nodes` and `edges` must contain the original objects,
  each on one line, and `frontmatter.*` references must be resolved from the
  original source or archive (an empty array is a finding, not valid recovered data; if
  the source is unavailable, leave the finding and report it rather than inventing a
  diagram).

===

### Pre-output check

For AI-generated page content, scan the complete draft against all source, structure,
content, syntax, and cleanup requirements above before sending it. If any check fails,
repair the draft and scan it again; do not present the page or mark a check complete
until the revised draft passes and can advance to rendering.

<Nodes
nodes={[
{"id":"draft","type":"origin","data":{"title":"Draft"}},
{"id":"scan","type":"process","data":{"title":"Scan the draft"}},
{"id":"decide","type":"decision","data":{"title":"Checks pass?"}},
{"id":"repair","type":"process","data":{"title":"Repair the failure"}},
{"id":"ready","type":"terminator","data":{"title":"Continue to rendering"}}
]}
edges={[
{"id":"draft-scan","source":"draft","target":"scan"},
{"id":"scan-decide","source":"scan","target":"decide"},
{"id":"decide-repair","source":"decide","target":"repair","label":"No"},
{"id":"repair-scan","source":"repair","target":"scan","label":"Re-scan"},
{"id":"decide-ready","source":"decide","target":"ready","label":"Yes"}
]}
direction="LR"
height={360}
/>

## 3. Inspect the rendered page

Verify what readers actually see and use, because a compiled site alone does not prove that intended content survived rendering. Preview the changed route with `pnpm run docs` to read the page and test its links, code examples, images, and interactive blocks, then run `pnpm run build` (the configured Docs build) and relevant tests, review the diff, and open the page's real route in the target renderer.

Compare headings, prose, lists, tables, asides, code, diagrams, links, images, and attachments against the source. Inspect both a narrow layout and a second page to verify that navigation labels or descriptions do not leak between pages, and confirm that unsupported or disabled source material remains recoverable instead of disappearing or appearing as raw JSON.

### Conversion, navigation, and assets

When conversion logic changes, check Markdown-to-value and value-to-Markdown round trips—covering heading levels, marks, list nesting, table cells, block attributes, diagrams, links, and attachments—and run browser tests when editor behaviour changes. Moving a file or changing its number prefix alters its URL, so update incoming links and check both the old and new routes; see [Tree handling](/consumer/1-usage/2-tree-handling/) for labels, ordering, and hidden pages.

Use the table below to verify structural and asset changes in local preview and again
after publication.

<table>
  <thead>
    <tr>
      <th>Change</th>
      <th>Check in preview and after publication</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Rename a page or folder</td>
      <td>Sidebar order, page URL, and incoming links</td>
    </tr>
    <tr>
      <td>Replace an image or attachment</td>
      <td>Relative source path, rendered image or download, and alt text</td>
    </tr>
    <tr>
      <td>Hide a page</td>
      <td>Sidebar and search visibility; access control at the web host if private</td>
    </tr>
    <tr>
      <td>Change `docs.base`</td>
      <td>Nested links and assets at the public base path</td>
    </tr>
  </tbody>
</table>

## 4. Check edits and publication

Where the host supports editing or publication, trace the page through its save, release,
and history workflows. Docs parses and renders content, whereas the host supplies routes,
assets, and registered custom blocks while controlling authentication, permissions,
persistence, publication, and asset storage—verify these boundaries against the host's
actual behaviour and records.

### Edits, release, and version history

For editable content, save, reload, and compare the page to verify that meaning is
preserved; if the host exposes revisions, confirm that concurrent edits cannot silently
overwrite one another, and confirm publication separately when supported. Deploy the
folder configured by `docs.out` using the site's normal release process,
noting that local preview verifies local rendering only.

When publishing is supported, verify authorised reads and writes, attachment ownership,
and published content and attachment URLs through the host's workflow, then inspect the
deployed route—checking the same navigation, links, and assets—and record the source
revision when available. Keep the page's evolution accessible without cluttering its
published body by tracking repository-backed Markdown or MDX pages with Git, and where a
remote host supports history, verify that revisions can be read and traced back to the
source material and decisions that produced them.

## 5. Record the result

Leave enough evidence for another author to reproduce the outcome from source material to
the published leaf, keeping all records outside the published leaf. The table below
defines the four audit records required to capture the draft's hierarchy, meaning, links,
blocks, artifact cleanup, routes, interaction states, attachment handling, and revision.

| Record             | What it establishes                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Source manifest    | Which sources and attachments were available, including failed collection or missing material. |
| Coverage audit     | How each distinct source point and explicit list item was handled in the leaf.                 |
| Generation trace   | How collected material and authoring decisions produced the final draft.                       |
| Publication record | Which source revision, deployed route, interaction states, and attachment URLs were inspected. |

### Validation log and limits

Every AI-generated page response must end with a concise Validation Log after the page
body, kept in the accompanying response or workflow record outside the content saved as
the published page. Report failed or unverified checks truthfully rather than checking
them off, and state any access or rendering limit concretely rather than claiming a check
you could not perform.

```md
### Validation Log

- [x] Sources: Required sources, explicit points, attachments, conflicts, and repair limits accounted for.
- [x] Structure & Content: Opening H2, heading hierarchy, meaning, expiring facts, links, and Australian English verified.
- [x] Syntax & Cleanup: Docs blocks, dividers, escaping, code fences, sanitisation, and tool artifact removal verified.
- [x] Rendering & Routes: Local preview, build diff, layout isolation, round trips, navigation, and assets inspected.
- [x] Edits & Publication: Host boundaries, saved edits, deployed \`docs.out\` route, permissions, and revision history checked.
- [x] Records & Limits: Audit records stored outside the leaf and any access or rendering limits stated concretely.
```

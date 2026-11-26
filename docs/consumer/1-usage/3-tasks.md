---
title: Tasks
description: Choose a Docs writing task and verify its result.
---

## Tasks

### Scope

Start with the reader's outcome. Source order and supplied folders do not define the page hierarchy.

Choose the scope:

- **Leaf:** read the page and its branch context.
- **Branch:** read its leaves, attachments, and relevant siblings.
- **Tree:** read every branch, leaf, and attachment.

Read the sources in scope and map distinct points to their canonical pages. Use [Tree](/consumer/1-usage/0-tree/) for topology, [Leaf: Sources](/consumer/1-usage/1-leaf/#sources) for coverage, and [Blocks](/consumer/1-usage/2-blocks/) for block rules.

### Action

Choose one of these seven tasks. Each accordion uses the same **Purpose**, **Use when**, **Method**, and **Return** structure. Keep a source manifest, coverage map, and validation evidence in the work record when changing content.

===[Synthesise]

```mdx
**Purpose**

Merge selected points from several sources into a reader-led hierarchy without losing distinct information. Reconsider tree and leaf boundaries as part of the synthesis.

**Use when**

- Several leaves contribute to one reader outcome.
- The result needs a new order, rather than a list of summaries.

**Method**

Group source points by reader outcome and dependency. Assign each point to its canonical page and keep a trace to its source.

**Return**

A synthesis that preserves the selected source points and states any coverage gap.

**Example**

:::example[Synthesise source leaves]

Task: Synthesise selected first-page points. Sources: Get started; Tree; Leaf. Keep: Root leaf, numbered order, reader and outcome. Return: A two-sentence synthesis and source coverage.

:::

|||[Response]

**Result:** The three sources support a short home-page plan. Keep `docs/index.md`, numbered paths, and a clear reader outcome.

| 📚 Source point   | Where it appears | Status |
| ----------------- | ---------------- | ------ |
| 🏠 Home page      | Root leaf        | Kept   |
| 🔢 Numbered paths | Tree hierarchy   | Kept   |
| 🎯 Reader outcome | Page opening     | Kept   |

Together, these rows retain the three requested outcomes.

|||

:::
```

===

===[Convert]

```mdx
**Purpose**

Restructure one source for a new reader while preserving every point in scope. One source can become several leaves when its concepts serve different tasks.

**Use when**

- A source needs a different hierarchy or format.
- Its content stays, but its reading order changes.

**Method**

Reorder by the reader's task and split content only when concepts serve distinct outcomes.

**Return**

A converted excerpt or page with every in-scope point retained; name unresolved placement or coverage.

**Example**

:::example[Convert a bounded excerpt]

|||[Prompt]

Task: Convert a short excerpt from Get started. Scope: §1 Prepare and §5 Preview. Keep: Node.js and pnpm minimums; preview command and address. Reader: A new maintainer. Do not imply a full-page conversion.

|||

|||[Response]

**Result:** The bounded excerpt keeps both version minimums, the preview command, and its printed address. Its final route still needs choosing.

| 📚 Source point      | Where it appears | Status  |
| -------------------- | ---------------- | ------- |
| 🧰 Runtime minimums  | Prepare excerpt  | Kept    |
| 👀 Preview command   | Preview excerpt  | Kept    |
| ❓ Destination route | Publication plan | Unknown |

The excerpt is covered; choose its destination route before publishing.

|||

:::
```

===

===[Compare]

```mdx
**Purpose**

Match claims from two or more sources so the reader sees shared, unique, absent, and conflicting information. Compare their conceptual groupings too; different source boundaries may describe one task.

**Use when**

- A decision depends on what each source supports.
- Missing information matters as much as overlap.

**Method**

Compare each source's evidence and scope. Preserve conflicts and unknowns instead of resolving them by guesswork.

**Return**

The shared, unique, absent, and conflicting claims, with their sources and unknowns.

**Example**

:::example[Compare leaf workflows]

|||[Prompt]

Task: Compare Tree and Host integration. Question: Who supplies a leaf's route and content locally and in a hosted workspace? Report differences and unknowns.

|||

|||[Response]

**Result:** Both workflows produce a leaf route. Local Docs reads Markdown from the tree; a hosted workspace reads content through its adapter. Draft visibility depends on host policy and needs checking.

| 🧩 Claim            | 📘 Tree       | 📗 Host integration | Relation         |
| ------------------- | ------------- | ------------------- | ---------------- |
| 📄 Leaf content     | Markdown file | Adapter operation   | Different source |
| 🔗 Leaf route       | Tree path     | Host pathname       | Same outcome     |
| 🔐 Draft visibility | Not specified | Not specified       | Unknown          |

The route is common; content and draft visibility depend on the workflow.

|||

:::
```

===

===[Polish]

```mdx
**Purpose**

Improve wording and flow while keeping the source's facts, links, examples, and caveats. Reorder or regroup sections when the inherited hierarchy obscures the reader's task.

**Use when**

- The content is correct but difficult to read.
- The reader needs a clearer opening or sequence.

**Method**

For branch or tree work, first map the full scope and move each instruction to the leaf that owns its reader task. Then regroup the hierarchy and revise wording. Preserve every source point and update page and attachment links after path changes. A leaf-only wording pass does not polish its branch.

**Return**

Revised content that preserves facts, links, examples, and caveats, with remaining gaps or conflicts named.

**Example**

:::example[Polish a source paragraph]

|||[Prompt]

Task: Polish the opening paragraph of Leaf §Audience. Reader: A first-time Docs author. Keep: Reader identity, prior knowledge, reason for arriving, and next outcome. Change wording only.

|||

|||[Response]

**Result:** Lead with the reader and the next outcome. Keep the opening under Audience; no split is needed.

| 🔄 Source point    | Revised placement | Status |
| ------------------ | ----------------- | ------ |
| 👤 Reader identity | Opening sentence  | Kept   |
| 🧠 Prior knowledge | Opening sentence  | Kept   |
| 🎯 Next outcome    | Opening sentence  | Kept   |

The revision changes the opening while preserving its reader goal.

|||

:::
```

===

===[Trim]

```mdx
**Purpose**

Make a page compact by remapping its concepts and dependencies, then revising sections as a whole. Keep every distinct source point. Shortening sentences one by one can harm legibility.

**Use when**

- Repeated explanations make the page longer than its reader path requires.
- Sections overlap or an inherited outline scatters one idea.

**Method**

At branch or tree scope, map every leaf and attachment to the reader's journey:

1. Read every sister leaf or tree descendant in scope.
2. Compare their reader tasks and repeated explanations.
3. Assign each distinct point to its canonical leaf.
4. Rebuild the outline around reader tasks.
5. Record each point against the complete source inventory.

Keep setup steps in the setup leaf, not a subject-information leaf. Update links after path changes. A leaf-only review does not complete a branch or tree trim.

Merge repeated ideas, move details to their owner, remove filler and examples with no unique meaning, and reconsider leaf boundaries. Compare repeated explanations and procedures; choose one canonical home and link from other leaves. Keep workflow-specific material and unique examples. Check that the owning page still lets readers complete the task. Do not claim a tree-wide review after reading only headings or search snippets.

Before returning a trim, check metadata and filenames across the tree:

| 🔎 Field           | Rule                          | Scope                              |
| ------------------ | ----------------------------- | ---------------------------------- |
| 🏷️ Title           | At most 48 characters         | Every leaf                         |
| 📝 Description     | Unique; at most 85 characters | Every leaf                         |
| 📋 List item       | At most 75 visible characters | Every item, including nested items |
| 🔢 Navigation name | Numbered prefix               | Every tree, branch, and leaf       |
| 📎 Attachment      | `_` prefix, no number         | Every attachment                   |

Record the inventory and counts. Any violation leaves the trim incomplete.

Use one action for each reported candidate:

- **✂️ Cut:** remove redundant material with no unique meaning.
- **🪚 Trim:** remove surplus wording.
- **🔀 Merge:** combine repeated ideas or sections.
- **🔒 Preserve:** keep unique meaning.

Name where each source point survives. If asked to edit, apply the recommendations and link the revised leaf.

A short link cannot replace required task instructions. Keep unique meaning in reader-facing leaves. Compare each attachment with its destination leaves before cutting or merging. Move unique points to their canonical leaf. Use accordions to reveal complete optional procedures, never to abbreviate them.

**Return**

A compact page or hierarchy with every distinct source point assigned to its canonical leaf, plus the inventory and any unresolved gaps.

**Example**

:::example[Trim repeated guidance across a tree]

|||[Prompt]

Task: Trim the Tasks leaf after reading every leaf in Consumer. Compare Tasks with Leaf, Tree, Blocks, Get started, and nested block guides. Keep every distinct task check and workflow-specific requirement. Flag repeated hierarchy and block-selection guidance; retain one owner per rule. Return recommendations only; do not edit sibling leaves.

|||

|||[Response]

**Result:** Leaf owns reader and outcome guidance; Blocks owns block selection. Keep source conflicts and Local/Hosted workflow differences where they affect the task.

| 🧩 Finding   | 🔎 Evidence         | ✂️ Action | 🔒 Keep                  |
| ------------ | ------------------- | --------- | ------------------------ |
| 🧭 Hierarchy | Tasks, Leaf, Tree   | Merge     | One hierarchy owner      |
| 🧱 Blocks    | Tasks, Leaf, Blocks | Merge     | One block reference      |
| 📚 Sources   | Tasks and Leaf      | Trim      | Conflicts and gaps       |
| 🔐 Workflows | Tasks, Tree, Host   | Link      | Local/Hosted differences |

The revised guide keeps workflow differences and gives each shared rule one owner.

|||

:::
```

===

===[Critique]

```mdx
**Purpose**

Review whether a leaf or tree teaches its reader, covers its sources, follows a clear hierarchy, and renders correctly. Critique is read-only. Inspect the complete requested scope and relevant guidance before drawing conclusions. If a source, route, or state cannot be inspected, report that limit; unchecked work cannot pass.

**Use when**

- A page or tree may be inaccurate, hard to use, poorly grouped, or repetitive.
- Evidence-backed findings are needed before editing.

**Method**

For a branch or tree, inspect every descendant page and relevant attachment. Trace each useful source point, explanation, procedure, example, condition, expected result, and caveat to the page where it is taught. Treat omitted attachment content, links used instead of teaching, and summaries that replace required steps as coverage failures. Keep source maps and gaps in the work record, not in published pages.

For learning content, read the rendered page as a beginner. Check that concepts, terms, symbols, prerequisites, causes, and boundary cases are explained before use. Test a new problem that combines the taught ideas. A task prompt or an attachment link does not count as teaching.

Read from top to bottom. Check that each sentence belongs under its heading and advances the reader's next question. Confirm the title names the subject or task, the description states the outcome, and the page stays within its named scope. Check that concepts appear before dependent ideas and examples explain the nearby concept. Look for duplicate or missing explanations, unexplained terms, prose walls, verbose or weak headings, and pages that depend on one presentation form. Review headings in parent context and whether each leaf earns its place with a specific reader outcome.

Inspect every existing tab group, then scan the scope for other methods, algorithms, versions, or configurations that answer the same question. Use tabs for complete parallel options; keep shared facts and sequential follow-on concepts outside. Reject summary-only tabs, whole-leaf tabs, and tabs that split an option's lesson. Use accordions only for optional, self-contained peers of the same kind; keep essential teaching in the normal reading path.

Match blocks to the relationship: real lists for parallel facts or steps, Nodes for flow, dependencies, hand-offs, or state, tables for shared comparison fields, and images only when their visual details teach. Check that diagrams supplement the prose, Nodes data parses and renders as a diagram, code and examples stay focused, and callouts do not dominate the page. For learning pages, omit practice questions by default; when the reader goal requires a quiz, keep its authored bank in sibling `quiz.json` with `title`, `prompt`, and `answer` Markdown strings. Check that the static page validates and presents the bank in its Quiz dialog, or that the host supplies the parsed bank as `authoredQuiz`. The separate `<Quiz />` generator requires a configured host generator. Do not scatter questions through the lesson or put them in accordions.

Check rendered blocks and presentation together. Verify image crops, specific alt text, hidden captions, links, attachments, and every tab or accordion in its open state. Inspect the full page at 1280 × 800 and a narrow width. Report page length only when the default view exceeds 9,600 px. For table examples containing literal pipes, check that the pipes do not split the table.

Use a fresh reviewer with no conversation history for an independent learning-tree critique when available. Give them the complete scope, readable sources, rendered pages, and applicable authoring rules without priming them with suspected defects or prior findings. Ask them to explain the concepts and solve a difficult unfamiliar problem using only the pages. If no independent reviewer is available, disclose that and perform a cold read yourself.

**Return**

Return only direct, unstructured prose: no headings, bullets, numbered findings, tables, templates, checklists, rubrics, or JSON. Tell reviewers: “Return only your own direct, unstructured prose. Do not use headings, bullets, numbered findings, tables, templates, checklists, rubrics, or JSON.” Do not include a response format or prior findings in their assignment; reject any structured response in full and request a fresh review. Describe what the reader learns, where understanding breaks, and how to repair each material issue, with source and rendered evidence. Do not score unless asked or invent findings. If no actionable issues remain, say so and name the inspected scope. After repairs, repeat with a fresh reader until no actionable issue remains. Do not run tests or Quality suites during critique.
```

===

===[Parity]

```mdx
**Purpose**

Find the first point where source meaning differs from what the reader sees. Start with one affected page and one concrete symptom; establish whether the page uses a local site or hosted workspace.

**Use when**

- Content, metadata, assets, or layout differ from their expected rendered result.
- A migration or shared UI change may have altered the source-to-page path.

**Method**

Record the expected source and observed result. Check the first relevant boundary: source and metadata for wrong labels or missing text; normalized content and renderer for missing or raw blocks; attachment ownership and URL for missing media; loaded package, CSS, theme, and viewport for layout differences. The earliest meaning mismatch owns the defect.

Confirm the repository, branch, route, environment, exact package artifact, and comparison baseline. Inspect the current source and baseline rather than relying on memory or a new export. Include adjacent assets and legacy sidecars when they may contain omitted material. Report inaccessible or unpublished records as unknown.

Trace the actual path in order. On a local site, follow Markdown and assets through catalog and route generation to Astro output and the rendered DOM; use the [Development guide](/developer/repository/development/) for build stages. In a hosted workspace, follow the remote record and attachments through the host adapter and Docs model to the renderer; use [Host integration](/developer/component/host-integration/) for adapter responsibilities. Keep source positions or stable keys with rendered elements, compare meaning and dependencies rather than counts, and open controls before deciding content is absent.

Use these checkpoints in order to locate the earliest meaning mismatch:

| 🧭 Stage    | 🔎 Compare                                       |
| ----------- | ------------------------------------------------ |
| 📄 Source   | Text, headings, marks, tables, links, and assets |
| 🗂️ Catalog  | Leaf identity, metadata, and route               |
| 🔄 Model    | Normalized content and block attributes          |
| 🧱 Renderer | Visible structure and interaction state          |
| 🌐 Host     | Permissions, persistence, and asset access       |

Equal counts can conceal substituted content. Open controls and compare their contents with the source before deciding that material is absent.

Hold the fixture and package, theme and viewport, and interaction state constant. Use DOM evidence with screenshots. For hosted pages, distinguish host-owned persistence, permissions, identity, routes, and asset URLs from shared Docs navigation, rendering, and controls. Reproduce the smallest useful case and collect evidence at each adjacent stage before changing code.

Fix the earliest incorrect boundary and preserve unsupported source values until their meaning and recovery path are clear. After repair, reopen the same route and state and repeat the comparison. Check both Markdown-to-value and value-to-Markdown paths for conversion changes; check affected host routes and responsive states for shared UI changes. Use the relevant repository verification guidance when a code change requires a suite.

**Return**

Report the symptom, first divergent boundary, evidence, repair or proposed change, and any source or state that remains unchecked.

Keep source manifests, coverage maps, and unresolved boundaries in the work record outside reader-facing pages. Do not describe an unchecked source or rendered state as passing.
```

===

## Workflow

When working with agents adhere to this workflow:

1. Name the reader and intended result.
2. Map source concepts and dependencies.
3. Choose leaves that follow the reader's path.
4. Track every distinct source point.
5. Validate the completed work.

:::caution[Keep the source boundary]

Do not remove distinct source points or resolve conflicts by guessing. Keep missing evidence and draft pages in the work record, not a published leaf.

:::

Treat a reported defect as evidence of a broken rule. Find the source or shared component that owns it, fix that cause, then check analogous pages and states. Preserve the requested outcome and verify the reported case again.

## Validation

Use this table to check each part of the work and record evidence for anything that remains unresolved.

| ✅ Category                       | Checks                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧭 Content and hierarchy          | • Confirm source coverage with [Tree](/consumer/1-usage/0-tree/) and [Leaf](/consumer/1-usage/1-leaf/).<br>• Follow [Blocks](/consumer/1-usage/2-blocks/) and the relevant [audience profile](/consumer/2-audience-profiles/).<br>• Check that each concept, section, and example belongs.                                                                             |
| 🖥️ Rendered result                | • Read the whole page at desktop and narrow widths.<br>• Open every tab and accordion.<br>• Check images, captions, links, routes, and attachments render.                                                                                                                                                                                                             |
| 🛠️ Implementation and publication | • For legacy content, [migrate](/developer/repository/content-migration/) but keep source recoverable.<br>• For conversion changes, verify md-to-value and back trips.<br>• In local Docs, build and open changed routes and assets.<br>• In a hosted workspace, verify access, save and reload, then inspect the published route and revision history when available. |
| 🧾 Evidence and work record       | • Record routes and states inspected, unresolved sources, and incomplete checks; never report unchecked work as passing.<br>• Keep work records outside published pages and name uninspected sources or states plainly.                                                                                                                                                |

Use unresolved checks to state the limits of the result; a successful local render does not establish hosted publication or access.

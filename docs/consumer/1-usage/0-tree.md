---
title: Tree
description: Organise trees, branches, leaves, and their attachments in local and hosted Docs.
---

## Hierarchy

A Docs tree leads readers from a subject to a document. A tree may contain branches and direct leaves; each branch may contain leaves only. **Never put a branch inside another branch.** A leaf is either a Markdown file or a folder containing its page as a direct `index.md`. Design the hierarchy around the reader's questions before creating nodes. Treat supplied folders, slide decks, and lecture numbers as source labels, not approved navigation groups. Split a source when it serves two tasks; combine sources when they serve one. Reconsider the tree whenever new material changes those boundaries.

**Branch limit: eight direct leaves maximum.** Count every leaf, including a subject-information leaf. If a branch would exceed eight, regroup or merge only concepts that form one coherent learning path; never drop source material or force unrelated goals together to meet the limit. A leaf may use tabs only for related, parallel topics readers may compare, and accordions only for repeated optional peer items. Neither block is a substitute for a heading hierarchy or a way to conceal a whole lesson. See the [University profile](/consumer/2-audience-profiles/3-university/) for lesson and subject-information patterns.

This topology has only one grouping level: branches group leaves, and leaves do not contain navigable pages. Do not propose another branch below a branch to create conceptual categories. When a branch's direct leaves need more conceptual structure, show that reader path in a direct landing leaf with concise headings, links, a table, or a diagram. Split leaves by reader goal only when each resulting page can teach its subject coherently.

When a task covers a branch or tree, read the whole requested scope and its relevant sibling leaves before changing it. Rebuild the information map around the reader's overall journey: move content to the leaf that owns its task, group related material, and split or merge leaves when that improves the path. Do not append material to a broad overview just because it arrived there, and do not preserve source-week groupings when they put instructions in the wrong leaf.

| 🧭 Level  | Purpose               | Contains                     |
| --------- | --------------------- | ---------------------------- |
| 🌳 Tree   | Top-level subject     | Branches and direct leaves   |
| 🪾 Branch | Related documents     | Direct leaves only           |
| 🍁 Leaf   | One readable document | Markdown file or page folder |

:::example[Rebuild lecture groups]

Three lectures arrive as separate slide decks. Lecture 1 covers setup and editing; lectures 2 and 3 together explain one publishing task. Keep their distinct claims, but organise the reader's path by outcome:

| 📚 Source material    | Reader task | Docs leaf      |
| --------------------- | ----------- | -------------- |
| 🧰 Lecture 1: setup   | Prepare     | Get started    |
| ✏️ Lecture 1: editing | Edit        | Edit pages     |
| 🚀 Lectures 2 and 3   | Publish     | Publish a site |

The agent-side source-to-leaf map records coverage; the sidebar follows the reader's tasks rather than the lecture boundaries.

:::

|||[Local]

1. Keep `docs/index.md` as the root leaf.
2. Create a tree folder under `docs/`.
3. Create numbered folders for branches and leaves. Put branches directly in the tree; put leaves directly in the tree or directly in a branch. Do not nest branches.
4. A leaf may be a Markdown file or a folder. If it is a folder, put its page in that folder as `index.md`.
5. Preview the sidebar and open each leaf's route.

```text
docs/
  index.md
  0-guides/
    0-setup/
      index.md
    1-publish/
      index.md
```

In a local tree, a leaf folder is any numbered folder that contains its page as `index.md` directly inside it, whether it sits under a branch or directly under the tree. A numbered folder without a direct `index.md` is a branch. **A branch can have only one lower level: leaves.** A branch is a navigation group, not a page; validate the direct leaf routes rather than expecting the branch URL to render. The table of contents does not show leaves hidden inside a branch within a branch. **Every leaf folder must contain its page as `index.md` directly inside that folder.** The table of contents discovers the leaf from this exact path. Put attachments beside `index.md` and prefix them with `_`. **Never put a page in a subfolder inside a leaf folder.** Nested pages may build as routes but are omitted from the table of contents, so they appear invisible in navigation. If a topic needs its own page, make it a sibling leaf with its own numbered folder and direct `index.md`; do not nest it under another leaf. For example, use `docs/0-guides/0-setup/index.md` and `docs/0-guides/1-install/index.md`, not `docs/0-guides/0-setup/0-install/index.md`.

Prefix every tree, branch, and leaf name with a number so the complete hierarchy has an explicit reading order. Numbered path segments set order and remain in URLs. Check every sibling level, not only the folder currently being edited.

|||

|||[Hosted]

1. Load hierarchy, routes, and permissions from the [host adapter](/developer/component/host-integration/).
2. Choose **Add tree** in the tree selector if you have write access.
3. Add branches or direct leaves to that tree.
4. Reload the sidebar and open a leaf to verify the host saved it.

The sidebar shows the hierarchy returned by the host.

|||

## Attachments

Trees, branches, and leaves can each own attachments. Put a resource at the level whose readers need it. A node's attachment collection differs from a link or embed in a leaf's body.

Attachments are source material for creating the tree, never a substitute for its content. Read every relevant attachment and put all its useful information in the appropriate reader-facing pages, bar none: concepts, explanations, procedures, examples, every task and subtask, prompts, constraints, expected results, and caveats. A page may link to an attachment as an optional original or provenance record, but must never defer to it for omitted information. Keep source inventories, coverage maps, unresolved source gaps, and audit notes in the agent's accompanying report or workflow record; never publish them inside a reader-facing leaf. Report inaccessible sources there and do not claim complete coverage.

For a university tree, create one separate Markdown attachment for the readable content of every Canvas module item and every Ed lesson, beside its canonical owner leaf, and attach each supplied file to that same leaf as well. Preserve the actual page body, task prompts, instructions, constraints, and relevant links; a module title, URL, screenshot of a shell, or short summary is not the module's content. Assign each item to a leaf based on the concepts it teaches or the reader task it supports, not the module's original order. If an item is inaccessible or has no body, keep a separate diagnostic capture with its exact title, source URL or identifier, access result, and missing-content reason. That diagnostic records an unresolved blocker; it does not count as a completed content attachment. Report the full module/lesson-to-leaf map and every blocker to the user outside the tree.

Before exporting, copying, or attaching university material, inspect the course's current use and redistribution terms. Do not reproduce or communicate course pages, slides, downloads, or exports when the course prohibits it without permission. If prior written permission is required, stop that copy, report the restriction and the affected sources as blockers, and continue only with material the user is authorised to share (such as their own notes or institution-approved resources). A source-coverage requirement does not override a source's access or redistribution restrictions.

You may clean local attachments to reduce noise before using them: strip navigation and scrape boilerplate from captured web pages, or convert HTML files to Markdown. Compare each cleaned copy with its original and retain all substantive information and provenance. Keep originals when needed to audit the transformation. Cleaned attachments remain source material; integrate their information into the reader-facing leaves rather than making readers consult the files.

For learning trees, order concepts by prerequisite and reader understanding, then group related concepts under concise numbered branches. Reduce leaf count by merging concepts only when one page can teach them coherently; do not create a leaf for every source document or week. Course weeks, source-document order, and assignment order can inform context, but do not define the navigation by themselves. Each learning leaf must teach its named concept before its exercises. Keep worked examples in the documented example aside. By default omit practice questions; if a quiz is needed, save it as `quiz.json` beside the leaf’s `index.md`; the static Docs site validates the JSON and presents it through a page-level Quiz button and dialog. Use task accordions for repeated optional procedural tasks only when their block criteria are met.

For local repositories, prefix every attachment and other non-navigation file in a tree with `_` and do not number it (for example, `_pointer-examples.pdf`). Number prefixes belong only to tree, branch, and leaf names. Keep this filename rule in the tree inventory and verify every file, including nested assets, after moves and renames.

| 🧭 Owner  | Resource scope           |
| --------- | ------------------------ |
| 🌳 Tree   | Shared across a subject  |
| 🪾 Branch | Shared across a group    |
| 🍁 Leaf   | Specific to one document |

### Add

Choose the owner before adding a resource.

|||[Local]

1. Put a shared file in its tree or branch folder.
2. Put a leaf-specific file beside that leaf folder's `index.md`.
3. Link to it from every leaf that needs it.
4. Build the site and open the published asset URL.

For example, a diagram beside a leaf's `index.md` can be linked with a same-folder relative path:

```md
![How a Docs edit reaches the host](./_save-flow.png)
```

Use relative paths. Local files are repository assets, not hosted attachment records.

|||

|||[Hosted]

1. Open **Manage attachments** on a tree or branch.
2. Select its index node or a descendant leaf.
   - On a leaf, **Files → New** can also upload a file.
3. Choose a type from the **Add Attachment** menu.
4. Upload a file or enter a URL, as the type requires.
5. Reload and confirm the owner and destination.

| 📎 Choice   | Use                            | Result                      |
| ----------- | ------------------------------ | --------------------------- |
| 🍁 Leaf     | Relate a Docs page.            | Page reference              |
| 📄 Document | Provide a download.            | Upload or imported document |
| 🖼️ Image    | Provide a diagram.             | Upload or imported image    |
| ▶️ YouTube  | Relate a video.                | Video reference             |
| 🌍 Website  | Bring a site into Docs.        | New leaf from its content   |
| 📚 TsDocs   | Relate a TypeScript reference. | Reference link              |
| 📦 Other    | Keep another file or URL.      | File or remote reference    |

The host also recognises `pdf`, `file`, `doc`, and `other` categories. These are underlying types, not extra menu choices. **Website** creates a leaf, so check its title, route, and source. The host supplies storage and authorised URLs.

|||

### Manage

A move changes attachment ownership. A body link or embed alone does not.

|||[Local]

1. Open the owning folder and identify the file and its links.
2. Rename, move, or remove the file in the repository.
3. Update relative paths in affected leaves.
4. Rebuild and open the links and asset URLs.

When exporting, copy source files with the assets they use.

|||

|||[Hosted]

1. Open **Manage attachments** for the owning tree or branch.
   - Open a leaf's **Files** menu for its file actions.
2. Select an item to open, download, rename, or remove it.
3. Drag it onto another node to move its ownership.
4. Reload and confirm the destination and authorised URL.
5. To show it inline, choose **Add attachment** in the editor.

![The editor's Add attachment choice](./2-blocks/insert-attachment.png)

This screenshot shows inline insertion at step 5, not the tree attachment manager. The [Embeds and custom blocks section](/consumer/1-usage/2-blocks/#embeds-and-custom-blocks) explains its visual controls. Review downloaded attachments with exported source before reuse.

|||

## Operations

Choose an operation by its effect on the hierarchy. Complete one numbered path before starting the next.

===[Create and label]

Add the needed nodes first, then name them.

| 🧭 Operation | Level              | Result                 |
| ------------ | ------------------ | ---------------------- |
| ➕ Add       | Tree, branch, leaf | New navigation node    |
| 🏷️ Name      | Tree, branch, leaf | Updated label or title |

|||[Local]

**Add**

1. Create a tree folder under `docs/`.
2. Create a numbered folder directly inside it for each leaf.
3. Put the page in that leaf folder as `index.md`, beside any underscore-prefixed attachments.
4. Put frontmatter before the leaf's first H2.
5. Preview the tree and open the new route.

**Name**

1. Set leaf `title` and `description` in frontmatter.
2. Add `sidebar.label` only for a shorter navigation label.
3. Rename a tree or branch folder to change its label.
4. Update links if the path changed.

```md
---
title: Install Acme
description: Set up your first Acme project.
sidebar:
  label: Install
---

## Prepare
```

|||

|||[Hosted]

**Add**

1. Choose **Add tree** from the tree selector.
   - It starts with a **General** branch and an untitled leaf.
2. Choose **Add branch** from the tree menu if needed.
3. Choose **Add leaf** from the branch menu.
4. Title, edit, and save the leaf.
5. Reload and open its route.

**Name**

1. Choose **Rename tree**, **Rename branch**, or **Rename leaf**.
2. Edit the leaf's **Description** separately if needed.
3. Reload and check label, route, and inbound links.

The standard sidebar uses the leaf title as its label.

|||

===

===[Arrange and reuse]

Order and move nodes before duplicating or merging leaves.

| 🧭 Operation | Level              | Result                   |
| ------------ | ------------------ | ------------------------ |
| 🔢 Order     | Tree, branch, leaf | New sibling order        |
| ↔️ Move      | Leaf or branch     | New parent or position   |
| 📋 Duplicate | Leaf               | Copy or shared reference |
| 🔀 Merge     | Leaves             | One destination leaf     |

|||[Local]

**Order**

1. Prefix every tree, branch, and leaf name with a number.
2. Prefix every attachment with `_`; leave it unnumbered.
3. Rebuild and check order at every sibling level.
4. Update page links and asset references after path changes.

`2-publish/` sorts before `10-reference/`. Prefixes disappear from labels but remain in URLs. Do not use `order` or `sidebar.order` in frontmatter.

**Move**

1. Move the whole numbered leaf folder, keeping `index.md` and its attachments together.
2. Update inbound links and relative asset paths.
3. Rebuild and open affected routes.

**Duplicate**

1. Copy the complete leaf folder to a new numbered name.
2. Keep `index.md` and its attachments together in the copied folder.
3. Revise the page title, description, body, and links.
4. Check its relative asset paths.

**Merge**

1. Combine distinct content in reading order.
2. Keep the assets needed by the merged leaf.
3. Update links and remove the superseded leaf folder.
4. Rebuild and check the destination.

|||

|||[Hosted]

**Order**

1. Drag a leaf or branch by **Reorder item**.
2. Drop it before or after a sibling.
3. Reload and check the order.

The tree selector has no drag handle; the host must return trees in the intended order.

**Move**

1. Drag a leaf onto its destination branch or beside a leaf there.
2. Reload and check its route and attachments.

Branches reorder within their tree. The sidebar cannot move them across trees.

**Duplicate**

1. Choose **Duplicate leaf**.
2. Select **By content** for a copy or **By reference** when supported.
3. Give it a distinct title and check its route.

**Merge**

1. Select two or more leaves with Command or Shift.
2. Choose **Merge leaves** and name the result.
3. Review headings, links, and attachments.

The first leaf in sidebar order becomes the destination. The others are removed.

|||

===

===[Hide, remove, and export]

Check routes and attachments before concealing, deleting, or copying a node.

| 🧭 Operation | Level              | Result                  |
| ------------ | ------------------ | ----------------------- |
| 🙈 Hide      | Leaf               | Removed from navigation |
| 🗑️ Remove    | Tree, branch, leaf | Deleted node            |
| 📦 Export    | Tree, branch, leaf | Downloaded source       |

|||[Local]

**Hide**

1. Set `sidebar: { hidden: true }` in leaf frontmatter.
2. Rebuild and check navigation and search.
3. Protect private content at the web host.

The direct URL still works.

**Remove**

1. Delete the complete leaf folder.
2. Keep `docs/index.md` as the root leaf.
3. Update inbound links and rebuild.

**Export**

1. Copy the leaf folder, including its `index.md`, from `docs/`.
2. Copy nearby attachments with the same relative paths.
3. Open exported links before reuse.

|||

|||[Hosted]

**Hide**

1. Have the host omit the leaf from its supplied tree.
2. Apply search and access rules in the host.
3. Check the direct route with a reader account.

The standard sidebar has no **Hide leaf** action. Omitting a node does not block its route.

**Remove**

1. Choose **Delete leaf**, **Delete branch**, or **Delete tree**.
2. Review the confirmation.
3. Check affected links, routes, and attachments.

**Export**

1. Choose **Download leaf**, **Download branch**, or **Download tree**.
2. Inspect downloaded source and attachments.
3. Open its links before reuse.

|||

===

## Check the result

Follow the changed path as a reader. Check the tree, branch, leaf, and attachments at each level.

|||[Local]

1. Build the site and check sidebar order and direct routes.
2. For every local leaf folder, verify `index.md` is directly inside it and there are no nested page folders; then check each leaf appears in the table of contents.
3. Open links and asset URLs from affected leaves.
4. Confirm hidden leaves are absent from navigation and search.
5. Check direct URLs and the web host's access rules.

|||

|||[Hosted]

1. Reload the workspace with editor access.
2. Inspect changed nodes and attachment counts.
3. Open representative files and references as a reader.
4. Confirm the host denies content without reader access.

|||

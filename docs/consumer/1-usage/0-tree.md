---
title: Tree
description: Organise trees, branches, leaves, and their attachments in local and hosted Docs.
---

## Hierarchy

Docs groups pages into trees, branches, and leaves. This hierarchy determines what can be nested and linked.

Design the hierarchy around reader questions. Treat supplied folders, slide decks, and source order as evidence, not approved navigation groups. Split a source when it serves different reader tasks; combine sources when they serve one coherent outcome.

A branch may contain at most eight direct leaves. Count every leaf. If the limit is exceeded, regroup related concepts without dropping material or combining unrelated goals. See the [University profile](/consumer/2-audience-profiles/3-university/) for course-specific organization.

Use this table to distinguish the three navigation levels:

| 🧭 Level  | Purpose           | Contains                     |
| --------- | ----------------- | ---------------------------- |
| 🌳 Tree   | Top-level subject | Branches and direct leaves   |
| 🪾 Branch | Related pages     | Direct leaves only           |
| 🍁 Leaf   | One readable page | Markdown file or page folder |

The table shows the allowed nesting: branches contain leaves, and leaves cannot contain navigable pages. Use a direct leaf when a branch needs an introduction. Split a leaf only when each page can serve a clear reader goal.

:::example[Rebuild source groups]

Three source documents cover setup, editing, and one publishing task. Keep their facts, but group them by the reader's work:

| 📚 Source              | Reader task | Docs leaf      |
| ---------------------- | ----------- | -------------- |
| 🧰 Setup material      | Prepare     | Get started    |
| ✏️ Editing material    | Edit        | Edit pages     |
| 🚀 Publishing material | Publish     | Publish a site |

The coverage map tracks source points; the sidebar follows the reader's tasks.

:::

Local and hosted creation steps are under [Operations](#operations). The two storage models share the same tree and leaf hierarchy.

## Attachments

Trees, branches, and leaves can own files. Choose the owner whose readers need the resource. A link or embed in page text does not change ownership.

A page must include the useful content from its sources. Use [Leaf: Sources](/consumer/1-usage/1-leaf/#sources) for coverage; keep maps and missing-source notes in the work record. For university-source access, reuse, and placement rules, follow the [University profile](/consumer/2-audience-profiles/3-university/).

In local repositories, prefix attachments with `_` and do not number them. Put leaf-specific files beside its `index.md`; put shared files at the owning tree or branch. Keep the names and paths with the page when moving or exporting it.

Choose an attachment owner by scope:

| 🧭 Owner  | Resource scope          |
| --------- | ----------------------- |
| 🌳 Tree   | Shared across a subject |
| 🪾 Branch | Shared across a group   |
| 🍁 Leaf   | Specific to one page    |

Choose the narrowest owner that serves every intended reader. Store a page-specific resource with its leaf.

### Add

Choose the owner before adding a resource.

|||[Local]

1. Save the file at its owning level.
2. Link each reader-facing use to that file.
3. Build and open the asset URL.

For example, a diagram beside a leaf's `index.md` can be linked with a same-folder relative path:

```md
![How a Docs edit reaches the host](./_save-flow.png)
```

Use relative paths. Local files are repository assets, not hosted attachment records.

|||

|||[Hosted]

1. Open **Manage attachments** on a tree or branch.
2. Select the owner node.
   - On a leaf, **Files → New** can also upload a file.
3. Choose a type from the **Add Attachment** menu.
4. Upload a file or enter its URL.

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

1. Rename, move, or remove the file in its owning folder.
2. Update relative paths in affected leaves.

When exporting, copy source files with the assets they use.

|||

|||[Hosted]

1. Open **Manage attachments** for the owning tree or branch.
   - Open a leaf's **Files** menu for its file actions.
2. Select an item to open, download, rename, or remove it.
3. Drag it onto another node to change its owner.
4. Reload and confirm its new location.
5. To show it inline, use the editor's **Add attachment** control.

Use the [Embeds guide](/consumer/1-usage/2-blocks/#embeds) for rendering details. Review downloaded attachments with exported source before reuse.

|||

## Operations

Choose an operation by its effect on the hierarchy. Complete one numbered path before starting the next.

===[Create and label]

Add the needed nodes first, then name them.

| 🧭 Operation | Level              | Result                 |
| ------------ | ------------------ | ---------------------- |
| ➕ Add       | Tree, branch, leaf | New navigation node    |
| 🏷️ Name      | Tree, branch, leaf | Updated label or title |

The level column shows where the action applies. Use the tabs for local folders or hosted controls.

|||[Local]

**Add**

1. Create the tree folder under `docs/`.
2. Add a numbered leaf folder with `index.md`.
3. Put its attachments beside `index.md`.
4. Add frontmatter, then preview the route.

**Name**

1. Set leaf `title` and `description` in frontmatter.
2. Use `sidebar.label` only for a shorter label.
3. Rename a tree or branch folder to change its label.

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
2. Add a branch if needed, then choose **Add leaf**.
3. Title and save the leaf.

**Name**

1. Choose **Rename tree**, **Rename branch**, or **Rename leaf**.
2. Edit a leaf's **Description** separately.

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

The result column describes what each operation changes. Use the tabs for local folders or hosted controls.

|||[Local]

**Order**

1. Number tree, branch, and leaf names; prefix attachments with `_` only.
2. Rebuild to check sibling order.
3. Update page and asset links after path changes.

`2-publish/` sorts before `10-reference/`. Prefixes disappear from labels but remain in URLs. Do not use `order` or `sidebar.order` in frontmatter.

**Move**

1. Move the whole numbered leaf folder with its attachments.
2. Update inbound links and relative asset paths.

**Duplicate**

1. Copy the complete leaf folder to a new numbered name.
2. Revise its title, description, body, and links.

**Merge**

1. Combine distinct content in reader order and keep needed assets.
2. Update links and remove the superseded folder.

|||

|||[Hosted]

**Order**

1. Drag **Reorder item** and drop it before or after a sibling.

The tree selector has no drag handle; the host must return trees in the intended order.

**Move**

1. Drag a leaf onto its destination branch or beside a leaf there.

Branches reorder within their tree. The sidebar cannot move them across trees.

**Duplicate**

1. Choose **Duplicate leaf**.
2. Select **By content** for a copy or **By reference** when supported.
3. Give the copy a distinct title.

**Merge**

1. Select leaves with Command or Shift, then choose **Merge leaves**.
2. Name the result and review its headings, links, and attachments.

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

Hide removes a leaf from navigation. Remove deletes a node; export copies its source.

|||[Local]

**Hide**

1. Set `sidebar: { hidden: true }` in leaf frontmatter.
2. Protect private content at the web host.

The direct URL still works.

**Remove**

1. Delete the complete leaf folder.
2. Keep `docs/index.md` as the root leaf and update inbound links.

**Export**

1. Copy the leaf folder and its nearby attachments from `docs/`.
2. Open exported links before reuse.

|||

|||[Hosted]

**Hide**

1. Have the host omit the leaf from its supplied tree.
2. Apply search and access rules in the host.

The standard sidebar has no **Hide leaf** action. Omitting a node does not block its route.

**Remove**

1. Choose **Delete leaf**, **Delete branch**, or **Delete tree**.
2. Review the confirmation before deleting.

**Export**

1. Choose **Download leaf**, **Download branch**, or **Download tree**.
2. Inspect its source and attachments before reuse.

|||

===

## Check the result

Follow the changed path as a reader. Check the tree, branch, leaf, and attachments at each level.

|||[Local]

1. Build the site and open changed routes and asset links.
2. Confirm each leaf has a direct `index.md` and no nested page folders.
3. Check sidebar order, table of contents, and hidden leaf search behavior.
4. Check direct URLs and host access rules.

|||

|||[Hosted]

1. Reload the workspace with editor access.
2. Inspect changed nodes and open files as a reader.
3. Confirm access rules on a direct route.

|||

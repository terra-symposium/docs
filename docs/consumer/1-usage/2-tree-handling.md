---
title: Tree handling
description: Add, name, order, move, and remove leaves in a local Markdown site or hosted workspace.
---

## Structure

The sidebar follows **tree → branch → leaf**. A local site reads that hierarchy from `docs/`; a hosted workspace reads it from the application's [host adapter](/developer/component/host-integration/). Choose the tab for your [editing workflow](/consumer/0-configuration/0-install/#2-configure-storage). Hosted controls require write permission.

A **tree** is the top navigation level, a **branch** groups related leaves, and a **leaf** is one document. In local Markdown, tree and branch names come from folders; each leaf comes from a Markdown file. In a hosted workspace, the host supplies the same hierarchy.

<Nodes
nodes={[
{"id":"tree","type":"origin","data":{"title":"Tree","description":"Top navigation level"}},
{"id":"branch","type":"process","data":{"title":"Branch","description":"Related documents"}},
{"id":"leaf","type":"terminator","data":{"title":"Leaf","description":"One document"}}
]}
edges={[
{"id":"tree-branch","source":"tree","target":"branch"},
{"id":"branch-leaf","source":"branch","target":"leaf"}
]}
/>

## Operations

===[Add]

|||[Local]

1. Create tree and branch folders under `docs/`. Keep `docs/index.md` as the only leaf at the root.
2. Add one `.md` or `.mdx` file per leaf. Put frontmatter before its first H2 heading.
3. Preview the site to check the sidebar. For example:

```text
docs/
  index.md
  0-guides/
    0-setup/
      0-install.md
      1-configure.md
```

|||

|||[Hosted]

1. Choose **Add tree** from the tree selector. It starts with a **General** branch and an untitled leaf.
2. Open the sidebar context menu and choose **Add branch** if needed.
3. Open a branch's context menu, choose **Add leaf**, then title, edit, and save it.

|||

===

===[Name]

|||[Local]

1. Set the leaf's `title` and `description` in frontmatter. Add `sidebar.label` only when its navigation label should be shorter:

```md
---
title: Install Acme
description: Set up your first Acme project.
sidebar:
  label: Install
---

## Prepare
```

2. Rename a tree or branch folder to change its label. Check links if its path changes.

|||

|||[Hosted]

1. Use **Rename leaf**, **Rename branch**, or **Rename tree** from the relevant context menu. The standard hosted sidebar uses the leaf title as its label.
2. Edit a leaf's **Description** field if needed.
3. Check links after a rename; the route may change.

|||

===

===[Order]

|||[Local]

1. Prefix tree folders, branch folders, and leaf filenames with numbers: `0-install.md`, `1-configure.md`, `2-publish.md`. Docs sorts numerically, so `2-publish.md` precedes `10-reference.md`.
2. Rebuild and check the order. Prefixes are hidden from labels but remain in URLs; update links after renumbering. Do not use `order` or `sidebar.order` in frontmatter.

|||

|||[Hosted]

1. Hover over a leaf or branch and drag its **Reorder item** handle before or after a sibling.
2. Check the new order after refresh. To reorder trees, the application must return them in the desired order; the tree selector has no drag handle.

|||

===

===[Move]

|||[Local]

1. Move the Markdown file to the destination branch folder. Move a whole folder to relocate a branch.
2. Update links to changed routes and relative image paths inside moved leaves.

|||

|||[Hosted]

1. Drag a leaf's **Reorder item** handle onto another branch or beside a leaf in that branch.
2. Check the destination after refresh. Branches can be reordered within their tree; the sidebar does not move branches across trees.

|||

===

===[Duplicate]

|||[Local]

1. Copy the file to a new filename.
2. Change its title, description, body, links, and relative asset paths. The copy is independent.

|||

|||[Hosted]

1. Open **Duplicate leaf** in the leaf menu. Choose **By content** for an independent copy or **By reference** to point to the same leaf when the host supports it.
2. Give the new leaf a distinct title and check its route.

|||

===

===[Merge]

|||[Local]

1. Combine the distinct content into one file in reading order; keep the assets it needs.
2. Update inbound links and remove the superseded files.

|||

|||[Hosted]

1. Select two or more leaves with Command or Shift and choose **Merge leaves** from the selection menu.
2. Name the result. The first leaf in sidebar order becomes the destination; the others are removed.
3. Review headings, links, and attachments before publishing.

|||

===

===[Hide]

|||[Local]

1. Add `sidebar: { hidden: true }` in YAML frontmatter to omit the leaf from navigation and search.
2. Restrict private content at the web host; the hidden leaf's URL still works.

|||

|||[Hosted]

1. Have the application omit the leaf from the tree supplied to Docs; the standard sidebar has no **Hide leaf** action.
2. Apply search and access rules in the host. Omitting a tree entry does not block its route.

|||

===

===[Remove]

|||[Local]

1. Delete the leaf file or empty folder. Keep `docs/index.md` as the home leaf.
2. Update inbound links and rebuild.

|||

|||[Hosted]

1. Choose **Delete leaf**, **Delete branch**, or **Delete tree** from its context menu.
2. Review the confirmation, then check affected links and published routes.

|||

===

===[Attach]

|||[Local]

1. Keep assets beside their owning leaf.
2. Reference images by relative path, such as `![Editor toolbar](./0-install/editor-toolbar.png)`. Move assets with the leaf.

|||

|||[Hosted]

1. Open the leaf menu and choose **Files → New** to upload a file.
2. Use **Files** to open, rename, download, or remove it. The host supplies storage and authorized URLs.

|||

===

===[Export]

|||[Local]

1. Copy the leaf file or folder from `docs/` with its nearby assets.
2. Keep their relative paths together.

|||

|||[Hosted]

1. Choose **Download leaf**, **Download branch**, or **Download tree** from the relevant menu.
2. Review the downloaded source and attachments before reusing them.

|||

===

---
title: Tree handling
description: Add, name, order, move, and remove pages in a local Markdown site or hosted workspace.
---

## Structure

The sidebar follows **sections → groups → pages**. A local site reads that tree from `docs/`; a hosted workspace reads it from the application's [host adapter](/developer/component/host-integration/). Choose the tab for your [editing workflow](/consumer/0-configuration/0-install/#2-configure-storage). Hosted controls require write permission.

## Operations

===[Add]

|||[Local]

1. Create section and group folders under `docs/`. Keep `docs/index.md` as the only page at the root.
2. Add one `.md` or `.mdx` file per page. Put frontmatter before its first H2 heading.
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

1. Choose **Add section** from the section selector. It starts with a **General** group and an untitled page.
2. Open the sidebar context menu and choose **Add group** if needed.
3. Open a group's context menu, choose **Add page**, then title, edit, and save it.

|||

===

===[Name]

|||[Local]

1. Set the page's `title` and `description` in frontmatter. Add `sidebar.label` only when its navigation label should be shorter:

```md
---
title: Install Acme
description: Set up your first Acme project.
sidebar:
  label: Install
---

===

===[Prepare]
```

2. Rename a section or group folder to change its label. Check links if its path changes.

|||

|||[Hosted]

1. Use **Rename page**, **Rename group**, or **Rename section** from the relevant context menu. The standard hosted sidebar uses the page title as its label.
2. Edit a page's **Description** field if needed.
3. Check links after a rename; the route may change.

|||

===

===[Order]

|||[Local]

1. Prefix section folders, group folders, and page filenames with numbers: `0-install.md`, `1-configure.md`, `2-publish.md`. Docs sorts numerically, so `2-publish.md` precedes `10-reference.md`.
2. Rebuild and check the order. Prefixes are hidden from labels but remain in URLs; update links after renumbering. Do not use `order` or `sidebar.order` in frontmatter.

|||

|||[Hosted]

1. Hover over a page or group and drag its **Reorder item** handle before or after a sibling.
2. Check the new order after refresh. To reorder sections, the application must return them in the desired order; the section selector has no drag handle.

|||

===

===[Move]

|||[Local]

1. Move the Markdown file to the destination group folder. Move a whole folder to relocate a group.
2. Update links to changed routes and relative image paths inside moved pages.

|||

|||[Hosted]

1. Drag a page's **Reorder item** handle onto another group or beside a page in that group.
2. Check the destination after refresh. Groups can be reordered within their section; the sidebar does not move groups across sections.

|||

===

===[Duplicate]

|||[Local]

1. Copy the file to a new filename.
2. Change its title, description, body, links, and relative asset paths. The copy is independent.

|||

|||[Hosted]

1. Open **Duplicate page** in the page menu. Choose **By content** for an independent copy or **By reference** to point to the same leaf when the host supports it.
2. Give the new page a distinct title and check its route.

|||

===

===[Merge]

|||[Local]

1. Combine the distinct content into one file in reading order; keep the assets it needs.
2. Update inbound links and remove the superseded files.

|||

|||[Hosted]

1. Select two or more pages with Command or Shift and choose **Merge pages** from the selection menu.
2. Name the result. The first page in sidebar order becomes the destination; the others are removed.
3. Review headings, links, and attachments before publishing.

|||

===

===[Hide]

|||[Local]

1. Add `sidebar: { hidden: true }` in YAML frontmatter to omit the page from navigation and search.
2. Restrict private content at the web host; the hidden page's URL still works.

|||

|||[Hosted]

1. Have the application omit the page from the tree supplied to Docs; the standard sidebar has no **Hide page** action.
2. Apply search and access rules in the host. Omitting a tree entry does not block its route.

|||

===

===[Remove]

|||[Local]

1. Delete the page file or empty folder. Keep `docs/index.md` as the home page.
2. Update inbound links and rebuild.

|||

|||[Hosted]

1. Choose **Delete page**, **Delete group**, or **Delete section** from its context menu.
2. Review the confirmation, then check affected links and published routes.

|||

===

===[Attach]

|||[Local]

1. Keep assets beside their owning page.
2. Reference images by relative path, such as `![Editor toolbar](./0-install/editor-toolbar.png)`. Move assets with the page.

|||

|||[Hosted]

1. Open the page menu and choose **Files → New** to upload a file.
2. Use **Files** to open, rename, download, or remove it. The host supplies storage and authorized URLs.

|||

===

===[Export]

|||[Local]

1. Copy the page file or folder from `docs/` with its nearby assets.
2. Keep their relative paths together.

|||

|||[Hosted]

1. Choose **Download page**, **Download group**, or **Download section** from the relevant menu.
2. Review the downloaded source and attachments before reusing them.

|||

===

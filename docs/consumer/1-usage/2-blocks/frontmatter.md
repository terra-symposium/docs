---
title: Frontmatter
description: Set a Docs page title, description, and supported navigation metadata.
---

## Frontmatter

Every repository-backed page starts with a YAML frontmatter fence. Frontmatter supplies the title and description displayed by the site:

```md
---
title: Save Docs edits
description: Receive editor changes and save them in the host application.
---
```

Keep each field on one line. Quote a value when it contains YAML-significant punctuation such as a colon. Keep audience assumptions in the authoring brief unless the host supports a matching metadata field. The local catalog derives page order from filenames; it rejects `order` and `sidebar.order` frontmatter.

:::example[Use supported frontmatter]

Avoid adding a field the local catalog does not read:

```md
---
title: Save Docs edits
sidebar.order: 2
---
```

Prefer supported metadata in a numbered file such as `docs/consumer/1-usage/2-save-edits.md`:

```md
---
title: Save Docs edits
description: Receive editor changes in a host application and persist them for later viewing.
---
```

:::

The title and description identify the page in navigation and search. Keep them concise and meaningful; describe the purpose rather than the source file or format. Aim for a description around 75 characters and normally no more than 85. Keep both fields on one line. Quote YAML values containing a colon instead of treating all colons as forbidden. Check host-specific fields against that host's schema before adding them.

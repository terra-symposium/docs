---
title: Docs block fixtures
description: One rendered fixture page covering every case in DOCS_BLOCK_TEST_CASES.
hidden: true
---

## Heading

Paragraph with **bold** text.

- First
- Second

| Name  | Value |
| ----- | ----- |
| Alpha | 1     |

![Diagram](https://example.com/diagram.png)

```ts
const value = 1;
```

<DocsMath code="x^2 + y^2 = z^2" inline />

:::tip[Note]

Callout body.

:::

===[Item]

Accordion body.

===

|||[Item]

Tabs body.

|||

<Embed src="https://example.com" title="Example" />

<TsDocs scope="@terra/example" />

<Nodes
  nodes={[
    { id: 'start', type: 'process', data: { title: 'Start' } },
    { id: 'finish', type: 'process', data: { title: 'Finish' } },
  ]}
  edges={[{ id: 'start-to-finish', source: 'start', target: 'finish' }]}
/>

<Leaf id="fixture-leaf" />

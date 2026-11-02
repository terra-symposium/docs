/** Data-driven Markdown examples for Docs block parsing and serialization tests. */
export const DOCS_BLOCK_TEST_CASES = [
  { name: 'heading', source: '## Heading', types: ['block'] },
  { name: 'paragraph', source: 'Paragraph with **bold** text.', types: ['block'] },
  { name: 'list', source: '* First\n* Second', types: ['block', 'block'] },
  { name: 'table', source: '| Name | Value |\n| --- | --- |\n| Alpha | 1 |', types: ['table'] },
  { name: 'image', source: '![Diagram](https://example.com/diagram.png)', types: ['docImage'] },
  { name: 'code', source: '```ts\nconst value = 1;\n```', types: ['code'] },
  { name: 'math', source: '<DocsMath code="x^2 + y^2 = z^2" inline />', types: ['raw'] },
  { name: 'callout', source: ':::tip[Note]\n\nCallout body.\n\n:::', types: ['callout'] },
  { name: 'accordion', source: '===[Item]\n\nAccordion body.\n\n===', types: ['accordion'] },
  { name: 'tabs', source: '|||[Item]\n\nTabs body.\n\n|||', types: ['tabs'] },
  {
    name: 'embed',
    source: '<Embed src="https://example.com" title="Example" />',
    types: ['embed'],
  },
  { name: 'tsdocs', source: '<TsDocs scope="@terra/example" />', types: ['tsDocs'] },
  {
    name: 'nodes',
    source:
      '<Nodes nodes={`[{ "id": "start", "type": "process", "data": { "title": "Start" } }]} edges={`[]`} />',
    types: ['block'],
  },
  { name: 'custom component', source: '<Leaf id="fixture-leaf" />', types: ['raw'] },
];

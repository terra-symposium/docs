/**
 * test/blocks.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { docsValueToMarkdown, markdownToDocsValue } from '../dist/lib/lib/markdown-model.js';
import { enabledDocsBlocks } from '../dist/lib/components/blocks.js';
import { DocsMarkdown } from '../dist/lib/components/MarkdownContent.js';
import { renderMarkdown } from '../dist/lib/lib/markdown.js';
import { renderMd } from '../dist/lib/lib/terra/runtime/content/markdown.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { stringifyDocBody } from '../dist/lib/lib/terra/runtime/content/document-markdown.js';
import { toCodeJsx } from '../dist/lib/lib/terra/runtime/content.js';

// COMPONENTS
import { DocsRichBlock } from '../dist/lib/components/blocks.js';

// DATA
import { DOCS_BLOCK_TYPES } from '../dist/lib/components/blocks.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Removes generated Portable Text identifiers and representation-only fields before round-trip comparison.
 *
 * @param v Portable Text content, a nested record, an array, or a primitive value to normalize.
 * @return A recursively copied value with unstable keys and storage-only markup removed.
 */
function withoutPortableTextKeys(v) {
  if (Array.isArray(v)) return v.map(withoutPortableTextKeys);
  if (!v || typeof v !== 'object') return v;
  const norm = Object.fromEntries(
    Object.entries(v)
      .filter(([n, i]) => {
        if (n === '_key') return false;
        if (n !== 'markdown' || !i || typeof i !== 'string') return true;
        return !(
          'content' in v ||
          ['accordion', 'tabs', 'table', 'math', 'docImage'].includes(String(v._type)) ||
          (v._type === 'code' && ('value' in v || 'source' in v))
        );
      })
      .map(([n, i]) => [n, withoutPortableTextKeys(i)]),
  );
  if (Array.isArray(v.markDefs) && Array.isArray(norm.children)) {
    const hrefByKey = new Map(
      v.markDefs
        .filter(
          (m) => m?._type === 'link' && typeof m._key === 'string' && typeof m.href === 'string',
        )
        .map((m) => [m._key, m.href]),
    );
    norm.children = norm.children.map((c, i) => {
      const sourceChild = v.children?.[i];
      if (!c || typeof c !== 'object' || !Array.isArray(sourceChild?.marks)) return c;
      return {
        ...c,
        marks: sourceChild.marks.map((mark) =>
          hrefByKey.has(mark) ? `link:${hrefByKey.get(mark)}` : mark,
        ),
      };
    });
  }
  if (norm._type === 'block') norm._type = 'textBlock';
  return norm;
}
/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe('Docs block conversion and rendering contracts', () => {
  test.describe('registry, legacy groups, and rich-block round trips', () => {
    test('all reusable blocks render, while syntax-only groups stay out of the block editor registry', () => {
      assert.equal(DOCS_BLOCK_TYPES.length, 12);
      assert.equal(enabledDocsBlocks().length, 10);
      assert.equal(enabledDocsBlocks().includes('tabs'), false);
      assert.equal(enabledDocsBlocks().includes('accordion'), false);
      assert.equal(enabledDocsBlocks({ embed: false }).includes('embed'), false);
      assert.equal(enabledDocsBlocks({ code: false }).includes('math'), true);
    });
    test('Markdown keeps existing accordion syntax and unsupported source across conversion', () => {
      const result = docsValueToMarkdown(
        markdownToDocsValue(
          '## Heading\n\n===[Item]\nOriginal **content**\n===\n\n<custom-widget value="1"></custom-widget>\n',
        ),
      );
      assert.match(result, /===\[Item\]\nOriginal \*\*content\*\*\n===/);
      assert.match(result, /<custom-widget value="1"><\/custom-widget>/);
    });
    test('legacy Terra Portable Text paragraphs remain readable and normalize on import', () => {
      const legacy = {
        _type: 'terraBlock',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', marks: [], text: 'Legacy paragraph' }],
      };
      const markdown = docsValueToMarkdown([legacy]);
      assert.equal(markdown, 'Legacy paragraph\n');
      assert.equal(markdownToDocsValue(markdown)[0]._type, 'block');
      assert.equal(
        docsValueToMarkdown([
          {
            _type: 'callout',
            kind: 'note',
            title: 'Imported content',
            content: [legacy, { ...legacy, children: [{ _type: 'span', marks: [], text: ' ' }] }],
          },
        ]).startsWith(':::note[Imported content]'),
        true,
      );
      const directive = `<DocsBlock type="terraBlock" data={${JSON.stringify(legacy)}} />`;
      const importedDirective = markdownToDocsValue(directive);
      assert.equal(importedDirective[0]?._type, 'terraBlock');
      assert.equal(importedDirective[0]?.children[0]?.text, 'Legacy paragraph');
    });
    test('legacy structured groups render with the shared Styling controls', () => {
      const tabBlock = {
        _type: 'tabs',
        items: [
          {
            _type: 'item',
            title: 'Overview',
            content: [
              {
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{ _type: 'span', marks: [], text: 'Shared tab body' }],
              },
            ],
          },
        ],
      };
      const accordionBlock = {
        _type: 'accordion',
        items: [
          {
            _type: 'item',
            title: 'Details',
            content: [
              {
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{ _type: 'span', marks: [], text: 'Shared accordion body' }],
              },
            ],
          },
        ],
      };
      const tabMarkdown = docsValueToMarkdown([tabBlock]);
      const accordionMarkdown = docsValueToMarkdown([accordionBlock]);
      const tabs = renderToStaticMarkup(createElement(DocsRichBlock, { block: tabBlock }));
      const accordion = renderToStaticMarkup(
        createElement(DocsRichBlock, { block: accordionBlock }),
      );
      assert.equal(
        tabs,
        renderToStaticMarkup(createElement(DocsMarkdown, { markdown: tabMarkdown })),
      );
      assert.equal(
        accordion,
        renderToStaticMarkup(createElement(DocsMarkdown, { markdown: accordionMarkdown })),
      );
      const disabledTabs = renderToStaticMarkup(
        createElement(DocsRichBlock, { block: tabBlock, options: { tabs: false } }),
      );
      const disabledAccordion = renderToStaticMarkup(
        createElement(DocsRichBlock, { block: accordionBlock, options: { accordion: false } }),
      );
      assert.match(disabledTabs, /<pre data-docs-unsupported-block="tabs">/);
      assert.match(disabledTabs, /\|\|\|\[Overview\]/);
      assert.match(disabledAccordion, /<pre data-docs-unsupported-block="accordion">/);
      assert.match(disabledAccordion, /===\[Details\]/);
      assert.match(tabs, /role="tablist"/);
      assert.match(tabs, /Overview/);
      assert.match(tabs, /Shared tab body/);
      assert.match(accordion, /data-orientation="vertical"/);
      assert.match(accordion, /Details/);
      assert.match(accordion, /Shared accordion body/);
      assert.doesNotMatch(`${tabs}${accordion}`, /docs-tabs|docs-accordion/);
      assert.equal(
        tabs,
        renderToStaticMarkup(
          createElement(DocsMarkdown, { markdown: '|||[Overview]\nShared tab body\n|||' }),
        ),
      );
      assert.equal(
        accordion,
        renderToStaticMarkup(
          createElement(DocsMarkdown, { markdown: '===[Details]\nShared accordion body\n===' }),
        ),
      );
    });
    test('structured block containers round-trip without losing source fields', () => {
      for (const type of DOCS_BLOCK_TYPES.filter(
        (item) => item !== 'accordion' && item !== 'tabs',
      )) {
        const block = { _type: type, _key: 'stable', value: 'example', extra: { nested: true } };
        const source = `<DocsBlock type="${type}" data={${JSON.stringify(block)}} />\n`;
        const restored = markdownToDocsValue(source);
        assert.equal(restored.length, 1, type);
        assert.equal(restored[0]._type, type);
        assert.deepEqual(restored[0].extra, block.extra);
        assert.equal(markdownToDocsValue(docsValueToMarkdown(restored))[0].extra.nested, true);
      }
    });
    test('the quiz component round-trips as a shared renderable Docs block', () => {
      const value = markdownToDocsValue('<Quiz />\n');
      assert.equal(value.length, 1);
      assert.equal(value[0]._type, 'quiz');
      assert.equal(markdownToDocsValue(docsValueToMarkdown(value))[0]._type, 'quiz');
    });
    test('complex rich blocks preserve their data and render instead of showing source payloads', () => {
      const diagram = {
        _key: 'readable-diagram',
        _type: 'nodes',
        direction: 'LR',
        height: 220,
        nodes: [
          { _key: 'start', _type: 'node', id: 'start', type: 'origin', data: { title: 'Input' } },
          {
            _key: 'finish',
            _type: 'node',
            id: 'finish',
            type: 'terminal',
            data: { title: 'Output' },
          },
        ],
        edges: [
          {
            _key: 'edge',
            _type: 'edge',
            id: 'input-output',
            source: 'start',
            target: 'finish',
            data: { arrowHead: true },
          },
        ],
      };
      const markdown = docsValueToMarkdown([diagram]);
      assert.match(markdown, /^<DocsBlock type="nodes"/m);
      assert.match(markdown, /"title":"Input"/);
      assert.deepEqual(markdownToDocsValue(markdown), [diagram]);
      const callout = { _type: 'callout', kind: 'note', title: 'Flow', content: [diagram] };
      const nestedMarkdown = docsValueToMarkdown([callout]);
      const rendered = renderMarkdown(nestedMarkdown);
      const restored = markdownToDocsValue(nestedMarkdown);
      assert.match(rendered, /docs-callout/);
      assert.match(rendered, /docs-diagram/);
      assert.doesNotMatch(rendered, /_type:\s*nodes/);
      assert.equal(restored[0]._type, 'callout');
      assert.equal(restored[0].kind, 'note');
      assert.equal(restored[0].content[0]._type, 'nodes');
      assert.equal(restored[0].content[0].nodes[0].data.title, 'Input');
    });
    test('typed rich blocks preserve intentional trailing newlines in code values', () => {
      const code = {
        _type: 'code',
        _key: 'http-example',
        language: 'plaintext',
        value:
          '\n\nGET /index.html HTTP/1.1\nHost: www.example.com\n\n[blank line indicates end of headers]\n\n',
      };
      const markdown = docsValueToMarkdown([code]);
      assert.match(markdown, /^<DocsBlock type="code"/m);
      assert.deepEqual(markdownToDocsValue(markdown), [code]);
      assert.match(renderMarkdown(markdown), /GET \/index\.html HTTP\/1\.1/);
    });
    test('raw blocks use typed source when bare Markdown would change them into paragraphs', () => {
      const raw = {
        _type: 'raw',
        _key: 'source-import',
        markdown: "import Nodes from '@src/pages/docs/components/_Nodes';",
      };
      const markdown = docsValueToMarkdown([raw]);
      assert.match(markdown, /^<DocsBlock type="raw"/m);
      assert.deepEqual(markdownToDocsValue(markdown), [raw]);
    });
    test('legacy rich components nested in callouts serialize and render as their content', () => {
      const source = [
        ':::example[3NF Decomposition Visualised]',
        '',
        '<Code language="yaml">',
        'node_data: "graph"',
        '</Code>',
        '',
        ':::',
      ].join('\n');
      const parsed = markdownToDocsValue(source);
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0]._type, 'callout');
      assert.equal(parsed[0].content[0]._type, 'code');
      assert.equal(parsed[0].content[0].language, 'yaml');
      assert.equal(parsed[0].content[0].value, 'node_data: "graph"');
      const markdown = docsValueToMarkdown(parsed);
      assert.doesNotMatch(markdown, /DOCSBLOCK\d+PLACEHOLDER/);
      assert.match(markdown, /```yaml\nnode_data: "graph"\n```/);
      const rendered = renderMarkdown(markdown);
      assert.match(rendered, /docs-callout/);
      assert.match(rendered, /node_data:/);
      assert.doesNotMatch(rendered, /DOCSBLOCK|_type: code/);
      const restored = markdownToDocsValue(markdown);
      assert.equal(restored[0]._type, 'callout');
      assert.equal(restored[0].content[0]._type, 'code');
      assert.equal(restored[0].content[0].value, 'node_data: "graph"');
    });
    test('canonical Nodes components inside callouts render as diagrams in view mode', () => {
      const node =
        '<Nodes direction="TB" nodes={`[{"id":"start","type":"origin","data":{"title":"Script Requirements"}}]`} edges={`[]`} height={368} />';
      const source = [
        ':::example[Audio Compilation Process]',
        '',
        'The audio workflow begins here.',
        '',
        node,
        '',
        'The workflow continues here.',
        '',
        ':::',
      ].join('\n');
      const callout = markdownToDocsValue(source).find((block) => block._type === 'callout');
      assert.ok(callout);
      assert.ok(callout.content.some((block) => block._type === 'nodes'));
      assert.equal(callout.markdown, undefined);
      const html = renderToStaticMarkup(createElement(DocsRichBlock, { block: callout }));
      assert.match(html, /docs-callout-example/);
      assert.match(html, /docs-diagram/);
      assert.match(html, /Script Requirements/);
      assert.match(html, /The audio workflow begins here\./);
      assert.match(html, /The workflow continues here\./);
      assert.doesNotMatch(html, /&lt;Nodes/);
      const tabs = markdownToDocsValue(['|||[Pipeline]', node, '|||'].join('\n')).find(
        (block) => block._type === 'tabs',
      );
      assert.ok(tabs);
      const tabHtml = renderToStaticMarkup(createElement(DocsRichBlock, { block: tabs }));
      assert.match(tabHtml, /docs-diagram/);
      assert.match(tabHtml, /Script Requirements/);
      assert.doesNotMatch(tabHtml, /&lt;Nodes/);
    });
  });

  test.describe('readable table serialization', () => {
    test('tables with rich cell content use readable Markdown cells and preserve the table', () => {
      /**
       * Builds a keyed paragraph fixture with marks, links, and optional list metadata.
       * @param key Stable block key used to link its child span.
       * @param text Text to place in the paragraph.
       * @param marks Portable Text mark names applied to the span.
       * @param listItem Optional bullet or ordered-list marker.
       * @param level Optional nesting level for the list item.
       * @returns A Portable Text block fixture for rich table cells.
       */
      const paragraph = (key, text, marks = [], listItem, level) => ({
        _type: 'block',
        _key: key,
        style: 'normal',
        markDefs: marks.includes('resource')
          ? [{ _type: 'link', _key: 'resource', href: 'https://example.test/guide' }]
          : [],
        ...(listItem ? { listItem, level } : {}),
        children: [{ _type: 'span', _key: `${key}-span`, text, marks }],
      });
      const table = {
        _key: 'nested-table',
        _type: 'table',
        header: 'Nested data',
        rows: [
          {
            _type: 'row',
            _key: 'header-row',
            cells: [
              {
                _type: 'cell',
                _key: 'header-topic',
                content: [paragraph('topic-heading', 'Topic')],
              },
              {
                _type: 'cell',
                _key: 'header-detail',
                content: [paragraph('detail-heading', 'Details')],
              },
              {
                _type: 'cell',
                _key: 'header-example',
                content: [paragraph('example-heading', 'Example')],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'body-row',
            cells: [
              {
                _type: 'cell',
                _key: 'topic-cell',
                content: [paragraph('topic', 'Collections', ['strong'])],
              },
              {
                _type: 'cell',
                _key: 'detail-cell',
                content: [
                  paragraph('detail', 'A mutable sequence of elements.'),
                  paragraph('resource-link', 'Read the guide', ['resource']),
                  paragraph('list-a', 'Preserves order', [], 'bullet', 1),
                  paragraph('list-b', 'Allows nested values', [], 'bullet', 1),
                  paragraph('list-c', 'Supports nested levels', [], 'bullet', 2),
                ],
              },
              {
                _type: 'cell',
                _key: 'example-cell',
                content: [
                  {
                    _type: 'code',
                    _key: 'code-example',
                    language: 'python',
                    value: 'items = [1, 2, 3]',
                  },
                ],
              },
            ],
          },
        ],
      };
      const markdown = docsValueToMarkdown([table]);
      assert.match(markdown, /^:::docs table\n/m);
      assert.match(markdown, /_docsCellFormat: markdown-v1/);
      assert.match(markdown, /markdown: \|-/);
      assert.match(markdown, /- Preserves order/);
      assert.match(markdown, /\[Read the guide\]\(https:\/\/example\.test\/guide\)/);
      assert.match(markdown, /\n[ \t]+```python\n[ \t]+items = \[1, 2, 3\]\n[ \t]+```/);
      assert.doesNotMatch(markdown, /_type: (?:block|block|span)\b/);
      assert.doesNotMatch(markdown, /children:\n|markDefs:\n|content:\n/);
      const rendered = renderMarkdown(markdown);
      assert.match(rendered, /<table[\s>]/);
      assert.match(rendered, /First paragraph|Collections/);
      assert.match(rendered, /<ul[\s>]/);
      assert.match(rendered, /Preserves order/);
      assert.match(rendered, /href="https:\/\/example\.test\/guide"/);
      assert.match(rendered, /items = \[1, 2, 3\]/);
      assert.doesNotMatch(rendered, /_type: row|_docsCellFormat/);
      const restored = markdownToDocsValue(markdown);
      assert.deepEqual(withoutPortableTextKeys(restored), withoutPortableTextKeys([table]));
      assert.equal(restored[0]._docsCellFormat, undefined);
    });
    test('tables with multiple plain-text paragraphs per cell use readable GFM and retain paragraph boundaries', () => {
      /**
       * Splits a keyed paragraph into spans so embedded newlines can be round-tripped.
       * @param key Stable Portable Text block key.
       * @param text Paragraph source text, including any line breaks.
       * @param marks Marks copied onto each generated text span.
       * @returns A block fixture with one span for each source segment.
       */
      const paragraph = (key, text, marks = []) => ({
        _type: 'block',
        _key: key,
        style: 'normal',
        markDefs: [],
        children: String(text)
          .split(/(\n)/g)
          .map((part, index) => ({
            _type: 'span',
            _key: `${key}-span-${index}`,
            text: part,
            marks,
          })),
      });
      const table = {
        _type: 'table',
        _key: 'paragraph-table',
        header: 'Table',
        rows: [
          {
            _type: 'row',
            cells: [
              { _type: 'cell', content: [paragraph('heading-a', 'Task')] },
              { _type: 'cell', content: [paragraph('heading-b', 'Details')] },
            ],
          },
          {
            _type: 'row',
            cells: [
              { _type: 'cell', content: [paragraph('task', 'Assessment')] },
              {
                _type: 'cell',
                content: [
                  paragraph('first-detail', 'Released Monday.'),
                  paragraph('second-detail', 'Complete before lecture.', ['strong']),
                  paragraph('third-detail', 'Product\nOperation: Usability'),
                ],
              },
            ],
          },
        ],
      };
      const markdown = docsValueToMarkdown([table]);
      assert.match(markdown, /^\| Task \| Details \|$/m);
      assert.match(
        markdown,
        /Released Monday\.<br data-docs-paragraph-break>\*\*Complete before lecture\.\*\*<br data-docs-paragraph-break>Product<br>Operation: Usability/,
      );
      assert.doesNotMatch(markdown, /^:::docs table/m);
      assert.deepEqual(
        withoutPortableTextKeys(markdownToDocsValue(markdown)),
        withoutPortableTextKeys([table]),
      );
      assert.match(renderMarkdown(markdown), /<table[\s>]/);
      assert.match(
        renderMarkdown(markdown),
        /Product<\/span><span><br\/><\/span><span>Operation: Usability/,
      );
    });
    test('escaped punctuation inside a table link stays one link annotation', () => {
      const table = {
        _type: 'table',
        header: 'Sources',
        rows: [
          {
            _type: 'row',
            cells: [
              {
                _type: 'cell',
                content: [
                  {
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [{ _type: 'span', text: 'Source', marks: [] }],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            cells: [
              {
                _type: 'cell',
                content: [
                  {
                    _type: 'block',
                    style: 'normal',
                    markDefs: [
                      { _type: 'link', _key: 'source-link', href: 'https://example.test/source' },
                    ],
                    children: [{ _type: 'span', text: 'Quiz_Practice', marks: ['source-link'] }],
                  },
                ],
              },
            ],
          },
        ],
      };
      const markdown = docsValueToMarkdown([table]);
      assert.match(markdown, /Quiz.*Practice/);
      const restored = markdownToDocsValue(markdown);
      assert.equal(restored[0].rows[1].cells[0].content[0].children[0].text, 'Quiz_Practice');
      assert.equal(restored[0].rows[1].cells[0].content[0].children[0].marks.length, 1);
      assert.equal(docsValueToMarkdown(restored), markdown);
    });
  });

  test.describe('Portable Text, nested blocks, and recovery', () => {
    test('Portable Text fallback directives render as formatted document content', () => {
      const paragraph = {
        _key: 'paragraph-with-unsupported-metadata',
        _type: 'block',
        style: 'normal',
        markDefs: [{ _key: 'reference', _type: 'link', href: 'https://example.test/page' }],
        children: [
          { _key: 'strong', _type: 'span', text: 'Readable ', marks: ['strong'] },
          { _key: 'linked', _type: 'span', text: 'text', marks: ['reference'] },
        ],
        customMetadata: { source: 'Sanity' },
      };
      const markdown = docsValueToMarkdown([paragraph]);
      assert.match(markdown, /^<DocsBlock type="block"/m);
      const rendered = renderMarkdown(markdown);
      assert.match(rendered, /<p>/);
      assert.match(rendered, /<strong>Readable <\/strong>/);
      assert.match(rendered, /<a href="https:\/\/example\.test\/page">text<\/a>/);
      assert.doesNotMatch(rendered, /customMetadata|_type: block/);
      assert.deepEqual(markdownToDocsValue(markdown), [paragraph]);
    });
    test('structured block JSON is opaque to component parsing', () => {
      const value = {
        _key: 'table-under-test',
        _type: 'table',
        header: 'Examples',
        rows: [
          {
            _type: 'row',
            cells: [
              {
                _type: 'cell',
                content: [
                  {
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      { _type: 'span', marks: [], text: '<Nodes nodes={[]} edges={[]} />' },
                      { _type: 'span', marks: [], text: ':::danger is literal text' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const restored = markdownToDocsValue(
        `:::docs table\n${JSON.stringify(value, null, 2)}\n:::\n`,
      );
      assert.deepEqual(restored[0], value);
    });
    test('canonical Portable Text components preserve marks and inline math exactly', () => {
      const value = {
        _key: 'paragraph-under-test',
        _type: 'block',
        style: 'normal',
        markDefs: [{ _key: 'source-link', _type: 'link', href: '/#leaf' }],
        children: [
          { _key: 'lead', _type: 'span', text: 'Literal $ text ', marks: [] },
          { _key: 'bold', _type: 'span', text: 'marked', marks: ['strong', 'source-link'] },
          { _key: 'equation', _type: 'math', code: 'x^2', inline: true },
        ],
      };
      const source = `<DocsBlock type="block" data={${JSON.stringify(value)}} />`;
      assert.deepEqual(markdownToDocsValue(source), [value]);
    });
    test('adjacent overlapping inline marks remain readable Markdown and round-trip without duplication', () => {
      const value = {
        _key: 'overlapping-marks',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _key: 'plain-italic', _type: 'span', text: 'Emphasises ', marks: ['em'] },
          {
            _key: 'bold-italic',
            _type: 'span',
            text: 'what the system does',
            marks: ['em', 'strong'],
          },
          { _key: 'more-italic', _type: 'span', text: ', not ', marks: ['em'] },
          {
            _key: 'more-bold-italic',
            _type: 'span',
            text: 'how it works internally',
            marks: ['em', 'strong'],
          },
          { _key: 'final-italic', _type: 'span', text: '.', marks: ['em'] },
        ],
      };
      const markdown = docsValueToMarkdown([value]);
      assert.equal(
        markdown,
        '<em>Emphasises </em><strong><em>what the system does</em></strong><em>, not </em>' +
          '<strong><em>how it works internally</em></strong><em>.</em>\n',
      );
      assert.doesNotMatch(markdown, /\*{4}/);
      const restored = markdownToDocsValue(markdown)[0];
      assert.deepEqual(
        restored.children.map(({ text, marks }) => [text, [...marks].sort()]),
        value.children.map(({ text, marks }) => [text, [...marks].sort()]),
      );
    });
    test('grouped accordion and tab data keeps its block boundaries on Markdown round trips', () => {
      for (const type of ['accordion', 'tabs']) {
        const value = {
          _key: `${type}-group`,
          _type: type,
          items: [
            {
              _key: 'first-item',
              _type: 'item',
              title: 'First',
              content: [
                {
                  _key: 'first-content',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    { _key: 'first-span', _type: 'span', text: 'First content', marks: [] },
                  ],
                },
              ],
            },
            {
              _key: 'second-item',
              _type: 'item',
              title: 'Second',
              content: [
                {
                  _key: 'second-content',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    { _key: 'second-span', _type: 'span', text: 'Second content', marks: [] },
                  ],
                },
              ],
            },
          ],
        };
        const markdown = docsValueToMarkdown([value]);
        assert.match(markdown, type === 'accordion' ? /^===\[First\]/m : /^\|\|\|\[First\]/m);
        assert.deepEqual(
          markdownToDocsValue(markdown).flatMap(
            (block) => block.items?.map((item) => item.title) ?? [],
          ),
          ['First', 'Second'],
        );
      }
    });
    test('grouped blocks keep nested rich content readable instead of serializing ordinary text as YAML', () => {
      /**
       * Converts text or marked runs into the child-span shape used by grouped block fixtures.
       * @param key Block key used to derive span keys.
       * @param value Plain text or an array of marked text runs.
       * @returns A Portable Text paragraph containing the normalized spans.
       */
      const paragraph = (key, value) => ({
        _type: 'block',
        _key: `${key}-block`,
        style: 'normal',
        markDefs: [],
        children: (Array.isArray(value) ? value : [{ text: value }]).map((run, index) => ({
          _type: 'span',
          _key: `${key}-span-${index}`,
          text: run.text,
          marks: run.marks ?? [],
        })),
      });
      const table = {
        _type: 'table',
        _key: 'nested-table',
        header: 'Contacts',
        rows: [
          {
            _type: 'row',
            _key: 'contacts-header',
            cells: [
              {
                _type: 'cell',
                _key: 'contacts-name',
                content: [paragraph('name-heading', 'Name')],
              },
              {
                _type: 'cell',
                _key: 'contacts-email',
                content: [paragraph('email-heading', 'Email')],
              },
              {
                _type: 'cell',
                _key: 'contacts-site',
                content: [paragraph('site-heading', 'Site')],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'contacts-person',
            cells: [
              {
                _type: 'cell',
                _key: 'contacts-person-name',
                content: [paragraph('person-name', 'Ada')],
              },
              {
                _type: 'cell',
                _key: 'contacts-person-email',
                content: [paragraph('person-email', 'ada@example.test')],
              },
              {
                _type: 'cell',
                _key: 'contacts-person-site',
                content: [paragraph('person-site', 'https://example.test/contact')],
              },
            ],
          },
        ],
      };
      const value = {
        _type: 'accordion',
        _key: 'course-guide',
        items: [
          {
            _type: 'item',
            _key: 'course-contacts',
            title: 'Contacts and resources',
            content: [
              paragraph('lead', [
                { text: 'Contact the ' },
                { text: 'subject team', marks: ['strong'] },
                { text: ' before the lab.' },
              ]),
              table,
              { _type: 'code', _key: 'course-code', language: 'text', value: 'week = 1' },
              {
                _type: 'callout',
                _key: 'course-note',
                kind: 'note',
                title: 'Bring your student card',
                content: [paragraph('course-note-body', 'You may use it to enter the lab.')],
              },
            ],
          },
        ],
      };
      const markdown = docsValueToMarkdown([value]);
      assert.match(markdown, /^===\[Contacts and resources\]/m);
      assert.match(markdown, /\*\*subject team\*\*/);
      assert.match(markdown, /:::docs table\[Contacts\]/);
      assert.match(markdown, /ada&#64;example\.test/);
      assert.match(markdown, /https&#58;\/\/example\.test\/contact/);
      assert.match(markdown, /```text\nweek = 1\n```/);
      assert.match(markdown, /:::note\[Bring your student card\]/);
      assert.doesNotMatch(markdown, /_type: (?:item|block|block|span)/);
      const restored = markdownToDocsValue(markdown);
      assert.deepEqual(withoutPortableTextKeys(restored), withoutPortableTextKeys([value]));
      const rendered = renderMarkdown(markdown);
      assert.match(rendered, /data-orientation="vertical"/);
      assert.match(rendered, /Contacts and resources/);
      assert.match(rendered, /week = 1/);
      assert.doesNotMatch(rendered, /_type: (?:item|block|block|span)/);
    });
    test('accordion Markdown with colon-labeled list items bypasses YAML parsing', () => {
      const source = `===[Part B: SMEs]
:::note[Instructions]
Identify suitable companies and provide:
- **Research**: Demonstrate that you have researched each company.
- **Motivation**: Explain why you want to work there.
- **Accomplishments**: Describe relevant achievements.
:::
===`;
      const value = markdownToDocsValue(source);
      assert.equal(value[0]._type, 'accordion');
      assert.equal(value[0].items[0].title, 'Part B: SMEs');
      const callout = value[0].items[0].content.find((block) => block._type === 'callout');
      assert.ok(callout);
      assert.deepEqual(
        callout.content
          .filter((block) => block._type === 'block')
          .map((block) => block.children.map((child) => child.text).join('')),
        [
          'Identify suitable companies and provide:',
          'Research: Demonstrate that you have researched each company.',
          'Motivation: Explain why you want to work there.',
          'Accomplishments: Describe relevant achievements.',
        ],
      );
      const rendered = renderMarkdown(source);
      assert.match(rendered, /Part B: SMEs/);
      assert.match(rendered, /<strong>Research<\/strong><\/span><span>:/);
      assert.match(rendered, /<strong>Accomplishments<\/strong><\/span><span>:/);
      assert.doesNotMatch(rendered, /_type: (?:item|block|block|span)/);
    });
    test('nested standalone math keeps its block boundary in callouts and grouped blocks', () => {
      const math = { _type: 'math', _key: 'inline-formula', code: 'x^2', inline: true };
      const callout = {
        _type: 'callout',
        _key: 'math-callout',
        kind: 'note',
        title: 'Formula',
        content: [math],
      };
      const accordion = {
        _type: 'accordion',
        _key: 'math-accordion',
        items: [{ _type: 'item', _key: 'math-item', title: 'Formula', content: [math] }],
      };
      for (const value of [callout, accordion]) {
        const markdown = docsValueToMarkdown([value]);
        assert.match(
          markdown,
          value._type === 'callout' ? /^:{3,}note\[Formula\]/m : /^===\[Formula\]/m,
        );
        assert.match(markdown, /<DocsBlock type="math"/);
        assert.deepEqual(
          withoutPortableTextKeys(markdownToDocsValue(markdown)),
          withoutPortableTextKeys([value]),
        );
        assert.doesNotMatch(renderMarkdown(markdown), /DOCSBLOCK|_type: math/);
        assert.match(renderMarkdown(markdown), /docs-math/);
      }
    });
    test('canonical Docs components import into their matching rich blocks', () => {
      const template = String.fromCharCode(96);
      const source = [
        '<Nodes',
        '  direction="TB"',
        '  nodes={' +
          template +
          '[\n    { "_key": "node-1", "_type": "node", "id": "start", "type": "origin", "data": { "title": "Start" } },\n    { "_key": "node-2", "_type": "node", "id": "end", "type": "terminal", "data": { "title": "End" } }\n  ]' +
          template +
          '}',
        '  edges={' +
          template +
          '[\n    { "_key": "edge-1", "_type": "edge", "id": "link", "source": "start", "target": "end", "data": { "arrowHead": true } }\n  ]' +
          template +
          '}',
        '  height={420}',
        '/>',
        '',
        '<Code language="ts">',
        '{' + template + 'const path = "./docs";',
        'const escaped = \\' + template + 'template\\' + template + ';',
        'const price = \\$5;',
        template + '}',
        '</Code>',
        '',
        '<Embed src="https://example.test/video" title="Demo" />',
        '<TsDocs scope="@terra-symposium/docs" />',
      ].join('\n');
      const value = markdownToDocsValue(source);
      const nodes = value.find((block) => block._type === 'nodes');
      const code = value.find((block) => block._type === 'code');
      const embed = value.find((block) => block._type === 'embed');
      const tsDocs = value.find((block) => block._type === 'tsDocs');
      assert.equal(nodes.direction, 'TB');
      assert.equal(nodes.nodes.length, 2);
      assert.equal(nodes.nodes[0].data.title, 'Start');
      assert.equal(nodes.edges[0].target, 'end');
      assert.equal(nodes.height, 420);
      assert.equal(code.language, 'ts');
      assert.match(code.value, /const path = "\.\/docs"/);
      assert.match(code.value, /const escaped = `template`/);
      assert.match(code.value, /const price = \$5/);
      assert.equal(embed.src, 'https://example.test/video');
      assert.equal(embed.title, 'Demo');
      assert.equal(tsDocs.scope, '@terra-symposium/docs');
      const roundTrip = markdownToDocsValue(docsValueToMarkdown(value));
      assert.deepEqual(roundTrip.find((block) => block._type === 'nodes').nodes, nodes.nodes);
      assert.equal(roundTrip.find((block) => block._type === 'code').value, code.value);
      assert.equal(roundTrip.find((block) => block._type === 'embed').src, embed.src);
      assert.equal(roundTrip.find((block) => block._type === 'tsDocs').scope, tsDocs.scope);
    });
    test('legacy adjacent Code tags do not swallow the following code samples', () => {
      const code = markdownToDocsValue(
        `<Code language="c">\nint first(void) { return 1; }\n\n<Code language="c">\n#include <stdio.h>\n\n<Code language="c">\nstruct player { int age; };\n</Code>`,
      ).filter((block) => block._type === 'code');
      assert.deepEqual(
        code.map(({ language, value }) => [language, value.trim()]),
        [
          ['c', 'int first(void) { return 1; }'],
          ['c', '#include <stdio.h>'],
          ['c', 'struct player { int age; };'],
        ],
      );
    });
    test('component examples inside fenced or inline code stay code content', () => {
      const source = [
        '`<Embed src="https://example.test" />`',
        '',
        '```tsx',
        '<Nodes nodes={[]} edges={[]} />',
        '```',
      ].join('\n');
      const value = markdownToDocsValue(source);
      assert.equal(
        value.some((block) => block._type === 'embed' || block._type === 'nodes'),
        false,
      );
      assert.equal(value[0].children[0].text, '<Embed src="https://example.test" />');
      assert.equal(
        value.find((block) => block._type === 'code').value,
        '<Nodes nodes={[]} edges={[]} />',
      );
    });
    test('nested callout directives keep each original level as a block', () => {
      const value = markdownToDocsValue(
        ':::warning[Outer]\nBefore.\n\n:::danger[Inner]\nStop.\n:::\n\nAfter.\n:::',
      );
      assert.equal(value[0]._type, 'callout');
      assert.equal(value[0].title, 'Outer');
      assert.equal(value[0].content.filter((block) => block._type === 'callout').length, 1);
      assert.equal(value[0].content.find((block) => block._type === 'callout').kind, 'danger');
    });
    test('nested callouts use deeper fences and keep Markdown tables and text readable', () => {
      /**
       * Creates an unmarked Portable Text paragraph for nested callout content.
       * @param text Source text rendered inside the callout.
       * @returns A single-span Portable Text block.
       */
      const paragraph = (text) => ({
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text, marks: [] }],
      });
      const table = {
        _type: 'table',
        header: 'Characteristics',
        rows: [
          {
            _type: 'row',
            cells: [
              { _type: 'cell', content: [paragraph('Category')] },
              { _type: 'cell', content: [paragraph('Details')] },
            ],
          },
          {
            _type: 'row',
            cells: [
              { _type: 'cell', content: [paragraph('Static')] },
              { _type: 'cell', content: [paragraph('Shared across all instances.')] },
            ],
          },
        ],
      };
      const source = [
        {
          _type: 'callout',
          kind: 'tip',
          title: 'Advantages of OOP',
          content: [
            table,
            paragraph('Classes and objects are the primary building blocks.'),
            {
              _type: 'callout',
              kind: 'note',
              title: 'Remember',
              content: [paragraph('A class describes the structure of its objects.')],
            },
          ],
        },
      ];
      const markdown = docsValueToMarkdown(source);
      assert.match(markdown, /^::::tip\[Advantages of OOP\]/m);
      assert.match(markdown, /^:::note\[Remember\]/m);
      assert.match(markdown, /\| Category \| Details \|/);
      assert.match(markdown, /Classes and objects are the primary building blocks\./);
      assert.doesNotMatch(markdown, /_type: (?:block|block|span)/);
      const restored = markdownToDocsValue(markdown);
      assert.equal(restored[0]._type, 'callout');
      assert.equal(restored[0].content[0]._type, 'table');
      assert.equal(
        restored[0].content[1].children[0].text,
        'Classes and objects are the primary building blocks.',
      );
      assert.equal(restored[0].content[2]._type, 'callout');
      assert.equal(restored[0].content[2].title, 'Remember');
      assert.equal(
        restored[0].content[2].content[0].children[0].text,
        'A class describes the structure of its objects.',
      );
      assert.equal(docsValueToMarkdown(restored), markdown);
      const rendered = renderMarkdown(markdown);
      assert.match(rendered, /<table[\s>]/);
      assert.match(rendered, /docs-callout/);
      assert.match(rendered, /Classes and objects are the primary building blocks\./);
      assert.doesNotMatch(rendered, /_type: (?:block|block|span)/);
    });
    test('visually empty Portable Text paragraphs do not force nested callouts into YAML', () => {
      const markdown = docsValueToMarkdown([
        {
          _type: 'callout',
          kind: 'note',
          title: 'Notation Standard',
          content: [
            {
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{ _type: 'span', text: 'Use Crow’s Foot notation.', marks: [] }],
            },
            { _type: 'block', style: 'normal', markDefs: [], children: [] },
          ],
        },
      ]);
      assert.match(markdown, /^:::note\[Notation Standard\]/m);
      assert.doesNotMatch(markdown, /_type: (?:block|block|span)/);
      const restored = markdownToDocsValue(markdown);
      assert.equal(restored[0].content.length, 1);
      assert.equal(restored[0].content[0].children[0].text, 'Use Crow’s Foot notation.');
    });
    test('invalid canonical component payloads are preserved as raw source', () => {
      const source = '<Nodes nodes={notAnArray} edges={[]} />';
      const value = markdownToDocsValue(source);
      assert.equal(
        value.some((block) => block._type === 'nodes'),
        false,
      );
      assert.equal(
        value.some((block) => block._type === 'raw' && block.markdown.includes(source)),
        true,
      );
    });
  });

  test.describe('Markdown formatting and inline content', () => {
    test('rich Markdown rendering escapes unsafe content and supports block opt-out', () => {
      const source = ':::note[Safe]\n\nHello\n\n:::';
      assert.match(renderMarkdown(source), /docs-callout/);
      assert.doesNotMatch(renderMarkdown(source, { callout: false }), /docs-callout/);
      assert.doesNotMatch(
        renderMarkdown(
          '<DocsBlock type="docImage" data={{"_type":"docImage","url":"javascript:alert(1)","alt":"bad"}} />',
        ),
        /src="javascript:/,
      );
    });
    test('inline math survives visual conversion and renders as math', () => {
      const source = 'An equation $x^2 + 1$ in text.\n';
      const value = markdownToDocsValue(source);
      assert.equal(
        value[0].children.some((child) => child._type === 'math'),
        true,
      );
      assert.match(docsValueToMarkdown(value), /\$x\^2 \+ 1\$/);
      assert.match(renderMarkdown(source), /katex/);
      assert.doesNotMatch(renderMarkdown(source, { inlineMath: false }), /katex/);
    });
    test('inline math survives Markdown escapes split across lexer tokens', () => {
      const source = String.raw`The acceleration due to gravity is $G = 9.8\,\text{m s}^{-2}$.`;
      const value = markdownToDocsValue(source);
      assert.equal(
        value[0].children.find((child) => child._type === 'math')?.code,
        String.raw`G = 9.8\,\text{m s}^{-2}`,
      );
      assert.match(renderMarkdown(source), /katex/);
    });
    test('math delimiters embedded in a Portable Text span remain supported inline math', () => {
      const markdown = docsValueToMarkdown([
        {
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{ _type: 'span', text: 'The program $P$ is modified.', marks: [] }],
        },
      ]);
      const restored = markdownToDocsValue(markdown);
      assert.equal(restored[0].children.find((child) => child._type === 'math')?.code, 'P');
      assert.match(renderMarkdown(markdown), /katex/);
    });
    test('escaped dollar delimiters in plain spans stay literal across Markdown round trips', () => {
      const source = String.raw`5. Apply \$\sum \vec{F} = 0\$, \$\sum \tau = 0\$, or \$\sum \tau = I\alpha\$ with a declared sign convention.`;
      const first = markdownToDocsValue(source);
      const markdown = docsValueToMarkdown(first);
      assert.match(markdown, /\\\$/);
      const restored = markdownToDocsValue(markdown);
      /**
       * Joins span text to compare literal dollar delimiters after a Markdown round trip.
       * @param block Parsed Portable Text block whose children should be read.
       * @returns The concatenated visible text from its children.
       */
      const plainText = (block) => (block.children ?? []).map((child) => child.text ?? '').join('');
      assert.equal(first.length, 1);
      assert.equal(restored.length, 1);
      assert.equal(
        first[0].children.some((child) => child._type === 'math'),
        false,
      );
      assert.equal(
        restored[0].children.some((child) => child._type === 'math'),
        false,
      );
      assert.equal(plainText(restored[0]), plainText(first[0]));
    });
    test('multiline headings stay one readable heading across Markdown round trips', () => {
      const value = [
        {
          _type: 'block',
          style: 'h2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Human-centred design prioritises end-users.\nThis document covers two stages.',
              marks: [],
            },
          ],
        },
      ];
      const markdown = docsValueToMarkdown(value);
      const restored = markdownToDocsValue(markdown);
      assert.match(
        markdown,
        /^## Human-centred design prioritises end-users\.<br>This document covers two stages\./,
      );
      assert.equal(restored.length, 1);
      assert.equal(restored[0].style, 'h2');
      assert.equal(
        restored[0].children.map((child) => child.text ?? '').join(''),
        value[0].children[0].text,
      );
    });
    test('Markdown links become visual link annotations and keep their targets', () => {
      const value = markdownToDocsValue(
        'Read [the guide](/product/purpose/) and **[the map](/product/structure/)**.\n',
      );
      assert.equal(value[0].markDefs.length, 2);
      assert.equal(
        value[0].children.some((child) => child.text?.includes('](')),
        false,
      );
      assert.match(docsValueToMarkdown(value), /\[the guide\]\(\/product\/purpose\/\)/);
      assert.match(docsValueToMarkdown(value), /\*\*\[the map\]\(\/product\/structure\/\)\*\*/);
    });
  });

  test.describe('GFM and HTML table round trips', () => {
    test('GFM tables become editable table blocks and survive a Markdown round trip', () => {
      const value = markdownToDocsValue(
        '| Name | Reference |\n| --- | --- |\n| **Terra** | [Docs](/guides/docs) |\n',
      );
      const table = value.find((block) => block._type === 'table');
      assert.ok(table);
      assert.equal(table.rows.length, 2);
      assert.equal(table.rows[0].cells[0].content[0].children[0].text, 'Name');
      assert.equal(table.rows[1].cells[0].content[0].children[0].marks.includes('strong'), true);
      assert.equal(table.rows[1].cells[1].content[0].markDefs[0].href, '/guides/docs');
      const roundTrip = docsValueToMarkdown(value);
      assert.match(roundTrip, /\| Name \| Reference \|/);
      assert.match(roundTrip, /\| \*\*Terra\*\* \| \[Docs\]\(\/guides\/docs\) \|/);
      const restored = markdownToDocsValue(roundTrip).find((block) => block._type === 'table');
      assert.equal(restored.rows[1].cells[0].content[0].children[0].text, 'Terra');
      assert.equal(restored.rows[1].cells[1].content[0].markDefs[0].href, '/guides/docs');
    });
    test('GFM tables keep multiline code-marked cells readable and lossless', () => {
      /**
       * Creates a paragraph whose marks exercise code and math cell serialization.
       * @param text Source text for the cell paragraph.
       * @param marks Portable Text marks applied to its span.
       * @returns A Portable Text block used in the table round-trip fixture.
       */
      const paragraph = (text, marks = []) => ({
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text, marks }],
      });
      const value = [
        {
          _type: 'table',
          header: 'Lab locations',
          rows: [
            {
              _type: 'row',
              cells: [
                { _type: 'cell', content: [paragraph('Lab')] },
                { _type: 'cell', content: [paragraph('Location')] },
              ],
            },
            {
              _type: 'row',
              cells: [
                { _type: 'cell', content: [paragraph('Lab 1')] },
                {
                  _type: 'cell',
                  content: [paragraph('\n{CB11.07.406`}\n', ['code']), paragraph('`')],
                },
              ],
            },
          ],
        },
      ];
      const markdown = docsValueToMarkdown(value);
      assert.match(markdown, /^\| Lab \| Location \|$/m);
      assert.match(markdown, /<code>&#10;\{CB11\.07\.406&#96;\}&#10;<\/code>/);
      assert.doesNotMatch(markdown, /^:::docs table$/m);
      const restored = markdownToDocsValue(markdown).find((block) => block._type === 'table');
      assert.deepEqual(withoutPortableTextKeys(restored), withoutPortableTextKeys(value[0]));
    });
    test('tables with structured or list content keep the source readable and round-trip list metadata', () => {
      /**
       * Builds a table paragraph with an optional first-level list marker.
       * @param text Cell text used by the list metadata round-trip case.
       * @param listItem Optional bullet or ordered-list marker.
       * @returns A block fixture with list metadata when requested.
       */
      const paragraph = (text, listItem) => ({
        _type: 'block',
        _key: `block-${text}`,
        style: 'normal',
        ...(listItem ? { listItem, level: 1 } : {}),
        markDefs: [],
        children: [{ _type: 'span', _key: `span-${text}`, text, marks: [] }],
      });
      const value = {
        _type: 'table',
        _key: 'table-with-list-cell',
        header: 'Assessment dates',
        rows: [
          {
            _type: 'row',
            _key: 'header-row',
            cells: [
              { _type: 'cell', _key: 'header-a', content: [paragraph('Assessment')] },
              { _type: 'cell', _key: 'header-b', content: [paragraph('Due')] },
            ],
          },
          {
            _type: 'row',
            _key: 'body-row',
            cells: [
              { _type: 'cell', _key: 'body-a', content: [paragraph('Project')] },
              {
                _type: 'cell',
                _key: 'body-b',
                content: [
                  paragraph('Draft: Week 4', 'bullet'),
                  paragraph('Final: Week 8', 'bullet'),
                ],
              },
            ],
          },
        ],
      };
      const markdown = docsValueToMarkdown([value]);
      assert.match(markdown, /^:::docs table\n/m);
      assert.match(markdown, /_docsCellFormat: markdown-v1/);
      assert.match(markdown, /- Draft: Week 4\n\s+- Final: Week 8/);
      assert.doesNotMatch(
        markdown,
        /_type: (?:block|block|span)\b|children:\n|markDefs:\n|content:\n/,
      );
      assert.doesNotMatch(markdown, /^\| Assessment \| Due \|$/m);
      assert.deepEqual(
        withoutPortableTextKeys(markdownToDocsValue(markdown)),
        withoutPortableTextKeys([value]),
      );
    });
    test('simple tables preserve deliberately empty cells as readable GFM', () => {
      const empty = {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: '', marks: [] }],
      };
      /**
       * Creates a plain text paragraph for a nonempty cell in the GFM fixture.
       * @param value Text to store in a single span.
       * @returns A normal Portable Text paragraph.
       */
      const text = (value) => ({
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: value, marks: [] }],
      });
      const value = [
        {
          _type: 'table',
          header: 'Prime and non-prime attributes',
          rows: [
            {
              _type: 'row',
              cells: [
                { _type: 'cell', content: [empty] },
                { _type: 'cell', content: [text('Location')] },
                { _type: 'cell', content: [text('Description')] },
              ],
            },
            {
              _type: 'row',
              cells: [
                { _type: 'cell', content: [text('L (Left)')] },
                { _type: 'cell', content: [text('Appears only on the left of FDs')] },
                { _type: 'cell', content: [text('Must be included in every candidate key.')] },
              ],
            },
          ],
        },
      ];
      const markdown = docsValueToMarkdown(value);
      assert.match(markdown, /^\| {2}\| Location \| Description \|$/m);
      assert.doesNotMatch(markdown, /^:::docs table$/m);
      const restored = markdownToDocsValue(markdown)[0];
      assert.equal(restored._type, 'table');
      assert.equal(restored.rows[0].cells[0].content[0].children[0].text, '');
      assert.equal(restored.rows[0].cells[1].content[0].children[0].text, 'Location');
    });
    test('empty Sanity paragraphs do not turn a rich table into a Portable Text source dump', () => {
      /**
       * Builds plain or first-level list paragraphs for the table serializer fixture.
       * @param text Paragraph text to preserve in the table cell.
       * @param listItem Optional list marker used by the structured-cell case.
       * @returns A block with the requested text and optional list metadata.
       */
      const paragraph = (text, listItem) => ({
        _type: 'block',
        style: 'normal',
        markDefs: [],
        ...(listItem ? { listItem, level: 1 } : {}),
        children: [{ _type: 'span', text, marks: [] }],
      });
      const table = {
        _type: 'table',
        header: 'Readable table',
        rows: [
          {
            _type: 'row',
            cells: [
              { _type: 'cell', content: [paragraph('Topic')] },
              { _type: 'cell', content: [paragraph('Notes')] },
            ],
          },
          {
            _type: 'row',
            cells: [
              { _type: 'cell', content: [paragraph('Example')] },
              {
                _type: 'cell',
                content: [paragraph('First item', 'bullet'), paragraph('', undefined)],
              },
            ],
          },
        ],
      };
      const markdown = docsValueToMarkdown([table]);
      assert.match(markdown, /^:::docs table\n/m);
      assert.match(markdown, /_docsCellFormat: markdown-v1/);
      assert.match(markdown, /- First item/);
      assert.doesNotMatch(
        markdown,
        /_type: (?:block|block|span)\b|children:\n|markDefs:\n|content:\n/,
      );
      const rendered = renderMarkdown(markdown);
      assert.match(rendered, /<table[\s>]/);
      assert.match(rendered, /First item/);
      assert.doesNotMatch(rendered, /_docsCellFormat|_type: block/);
      const restored = markdownToDocsValue(markdown);
      assert.equal(restored[0]._type, 'table');
      assert.equal(restored[0].rows[1].cells[1].content.length, 1);
      assert.equal(docsValueToMarkdown(restored), markdown);
    });
    test('tables with uneven Sanity rows keep the original cells without padded columns', () => {
      /**
       * Wraps plain text in a Sanity cell so uneven rows exercise source preservation.
       * @param text Cell text from the uneven-row fixture.
       * @returns A table cell containing one unmarked Portable Text paragraph.
       */
      const cell = (text) => ({
        _type: 'cell',
        content: [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{ _type: 'span', text, marks: [] }],
          },
        ],
      });
      const table = {
        _type: 'table',
        header: 'Partial row',
        rows: [
          { _type: 'row', cells: [cell('Item'), cell('Details')] },
          { _type: 'row', cells: [cell('One cell in the Sanity source')] },
        ],
      };
      const markdown = docsValueToMarkdown([table]);
      assert.match(markdown, /^:::docs table\n/m);
      assert.match(markdown, /_docsCellFormat: markdown-v1/);
      assert.doesNotMatch(
        markdown,
        /_type: (?:block|block|span)\b|children:\n|markDefs:\n|content:\n/,
      );
      const restored = markdownToDocsValue(markdown);
      assert.equal(restored[0].rows[1].cells.length, 1);
      assert.equal(
        restored[0].rows[1].cells[0].content[0].children[0].text,
        'One cell in the Sanity source',
      );
      assert.equal(docsValueToMarkdown(restored), markdown);
    });
    test('native HTML tables become editable table blocks without losing cell formatting', () => {
      const value = markdownToDocsValue(
        '<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td><strong>Terra</strong></td><td>One &amp; two</td></tr></tbody></table>',
      );
      const table = value.find((block) => block._type === 'table');
      assert.ok(table);
      assert.equal(table.rows.length, 2);
      assert.equal(table.rows[1].cells[0].content[0].children[0].text, 'Terra');
      assert.equal(table.rows[1].cells[0].content[0].children[0].marks.includes('strong'), true);
      assert.equal(table.rows[1].cells[1].content[0].children[0].text, 'One & two');
      assert.match(docsValueToMarkdown(value), /\| \*\*Terra\*\* \| One & two \|/);
    });
    test('HTML table cells keep every paragraph, literal identifiers, inline code, and math', () => {
      const source = [
        '<table><tbody><tr>',
        '<td><p>Clients: dynamic/intermittent IP, may be offline.</p><p>Server: permanent IP, always online.</p></td>',
        '<td>Python __str__() and SQL pk_prod.</td>',
        '<td><p>Call <code>pk_prod</code>.</p><p>Formula $z_1z_2$.</p></td>',
        '</tr></tbody></table>',
      ].join('');
      const table = markdownToDocsValue(source).find((block) => block._type === 'table');
      assert.ok(table);
      const [paragraphs, identifiers, fmt] = table.rows[0].cells.map((cell) => cell.content);
      assert.deepEqual(
        paragraphs.map((block) => block.children.map((child) => child.text ?? '').join('')),
        [
          'Clients: dynamic/intermittent IP, may be offline.',
          'Server: permanent IP, always online.',
        ],
      );
      assert.equal(
        identifiers[0].children.map((child) => child.text ?? '').join(''),
        'Python __str__() and SQL pk_prod.',
      );
      assert.ok(identifiers[0].children.every((child) => child.marks.length === 0));
      assert.equal(
        fmt[0].children.find((child) => child.text === 'pk_prod').marks.includes('code'),
        true,
      );
      assert.equal(fmt[1].children.find((child) => child._type === 'math').code, 'z_1z_2');
    });
    test('Terra table serialization keeps inline code readable and escapes its content once', () => {
      /**
       * Creates an inline-code paragraph keyed from its source text for table round-trip checks.
       * @param text Code text to preserve inside the table cell.
       * @returns A Portable Text paragraph whose span carries the `code` mark.
       */
      const paragraph = (text) => ({
        _key: `block-${text}`,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: `span-${text}`, _type: 'span', marks: ['code'], text }],
      });
      const table = {
        _key: 'inline-code-table',
        _type: 'table',
        header: 'Conditions',
        rows: [
          {
            _key: 'conditions-row',
            _type: 'row',
            cells: [
              {
                _key: 'apostrophe-cell',
                _type: 'cell',
                content: [paragraph("mode !== 'autonomous'")],
              },
              { _key: 'jsx-cell', _type: 'cell', content: [paragraph('<PermissionsDialog />')] },
            ],
          },
        ],
      };
      const renderedInline = renderMd("`mode !== 'autonomous'`");
      assert.match(renderedInline, /<code>mode !== &#39;autonomous&#39;<\/code>/);
      assert.doesNotMatch(renderedInline, /&amp;#39;/);
      const markdown = stringifyDocBody([table]);
      assert.match(markdown, /<code>mode !== &#39;autonomous&#39;<\/code>/);
      assert.match(markdown, /<code>&lt;PermissionsDialog \/&gt;<\/code>/);
      assert.doesNotMatch(markdown, /&amp;#39;|&amp;lt;|<Code>/);
      const source = '<table><tr><td><code>mode !== &#39;autonomous&#39;</code></td></tr></table>';
      assert.equal(toCodeJsx(source), source);
    });
    test('HTML table math with letter subscripts is parsed before Markdown emphasis', () => {
      const formula = String.raw`\vec{F}_{A \to B} = -\vec{F}_{B \to A}`;
      const source = `<table><tbody><tr><td>$${formula}$</td></tr></tbody></table>`;
      const table = markdownToDocsValue(source).find((block) => block._type === 'table');
      assert.ok(table);
      const math = table.rows[0].cells[0].content[0].children.filter(
        (child) => child._type === 'math',
      );
      assert.deepEqual(
        math.map((child) => child.code),
        [formula],
      );
      const roundTrip = docsValueToMarkdown(markdownToDocsValue(source));
      assert.doesNotMatch(roundTrip, /DOCSMATH/);
      assert.match(roundTrip, new RegExp(formula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
    test('Markdown table math with letter subscripts is parsed before emphasis', () => {
      const formula = String.raw`\vec{F}_{A \to B} = -\vec{F}_{B \to A}`;
      const source = [
        '| Law | Statement |',
        '| --- | --- |',
        `| Third | $${formula}$ |`,
        '',
        'Literal code: `$x_A$` and escaped currency: \\$607 billion.',
      ].join('\n');
      const value = markdownToDocsValue(source);
      const table = value.find((block) => block._type === 'table');
      assert.ok(table);
      const math = table.rows[1].cells[1].content[0].children.filter(
        (child) => child._type === 'math',
      );
      assert.deepEqual(
        math.map((child) => child.code),
        [formula],
      );
      const roundTrip = docsValueToMarkdown(value);
      assert.doesNotMatch(roundTrip, /DOCSMATH/);
      assert.match(roundTrip, new RegExp(formula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      const prose = value.find((block) => block._type === 'block');
      assert.ok(prose);
      assert.equal(
        prose.children.some((child) => child._type === 'math'),
        false,
      );
    });
    test('Markdown and HTML table images stay structured and round-trip as readable Markdown', () => {
      const markdownSource = [
        '| Topic | Illustration |',
        '| --- | --- |',
        '| Before ![diagram](./diagram.png "System diagram") after | ![axes](./axes.svg) |',
      ].join('\n');
      const markdownTable = markdownToDocsValue(markdownSource).find(
        (block) => block._type === 'table',
      );
      assert.ok(markdownTable);
      const markdownCell = markdownTable.rows[1].cells[0].content;
      assert.deepEqual(
        markdownCell
          .filter((block) => block._type === 'docImage')
          .map(({ alt, url, title }) => ({ alt, url, title })),
        [{ alt: 'diagram', url: './diagram.png', title: 'System diagram' }],
      );
      assert.equal(markdownTable.rows[1].cells[1].content[0]._type, 'docImage');
      const markdownRoundTrip = docsValueToMarkdown([markdownTable]);
      assert.match(markdownRoundTrip, /\| Before <br data-docs-paragraph-break>!\[diagram\]/);
      assert.match(markdownRoundTrip, /!\[diagram\]\(\.\/diagram\.png "System diagram"\)/);
      assert.match(markdownRoundTrip, /!\[axes\]\(\.\/axes\.svg\)/);
      const restoredMarkdownTable = markdownToDocsValue(markdownRoundTrip).find(
        (block) => block._type === 'table',
      );
      assert.equal(
        restoredMarkdownTable.rows[1].cells[0].content.filter((block) => block._type === 'docImage')
          .length,
        1,
      );
      assert.equal(restoredMarkdownTable.rows[1].cells[1].content[0].url, './axes.svg');
      const htmlTable = markdownToDocsValue(
        '<table><tbody><tr><td>Before <img src="./inline.png" alt="Inline diagram" title="Inline title"/> after</td></tr></tbody></table>',
      ).find((block) => block._type === 'table');
      assert.ok(htmlTable);
      const htmlCell = htmlTable.rows[0].cells[0].content;
      assert.deepEqual(
        htmlCell
          .filter((block) => block._type === 'docImage')
          .map(({ alt, url, title }) => ({ alt, url, title })),
        [{ alt: 'Inline diagram', url: './inline.png', title: 'Inline title' }],
      );
      const htmlRoundTrip = docsValueToMarkdown([htmlTable]);
      assert.match(htmlRoundTrip, /!\[Inline diagram\]\(\.\/inline\.png "Inline title"\)/);
      assert.doesNotMatch(htmlRoundTrip, /:::docs table/);
    });
  });

  test.describe('standard Markdown block types and opt-outs', () => {
    test('images, headings, quotes, lists, fenced code and display math retain their visual block types', () => {
      const source = [
        '# Page title',
        '',
        '> A quoted sentence.',
        '',
        '- **First**',
        '  - Nested',
        '- Last',
        '',
        '1. Ordered one',
        '2. Ordered two',
        '',
        '![Diagram](./diagram.svg "System diagram")',
        '',
        '```ts',
        'const answer = 42;',
        '```',
        '',
        '$$',
        'x^2 + 1',
        '$$',
      ].join('\n');
      const value = markdownToDocsValue(source);
      assert.equal(value[0].style, 'normal');
      assert.equal(
        value.find((block) => block.style === 'blockquote').children[0].text,
        'A quoted sentence.',
      );
      assert.deepEqual(
        value.filter((block) => block.listItem).map((block) => [block.listItem, block.level]),
        [
          ['bullet', 1],
          ['bullet', 2],
          ['bullet', 1],
          ['number', 1],
          ['number', 1],
        ],
      );
      assert.equal(value.find((block) => block._type === 'docImage').url, './diagram.svg');
      assert.equal(value.find((block) => block._type === 'code').value, 'const answer = 42;');
      assert.equal(value.find((block) => block._type === 'math').code, 'x^2 + 1');
      const roundTrip = markdownToDocsValue(docsValueToMarkdown(value));
      assert.equal(roundTrip.find((block) => block._type === 'docImage').alt, 'Diagram');
      assert.equal(roundTrip.filter((block) => block.listItem).length, 5);
      assert.equal(roundTrip.find((block) => block._type === 'code').value, 'const answer = 42;');
      assert.equal(roundTrip.find((block) => block._type === 'math').code, 'x^2 + 1');
    });
    test('ordinary Portable Text stays readable and mixed nested list kinds keep their depth', () => {
      const markdown = docsValueToMarkdown([
        {
          _type: 'block',
          style: 'h3',
          markDefs: [],
          children: [{ _type: 'span', text: 'Preparation', marks: [] }],
        },
        {
          _type: 'block',
          style: 'normal',
          markDefs: [{ _type: 'link', _key: 'link-1', href: 'https://example.test/guide' }],
          children: [
            { _type: 'span', text: 'Read ', marks: [] },
            { _type: 'span', text: 'the guide', marks: ['strong', 'link-1'] },
            { _type: 'span', text: ' and ', marks: [] },
            { _type: 'span', text: 'format', marks: ['code'] },
            { _type: 'span', text: ' the result.', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          listItem: 'number',
          level: 1,
          markDefs: [],
          children: [{ _type: 'span', text: 'Install the tool', marks: [] }],
        },
        {
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          level: 2,
          markDefs: [],
          children: [{ _type: 'span', text: 'Choose the shell', marks: [] }],
        },
        {
          _type: 'block',
          style: 'normal',
          listItem: 'number',
          level: 1,
          markDefs: [],
          children: [{ _type: 'span', text: 'Verify the install', marks: [] }],
        },
      ]);
      assert.match(markdown, /^### Preparation/m);
      assert.match(markdown, /\[\*\*the guide\*\*\]\(https:\/\/example\.test\/guide\)/);
      assert.match(
        markdown,
        /1\. Install the tool\n {3}- Choose the shell\n2\. Verify the install/,
      );
      assert.doesNotMatch(markdown, /:::docs block/);
      const restored = markdownToDocsValue(markdown);
      assert.deepEqual(
        restored.filter((block) => block.listItem).map((block) => [block.listItem, block.level]),
        [
          ['number', 1],
          ['bullet', 2],
          ['number', 1],
        ],
      );
      assert.equal(restored[0].style, 'h3');
      assert.equal(restored[1].markDefs[0].href, 'https://example.test/guide');
    });
    test('callout directives map to rich blocks and block opt-outs preserve original Markdown', () => {
      const value = markdownToDocsValue(':::warning[Check this]\nReview **the source**.\n:::');
      assert.equal(value[0]._type, 'callout');
      assert.equal(value[0].kind, 'warning');
      assert.equal(value[0].title, 'Check this');
      assert.match(docsValueToMarkdown(value), /:::warning\[Check this\]/);
      assert.match(docsValueToMarkdown(value), /Review \*\*the source\*\*/);
      for (const [markdown, option] of [
        ['| a | b |\n| --- | --- |\n| c | d |', { table: false }],
        ['![asset](./asset.svg)', { docImage: false }],
        ['```ts\nconst x = 1;\n```', { code: false }],
        ['$$\nx^2\n$$', { math: false }],
        [':::warning[Note]\nBody.\n:::', { callout: false }],
        ['===[Details]\nBody.\n===', { accordion: false }],
      ]) {
        const restored = docsValueToMarkdown(markdownToDocsValue(markdown, option));
        assert.match(restored, markdown.includes('|') ? /\| a \| b \|/ : /./);
        for (const line of markdown.split('\n').filter(Boolean)) assert.ok(restored.includes(line));
      }
    });
  });
});

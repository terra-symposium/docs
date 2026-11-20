import assert from 'node:assert/strict';
import test from 'node:test';
import {
  editedMarkdownSource,
  markdownDownloadName,
  siteImageUrls,
  splitMarkdownSource,
} from '../dist/lib/lib/local-markdown.js';

test('downloaded Markdown retains metadata and relative assets', () => {
  const original = `---
title: Original
description: Initial description
sidebar:
  label: Short name
---

## Start

![Diagram](./start/diagram.png)
`;
  assert.equal(splitMarkdownSource(original).body, '## Start\n\n![Diagram](./start/diagram.png)\n');
  const saved = editedMarkdownSource({
    original,
    body: '## Changed\n\n![Diagram](./start/diagram.png)',
    title: 'Updated',
    description: 'New description',
    initialTitle: 'Original',
    initialDescription: 'Initial description',
  });
  assert.match(saved, /title: Updated/);
  assert.match(saved, /description: New description/);
  assert.match(saved, /label: Short name/);
  assert.match(saved, /!\[Diagram\]\(\.\/start\/diagram\.png\)/);
  assert.equal(markdownDownloadName('docs/usage/2-guide.mdx'), '2-guide.mdx');
  assert.equal(
    siteImageUrls('![Diagram](./start/diagram.png)', '/docs/usage/guide.md'),
    '![Diagram](/_docs/assets/usage/start/diagram.png)',
  );
});

/**
 * tests/docs-sanitize.test.mjs
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { test } from 'node:test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
/**
 * Read an authored sanitizer fixture by name.
 *
 * @param {string} name - Filename under the sanitizer fixture directory.
 *
 * @returns {string} Fixture source text.
 */
const fixture = (name) => readFileSync(join(root, 'scripts/docs-sanitize/fixtures', name), 'utf8');
/**
 * Run the public sanitizer command against an isolated fixture path.
 *
 * @param {string} mode - Check or fix command to execute.
 * @param {string} path - Temporary Markdown file to inspect.
 *
 * @returns {import('node:child_process').SpawnSyncReturns<string>} Command result.
 */
const run = (mode, path) =>
  spawnSync('python3', [join(root, 'scripts/docs-sanitize/cli.py'), mode, path], {
    encoding: 'utf8',
  });

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('Docs sanitizer fixes safe syntax and reports unrecoverable diagram data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'docs-sanitize-'));
  try {
    const path = join(dir, 'page.md');
    writeFileSync(path, fixture('broken.md'));
    assert.equal(run('check', path).status, 1);
    assert.equal(run('fix', path).status, 1);
    const fixed = readFileSync(path, 'utf8');
    assert.match(
      fixed,
      /\|\|\|\[TypeScript API\]\n\nUse `scrapeCanvas` for the complete workflow\.\n\n\|\|\|/,
    );
    assert.match(fixed, /```ts\nconst answer = 42;\n```/);
    assert.match(fixed, /<Nodes nodes=\{frontmatter\.process_nodes\}/);
    assert.match(fixed, /<DocsBlock/);
    assert.equal(run('fix', path).status, 1);
    assert.equal(readFileSync(path, 'utf8'), fixed);
    writeFileSync(path, fixture('valid.md'));
    assert.equal(run('check', path).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Docs sanitizer converts supported literal rich blocks without changing fenced examples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'docs-sanitize-'));
  try {
    const path = join(dir, 'blocks.md');
    writeFileSync(
      path,
      `\`\`\`mdx\n<CodeBlock language="ts" code={"example"} />\n\`\`\`\n\n<DocsBlock type="nodes" data={${JSON.stringify(
        {
          nodes: [{ id: '1', data: { label: 'Start' } }],
          edges: [{ id: 'e1', source: '1', target: '2' }],
          direction: 'LR',
        },
      )}} />\n`,
    );
    assert.equal(run('fix', path).status, 0);
    const fixed = readFileSync(path, 'utf8');
    assert.match(fixed, /<CodeBlock language="ts" code=\{"example"\} \/>/);
    assert.match(fixed, /<Nodes\n\tnodes=\{\[\n\t\{"id": "1"/);
    assert.equal(run('check', path).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Docs sanitizer removes a Nodes shim and content divider but preserves frontmatter and code', () => {
  const dir = mkdtempSync(join(tmpdir(), 'docs-sanitize-'));
  try {
    const path = join(dir, 'page.mdx');
    writeFileSync(
      path,
      `---\ntitle: Example\n---\n\nimport { NodesBlock } from '@terra-symposium/docs';\nexport const Nodes = props => <NodesBlock block={props} />;\n\nBefore\n\n---\n\nAfter\n\n\`\`\`mdx\n---\nimport { NodesBlock } from '@terra-symposium/docs';\n<NodesBlock block={{ nodes: [], edges: [] }} />\n\`\`\`\n`,
    );
    assert.equal(run('check', path).status, 1);
    assert.equal(run('fix', path).status, 0);
    const fixed = readFileSync(path, 'utf8');
    assert.match(fixed, /^---\ntitle: Example\n---/);
    assert.doesNotMatch(fixed, /export const Nodes/);
    assert.match(fixed, /Before\n\nAfter/);
    assert.match(fixed, /```mdx\n---\nimport \{ NodesBlock \}/);
    assert.equal(run('check', path).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Docs sanitizer flags direct NodesBlock use without removing its required import', () => {
  const dir = mkdtempSync(join(tmpdir(), 'docs-sanitize-'));
  try {
    const path = join(dir, 'page.mdx');
    writeFileSync(
      path,
      "import { NodesBlock } from '@terra-symposium/docs';\n\n<NodesBlock block={{ nodes: [], edges: [] }} />\n",
    );
    const result = run('fix', path);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /direct <NodesBlock> requires migration/);
    assert.match(readFileSync(path, 'utf8'), /import \{ NodesBlock \}/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Docs sanitizer accepts typed block guidance but still reports legacy DocsBlock tags', () => {
  const dir = mkdtempSync(join(tmpdir(), 'docs-sanitize-'));
  try {
    const path = join(dir, 'guidance.md');
    writeFileSync(path, `<DocsBlock data='{"_type":"blockGuidance","id":"prose"}' />\n`);
    assert.equal(run('check', path).status, 0);

    writeFileSync(path, '<DocsBlock type="nodes" data={{}} />\n');
    const result = run('check', path);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /legacy <DocsBlock> at line 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

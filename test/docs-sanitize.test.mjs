import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { test } from 'node:test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cli = join(root, 'scripts/docs-sanitize/cli.py');
const fixture = (name) => readFileSync(join(root, 'scripts/docs-sanitize/fixtures', name), 'utf8');
const run = (mode, path) => spawnSync('python3', [cli, mode, path], { encoding: 'utf8' });

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
    const diagram = JSON.stringify({
      nodes: [{ id: '1', data: { label: 'Start' } }],
      edges: [{ id: 'e1', source: '1', target: '2' }],
      direction: 'LR',
    });
    writeFileSync(
      path,
      `\`\`\`mdx\n<CodeBlock language="ts" code={"example"} />\n\`\`\`\n\n<DocsBlock type="nodes" data={${diagram}} />\n`,
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
      `---\ntitle: Example\n---\n\nimport { NodesBlock } from '@terra-symposium/docs';\nexport const Nodes = props => <NodesBlock block={props} />;\n\nBefore\n\n---\n\nAfter\n\n\`\`\`mdx\n---\nimport { NodesBlock } from '@terra-symposium/docs';\n\`\`\`\n`,
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

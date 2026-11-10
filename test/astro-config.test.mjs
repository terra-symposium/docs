/**
 * test/astro-config.test.mjs
 * Regressions for consumer package resolution and Vite's Docs runtime entries.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';
import {
  createConsumerProject,
  createProjectExportAliases,
  resolveConsumerDependency,
} from '../site/project-config.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

// DATA
import { DOCS_VITE_OPTIMIZE_DEPS } from '../dist/lib/lib/astro.js';
import { URL } from 'node:url';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('nested consumer metadata and modules resolve independently from the Docs site root', async () => {
  const siteRoot = await mkdtemp(join(tmpdir(), 'terra-docs-consumer-root-'));
  const consumerRoot = join(siteRoot, 'config');
  const dependencyRoot = join(consumerRoot, 'node_modules', 'fixture-runtime');
  try {
    await mkdir(dependencyRoot, { recursive: true });
    await writeFile(
      join(siteRoot, 'package.json'),
      JSON.stringify({ name: 'workspace-root', private: true }),
    );
    await writeFile(
      join(consumerRoot, 'package.json'),
      JSON.stringify({
        name: 'nested-consumer',
        docs: { title: 'Nested consumer docs' },
        dependencies: { 'fixture-runtime': '1.0.0' },
        exports: { '.': './src/index.js', './docs/*': './src/docs/*.js' },
      }),
    );
    await writeFile(
      join(dependencyRoot, 'package.json'),
      JSON.stringify({ name: 'fixture-runtime', main: 'index.cjs' }),
    );
    await writeFile(join(dependencyRoot, 'index.cjs'), 'module.exports = true;\n');
    const consumer = createConsumerProject(siteRoot, 'config');
    assert.equal(consumer.root, resolve(siteRoot, 'config'));
    assert.equal(consumer.manifest.name, 'nested-consumer');
    assert.equal(consumer.manifest.docs.title, 'Nested consumer docs');
    assert.equal(
      await realpath(consumer.require.resolve('fixture-runtime')),
      await realpath(join(dependencyRoot, 'index.cjs')),
    );
    const aliases = createProjectExportAliases(consumer.manifest, consumer.root);
    const rootAlias = aliases.find(({ find }) => find.test('nested-consumer'));
    const docsAlias = aliases.find(({ find }) => find.test('nested-consumer/docs/overview'));
    assert.equal(rootAlias?.replacement, join(consumerRoot, 'src/index.js'));
    assert.equal(docsAlias?.replacement, join(consumerRoot, 'src/docs/$1.js'));
    const sharedServerRenderer = resolveConsumerDependency(
      {
        resolve: () => {
          throw new Error('not installed by the consumer');
        },
      },
      { resolve: (specifier) => `/docs/node_modules/${specifier}.js` },
      'react-dom/server.browser',
    );
    assert.equal(sharedServerRenderer, '/docs/node_modules/react-dom/server.browser.js');
  } finally {
    await rm(siteRoot, { recursive: true, force: true });
  }
});
test('Vite pre-optimizes every JavaScript entry in the public Docs export map', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const runtimeExports = Object.entries(manifest.exports)
    .filter(([, entry]) => {
      const target = typeof entry === 'string' ? entry : entry?.import;
      return typeof target === 'string' && target.endsWith('.js');
    })
    .map(([key]) => `${manifest.name}${key === '.' ? '' : key.slice(1)}`);
  for (const entry of runtimeExports) assert.ok(DOCS_VITE_OPTIMIZE_DEPS.includes(entry));
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const aliases = createProjectExportAliases(manifest, packageRoot);
  for (const entry of runtimeExports) {
    const alias = aliases.find(({ find }) => find.test(entry));
    assert.ok(alias, `missing Docs package alias for ${entry}`);
    assert.equal(alias.replacement.startsWith(packageRoot), true);
  }
});
test('published site plugins resolve the shared regex helper from the package root', async () => {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const regexPath = resolve(packageRoot, 'src/lib/terra/regex.mjs');
  assert.ok(manifest.files.includes('src/lib/terra/regex.mjs'));
  for (const file of ['site/base-path-remark-plugin.mjs', 'site/docs-content-plugin.mjs']) {
    const pluginPath = join(packageRoot, file);
    const source = await readFile(pluginPath, 'utf8');
    const match = source.match(/from ['"]([^'"]*terra\/regex\.mjs)['"]/);
    assert.ok(match, `${file} must import the shared regex helper`);
    assert.equal(
      resolve(dirname(pluginPath), match[1]),
      regexPath,
      `${file} must resolve it in the packed layout`,
    );
  }
});
test('Docs CLI validates its mode before starting Astro with the resolved options', () => {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const cliPath = join(packageRoot, 'bin/docs.mjs');
  const result = spawnSync(process.execPath, [cliPath, 'unsupported-mode'], {
    cwd: packageRoot,
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(result.status, 2);
  assert.match(output, /Usage: docs/);
  assert.doesNotMatch(output, /includeAgents|ReferenceError/);
});

/**
 * test/astro-config-runtime.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import process from 'node:process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { tmpdir } from 'node:os';

// DATA
import { URL } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireFromPackage = createRequire(resolve(packageRoot, 'package.json'));
const configUrl = new URL('../site/config/astro.config.mjs', import.meta.url).href;

/**
 * Finds the Vite alias that matches a requested module specifier.
 *
 * @param aliases - Alias entries from the Astro Vite configuration.
 * @param specifier - Module specifier whose runtime resolution is being checked.
 *
 * @returns The matching alias entry, or `undefined` when no alias is configured.
 */
const findAlias = (aliases, specifier) =>
  aliases.find(({ find: f }) => (typeof f === 'string' ? f === specifier : f.test(specifier)));

test('selects React, ReactDOM, Styling, and their Radix dependencies from one runtime', async () => {
  const originalDocsRoot = process.env.DOCS_ROOT;
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'terra-docs-runtime-'));
  try {
    const docsOwnedRoot = join(fixtureRoot, 'docs-owned');
    await mkdir(docsOwnedRoot, { recursive: true });
    await writeFile(
      join(docsOwnedRoot, 'package.json'),
      JSON.stringify({ name: 'docs-owned-consumer' }),
    );
    process.env.DOCS_ROOT = docsOwnedRoot;
    const docsOwnedAliases = (await import(`${configUrl}?docs-owned=${Date.now()}`)).default.vite
      .resolve.alias;
    const docsReact = requireFromPackage.resolve('react');
    const docsReactDom = requireFromPackage.resolve('react-dom');
    const docsStyling = requireFromPackage.resolve('@terra-symposium/styling');
    const docsTabs = createRequire(docsStyling).resolve('@radix-ui/react-tabs');
    const docsContext = createRequire(docsTabs).resolve('@radix-ui/react-context');
    assert.equal(findAlias(docsOwnedAliases, 'react')?.replacement, docsReact);
    assert.equal(findAlias(docsOwnedAliases, 'react-dom')?.replacement, docsReactDom);
    assert.equal(findAlias(docsOwnedAliases, '@radix-ui/react-context')?.replacement, docsContext);
    const consumerRoot = join(fixtureRoot, 'consumer-owned');
    const consumerNodeModules = join(consumerRoot, 'node_modules');
    const reactRoot = join(consumerNodeModules, 'react');
    const reactDomRoot = join(consumerNodeModules, 'react-dom');
    const stylingRoot = join(consumerNodeModules, '@terra-symposium', 'styling');
    const tabsRoot = join(stylingRoot, 'node_modules', '@radix-ui', 'react-tabs');
    const contextRoot = join(tabsRoot, 'node_modules', '@radix-ui', 'react-context');
    await mkdir(consumerRoot, { recursive: true });
    await writeFile(
      join(consumerRoot, 'package.json'),
      JSON.stringify({
        name: 'consumer-owned-runtime',
        dependencies: {
          '@terra-symposium/styling': '1.0.0',
          react: '19.0.0',
          'react-dom': '19.0.0',
        },
      }),
    );
    for (const { root, manifest } of [
      {
        root: reactRoot,
        manifest: {
          name: 'react',
          exports: {
            '.': './index.js',
            './compiler-runtime': './compiler-runtime.js',
            './jsx-dev-runtime': './jsx-dev-runtime.js',
            './jsx-runtime': './jsx-runtime.js',
          },
        },
      },
      {
        root: reactDomRoot,
        manifest: {
          name: 'react-dom',
          exports: {
            '.': './index.js',
            './client': './client.js',
            './server.browser': './server.browser.js',
          },
        },
      },
      {
        root: stylingRoot,
        manifest: {
          name: '@terra-symposium/styling',
          dependencies: { '@radix-ui/react-tabs': '1.0.0' },
          exports: { '.': './index.js' },
        },
      },
      {
        root: tabsRoot,
        manifest: {
          name: '@radix-ui/react-tabs',
          dependencies: { '@radix-ui/react-context': '1.0.0' },
          peerDependencies: { react: '^19.0.0' },
          exports: { '.': './index.js' },
        },
      },
      {
        root: contextRoot,
        manifest: {
          name: '@radix-ui/react-context',
          peerDependencies: { react: '^19.0.0' },
          exports: { '.': './index.js' },
        },
      },
    ]) {
      await mkdir(root, { recursive: true });
      await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
      for (const entry of Object.values(manifest.exports)) {
        await writeFile(join(root, entry), 'export {};\n');
      }
    }
    process.env.DOCS_ROOT = consumerRoot;
    const consumerAliases = (await import(`${configUrl}?consumer-owned=${Date.now()}`)).default.vite
      .resolve.alias;
    const requireFromConsumer = createRequire(resolve(consumerRoot, 'package.json'));
    const consumerReact = requireFromConsumer.resolve('react');
    const consumerReactDom = requireFromConsumer.resolve('react-dom');
    const consumerStyling = requireFromConsumer.resolve('@terra-symposium/styling');
    const consumerTabs = createRequire(consumerStyling).resolve('@radix-ui/react-tabs');
    const consumerContext = createRequire(consumerTabs).resolve('@radix-ui/react-context');
    assert.equal(findAlias(consumerAliases, 'react')?.replacement, consumerReact);
    assert.equal(findAlias(consumerAliases, 'react-dom')?.replacement, consumerReactDom);
    assert.equal(
      findAlias(consumerAliases, '@terra-symposium/styling')?.replacement,
      consumerStyling,
    );
    assert.equal(
      findAlias(consumerAliases, '@radix-ui/react-context')?.replacement,
      consumerContext,
    );
  } finally {
    if (originalDocsRoot === undefined) delete process.env.DOCS_ROOT;
    else process.env.DOCS_ROOT = originalDocsRoot;
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('SSR renders a Styling Radix component through the selected consumer React runtime', async () => {
  const originalDocsRoot = process.env.DOCS_ROOT;
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'terra-docs-ssr-runtime-'));
  try {
    const nodeModules = join(fixtureRoot, 'node_modules');
    const stylingRoot = join(nodeModules, '@terra-symposium', 'styling');
    const tabsRoot = join(stylingRoot, 'node_modules', '@radix-ui', 'react-tabs');
    const duplicateReactRoot = join(tabsRoot, 'node_modules', 'react');
    const reactRoot = dirname(requireFromPackage.resolve('react'));
    const reactDomRoot = dirname(requireFromPackage.resolve('react-dom'));
    await mkdir(stylingRoot, { recursive: true });
    await writeFile(
      join(fixtureRoot, 'package.json'),
      JSON.stringify({
        name: 'consumer-ssr-runtime',
        dependencies: {
          '@terra-symposium/styling': '1.0.0',
          react: '19.0.0',
          'react-dom': '19.0.0',
        },
      }),
    );
    await symlink(reactRoot, join(nodeModules, 'react'), 'dir');
    await symlink(reactDomRoot, join(nodeModules, 'react-dom'), 'dir');
    await writeFile(
      join(stylingRoot, 'package.json'),
      JSON.stringify({
        name: '@terra-symposium/styling',
        type: 'module',
        dependencies: { '@radix-ui/react-tabs': '1.0.0' },
        exports: { '.': './index.js' },
      }),
    );
    await writeFile(
      join(stylingRoot, 'index.js'),
      `import { TabsRoot } from '@radix-ui/react-tabs';\nexport { TabsRoot };\n`,
    );
    await mkdir(tabsRoot, { recursive: true });
    await writeFile(
      join(tabsRoot, 'package.json'),
      JSON.stringify({
        name: '@radix-ui/react-tabs',
        type: 'module',
        peerDependencies: { react: '^19.0.0' },
        exports: { '.': './index.js' },
      }),
    );
    await writeFile(
      join(tabsRoot, 'index.js'),
      `import React from 'react';\nexport function TabsRoot() { const [value] = React.useState('ready'); return React.createElement('div', { 'data-runtime-test': value }, value); }\n`,
    );
    await cp(reactRoot, duplicateReactRoot, { recursive: true });
    process.env.DOCS_ROOT = fixtureRoot;
    const config = await import(`${configUrl}?ssr=${Date.now()}`);
    const consumerRequire = createRequire(join(fixtureRoot, 'package.json'));
    const React = consumerRequire('react');
    const { renderToString } = consumerRequire('react-dom/server');
    const consumerReact = consumerRequire.resolve('react');
    const nestedReact = createRequire(join(tabsRoot, 'index.js')).resolve('react');
    assert.notEqual(
      nestedReact,
      consumerReact,
      'the fixture must contain a second React peer root',
    );
    const reactAlias = findAlias(config.default.vite.resolve.alias, 'react');
    assert.equal(reactAlias?.replacement, consumerReact);
    const tabsAlias = findAlias(config.default.vite.resolve.alias, '@radix-ui/react-tabs');
    assert.equal(
      tabsAlias?.replacement,
      createRequire(join(stylingRoot, 'index.js')).resolve('@radix-ui/react-tabs'),
    );
    const sharedTabsPath = join(fixtureRoot, 'shared-radix.mjs');
    const radixSource = `import React from 'react';\nexport function TabsRoot() { const [value] = React.useState('ready'); return React.createElement('div', { 'data-runtime-test': value }, value); }\n`;
    await writeFile(
      sharedTabsPath,
      radixSource.replace("from 'react'", `from '${pathToFileURL(reactAlias.replacement).href}'`),
    );
    const { TabsRoot: SharedTabsRoot } = await import(
      `${pathToFileURL(sharedTabsPath).href}?runtime=${Date.now()}`
    );
    assert.match(renderToString(React.createElement(SharedTabsRoot)), /data-runtime-test="ready"/);
    assert.ok(
      config.default.vite.ssr.noExternal.some((entry) =>
        entry instanceof RegExp
          ? entry.test('@radix-ui/react-tabs')
          : entry === '@radix-ui/react-tabs',
      ),
      'SSR must bundle Radix UI peers so their React imports use the selected runtime alias',
    );
  } finally {
    if (originalDocsRoot === undefined) delete process.env.DOCS_ROOT;
    else process.env.DOCS_ROOT = originalDocsRoot;
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

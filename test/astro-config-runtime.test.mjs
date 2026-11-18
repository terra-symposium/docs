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
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { tmpdir } from 'node:os';

// DATA
import { URL } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

test('leaves React and ReactDOM external to SSR bundles', async () => {
  const originalDocsRoot = process.env.DOCS_ROOT;
  try {
    process.env.DOCS_ROOT = packageRoot;
    const vite = (await import(`${configUrl}?package-react=${Date.now()}`)).default.vite;
    const aliases = vite.resolve.alias;
    assert.equal(findAlias(aliases, 'react'), undefined);
    assert.equal(findAlias(aliases, 'react-dom'), undefined);
    assert.equal(vite.ssr.optimizeDeps, undefined);
  } finally {
    if (originalDocsRoot === undefined) delete process.env.DOCS_ROOT;
    else process.env.DOCS_ROOT = originalDocsRoot;
  }
});

test('resolves Styling and Radix without aliasing the consumer React runtime', async () => {
  const originalDocsRoot = process.env.DOCS_ROOT;
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'terra-docs-runtime-'));
  try {
    const docsOwnedRoot = join(fixtureRoot, 'docs-owned');
    await mkdir(docsOwnedRoot, { recursive: true });
    await writeFile(
      join(docsOwnedRoot, 'package.json'),
      JSON.stringify({
        name: 'docs-owned-consumer',
        docs: {
          errorReporting: {
            endpoint: 'http://localhost:4321/api/error-report',
            site: 'docs-owned-consumer',
            delivery: 'email',
          },
        },
      }),
    );
    process.env.DOCS_ROOT = docsOwnedRoot;
    const docsOwnedConfig = (await import(`${configUrl}?docs-owned=${Date.now()}`)).default;
    const docsOwnedAliases = docsOwnedConfig.vite.resolve.alias;
    const injected = [];
    docsOwnedConfig.integrations[0].hooks['astro:config:setup']({
      injectScript: (_stage, content) => injected.push(content),
    });
    assert.ok(injected.some((content) => content.includes('"delivery":"email"')));
    assert.equal(findAlias(docsOwnedAliases, 'react'), undefined);
    assert.equal(findAlias(docsOwnedAliases, 'react-dom'), undefined);
    assert.equal(findAlias(docsOwnedAliases, '@radix-ui/react-context'), undefined);
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
        docs: {
          errorReporting: {
            endpoint: 'http://localhost:4321/api/error-report',
            site: 'consumer-owned-runtime',
          },
        },
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
    const consumerStyling = requireFromConsumer.resolve('@terra-symposium/styling');
    assert.equal(findAlias(consumerAliases, 'react'), undefined);
    assert.equal(findAlias(consumerAliases, 'react-dom'), undefined);
    assert.equal(
      findAlias(consumerAliases, '@terra-symposium/styling')?.replacement,
      consumerStyling,
    );
    assert.equal(findAlias(consumerAliases, '@radix-ui/react-context'), undefined);
  } finally {
    if (originalDocsRoot === undefined) delete process.env.DOCS_ROOT;
    else process.env.DOCS_ROOT = originalDocsRoot;
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

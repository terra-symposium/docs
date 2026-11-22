/**
 * site/config/astro.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { basePathRemarkPlugin } from '../base-path-remark-plugin.mjs';
import {
  createConsumerProject,
  createProjectExportAliases,
  resolveConsumerDependency,
} from '../project-config.mjs';
import { createRequire } from 'node:module';
import { defineConfig } from 'astro/config';
import { dirname, resolve } from 'node:path';
import { docsContentPlugin } from '../docs-content-plugin.mjs';
import { localSourceRebuildPlugin } from '../local-source-rebuild-plugin.mjs';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/boundaries/astro-integration';
import { unified } from '@astrojs/markdown-remark';

// COMPONENTS
import * as TerraQualityRegex from '../../src/lib/terra/regex.mjs';

// DATA
import { DOCS_VITE_OPTIMIZE_DEPS } from '../../dist/lib/lib/astro.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const requireFromPackage = createRequire(import.meta.url);
const astroManifestPath = requireFromPackage.resolve('astro/package.json');
const astroManifest = JSON.parse(readFileSync(astroManifestPath, 'utf8'));
const requireFromAstro = createRequire(astroManifestPath);
const docsManifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const projectRoot = process.env.DOCS_ROOT ?? process.cwd();
const site = process.env.DOCS_SITE;
const base = process.env.DOCS_BASE ?? '/';
const consumerProject = createConsumerProject(projectRoot, process.env.DOCS_PACKAGE_ROOT ?? '.');
const consumerRoot = consumerProject.root;
const projectManifest = consumerProject.manifest;
const requireFromProject = consumerProject.require;
const reporting = projectManifest.docs?.errorReporting;
const reportEndpoint = process.env.DOCS_ERROR_REPORT_ENDPOINT || reporting?.endpoint;
const reportSite = reporting?.site || projectManifest.name;
if (!reportEndpoint || !reportSite)
  throw new Error(
    'Docs error reporting requires docs.errorReporting.endpoint and a site name in the consumer package.json.',
  );

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

// hygiene-ignore single-use -- Keep consumer export-map resolution separate from Astro runtime and package dependency aliases.
/**
 * Creates Vite aliases for package entry points declared by the consuming project's exports map.
 *
 * @return Alias records for concrete and wildcard project exports that target local files.
 */
function packageExportAliases() {
  return createProjectExportAliases(projectManifest, consumerRoot);
}

// hygiene-ignore single-use -- Styling may be absent from a consumer, so its optional alias has its own failure boundary.
/**
 * Use the consumer's Styling installation when it provides one.
 *
 * @return The Styling alias, or an empty list when the consumer has no installation.
 */
function stylingAlias() {
  try {
    return [
      {
        find: /^@terra-symposium\/styling$/,
        replacement: requireFromProject.resolve('@terra-symposium/styling'),
      },
    ];
  } catch {
    return [];
  }
}

// hygiene-ignore single-use -- Astro internal runtime aliases follow a different package contract from consumer aliases.
/**
 * Resolves Astro's internal MDX runtime and public non-wildcard exports from the Docs installation.
 *
 * @return Vite alias records that keep Astro imports on the package's compatible runtime.
 */
function astroPackageExportAliases() {
  return [
    {
      // Astro's MDX renderer imports this internal runtime path, which Astro
      // does not expose through package exports. Resolve it from Docs' Astro.
      find: /^astro\/runtime\/(.+)$/,
      replacement: resolve(dirname(astroManifestPath), 'dist/runtime/$1'),
    },
    {
      // astro:assets imports Image.astro through this wildcard export.
      find: /^astro\/components\/(.+)$/,
      replacement: resolve(dirname(astroManifestPath), 'components/$1'),
    },
    ...Object.keys(astroManifest.exports)
      .filter((k) => k.startsWith('./') && !k.includes('*'))
      .map((k) => {
        const specifier = `astro${k.slice(1)}`;
        return {
          find: new RegExp(`^${specifier.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`),
          replacement: requireFromPackage.resolve(specifier),
        };
      }),
  ];
}

// hygiene-ignore single-use -- Keep Astro optimizer dependency resolution apart from Docs and Styling dependency graphs.
/**
 * Resolves Astro's optimizer dependencies from the consumer or the Astro installation used by Docs.
 *
 * @return Vite aliases for Astro's direct dependencies used by its client optimizer.
 */
function astroDependencyAliases() {
  return Object.keys(astroManifest.dependencies ?? {}).flatMap((n) => {
    try {
      const entry = resolveConsumerDependency(requireFromProject, requireFromAstro, n);
      if (!isEsmDependencyEntry(entry)) return [];
      return [
        {
          find: new RegExp(`^${n.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`),
          replacement: entry,
        },
      ];
    } catch {
      return [];
    }
  });
}

/**
 * Checks whether a Node-resolved dependency entry is an ES module suitable for a Vite alias.
 *
 * `require.resolve()` selects a package's CommonJS entry when it has conditional exports. Aliasing
 * that file bypasses Vite's package resolution and makes the SSR module runner evaluate `require()`
 * inside ESM. Leave CommonJS entries as package imports so Vite and Node retain their interop path.
 *
 * @param entry Resolved dependency entry selected by the consumer-first package resolver.
 *
 * @returns Whether the entry is an ES module file.
 */
function isEsmDependencyEntry(entry) {
  if (/\.mjs$/i.test(entry)) return true;
  if (/\.cjs$/i.test(entry)) return false;
  let dir = dirname(entry);
  while (dir !== resolve(dir, '..')) {
    try {
      return JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')).type === 'module';
    } catch {
      dir = resolve(dir, '..');
    }
  }
  return false;
}

/**
 * Finds the package manifest owning a resolved entry by walking parent directories.
 *
 * @param name Expected package name used to confirm the owning manifest.
 * @param resolver Module resolver whose installation tree should be searched.
 *
 * @return The matching package manifest, or `null` when resolution or lookup fails.
 */
function dependencyManifest(name, resolver = requireFromPackage) {
  let entry;
  try {
    entry = resolver.resolve(name);
  } catch {
    return null;
  }
  let dir = resolve(entry, '..');
  while (dir !== resolve(dir, '..')) {
    try {
      const manifest = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
      if (manifest.name === name) return manifest;
    } catch {
      // Keep walking through package subdirectories until the owning manifest is found.
    }
    dir = resolve(dir, '..');
  }
  return null;
}

// hygiene-ignore single-use -- Docs package subpath aliases require their own export-map and ESM validation pass.
/**
 * Creates Vite aliases for Docs runtime dependencies and their concrete exported subpaths.
 *
 * @return Alias records resolved from the Docs package installation.
 */
function packageDependencyAliases() {
  return Object.keys(docsManifest.dependencies ?? {})
    .filter((n) => n !== 'astro' && n !== 'react' && n !== 'react-dom')
    .flatMap((n) => {
      const manifest = dependencyManifest(n);
      if (!manifest) return [];
      return [
        n,
        ...Object.keys(manifest.exports ?? {})
          .filter((key) => key.startsWith('./') && !key.includes('*'))
          .map((key) => `${n}${key.slice(1)}`),
      ].flatMap((specifier) => {
        try {
          const entry = requireFromPackage.resolve(specifier);
          if (!isEsmDependencyEntry(entry)) return [];
          return [
            {
              find: new RegExp(
                `^${specifier.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`,
              ),
              replacement: entry,
            },
          ];
        } catch {
          return [];
        }
      });
    });
}

// hygiene-ignore single-use -- Align Styling peers with the consumer as a distinct deduplication pass.
/**
 * Aligns styling dependencies with the consumer's installation to avoid duplicate runtime packages.
 *
 * @return Alias records for the styling package's non-React peer dependencies.
 */
function stylingDependencyAliases() {
  const stylingManifest =
    projectManifest.name === '@terra-symposium/styling'
      ? projectManifest
      : dependencyManifest('@terra-symposium/styling', requireFromProject);
  if (!stylingManifest) return [];
  return Object.keys(stylingManifest.dependencies ?? {})
    .filter(
      (n) =>
        n !== 'react' && n !== 'react-dom' && (n.includes('react') || ['cmdk', 'vaul'].includes(n)),
    )
    .flatMap((n) => {
      const manifest = dependencyManifest(n, requireFromProject);
      if (!manifest) return [];
      return [
        n,
        ...Object.keys(manifest.exports ?? {})
          .filter((key) => key.startsWith('./') && !key.includes('*'))
          .map((key) => `${n}${key.slice(1)}`),
      ].flatMap((specifier) => {
        try {
          const entry = requireFromProject.resolve(specifier);
          if (!isEsmDependencyEntry(entry)) return [];
          return [
            {
              find: new RegExp(
                `^${specifier.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`,
              ),
              replacement: entry,
            },
          ];
        } catch {
          return [];
        }
      });
    });
}

// hygiene-ignore single-use -- The 404 route registration must stay an independent Astro integration with its override check.
/**
 * Register the one Docs-owned 404 route for every generated Docs site.
 *
 * @returns {import('astro').AstroIntegration} Integration that reserves and injects the 404 route.
 */
function docsNotFoundRoute() {
  return {
    name: 'terra-docs-not-found',
    hooks: {
      'astro:config:setup': ({ config, injectRoute }) => {
        for (const ext of ['astro', 'md', 'mdx']) {
          const override = fileURLToPath(new URL(`pages/404.${ext}`, config.srcDir));
          if (existsSync(override))
            throw new Error(`Docs owns the 404 route; remove the host override: ${override}`);
        }
        injectRoute({
          pattern: '/404',
          entrypoint: fileURLToPath(new URL('../src/routes/404.astro', import.meta.url)),
        });
      },
    },
  };
}

export default defineConfig({
  root: consumerRoot,
  srcDir: resolve(packageRoot, 'site/src'),
  publicDir: resolve(projectRoot, 'dist/public'),
  outDir: resolve(projectRoot, process.env.DOCS_OUT ?? 'dist/docs'),
  ...(site ? { site } : {}),
  base,
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  redirects: Object.fromEntries([
    ['/consumer/1-usage/2-tree-handling', '/consumer/1-usage/0-tree'],
    ['/consumer/1-usage/1-authoring', '/consumer/1-usage/1-leaf'],
    ['/consumer/1-usage/0-authoring', '/consumer/1-usage/1-leaf'],
    ['/consumer/1-usage/3-posterity', '/consumer/1-usage/1-leaf'],
    ['/consumer/1-usage/0-syntax', '/consumer/1-usage/2-blocks'],
    ['/consumer/1-usage/1-syntax', '/consumer/1-usage/2-blocks'],
    ...readdirSync(resolve(packageRoot, 'docs/consumer/1-usage/2-blocks'))
      .filter((name) => name.endsWith('.md') && name !== 'index.md')
      .flatMap((name) =>
        ['0-syntax', '1-syntax'].map((prefix) => [
          `/consumer/1-usage/${prefix}/${name.slice(0, -3)}`,
          `/consumer/1-usage/2-blocks/${name.slice(0, -3)}`,
        ]),
      ),
  ]),
  integrations: [
    __terraErrorBoundaryIntegration({
      endpoint: reportEndpoint,
      site: reportSite,
      delivery: reporting?.delivery ?? 'http',
    }),
    docsNotFoundRoute(),
    react(),
    mdx(),
  ],
  markdown: { processor: unified({ remarkPlugins: [[basePathRemarkPlugin, { base }]] }) },
  vite: {
    plugins: [
      docsContentPlugin({ root: projectRoot, base }),
      ...(resolve(consumerRoot) === resolve(packageRoot)
        ? [localSourceRebuildPlugin({ root: packageRoot })]
        : []),
    ],
    optimizeDeps: {
      include: [...DOCS_VITE_OPTIMIZE_DEPS, 'react', 'react/jsx-runtime', 'react-dom/client'],
    },
    resolve: {
      // Astro's virtual build entries are resolved from the consumer project
      // root. Consumers only need the Docs package, so map Astro's exported
      // subpaths to the installation shipped with Docs.
      alias: [
        ...stylingAlias(),
        ...packageExportAliases(),
        ...createProjectExportAliases(docsManifest, packageRoot),
        ...astroPackageExportAliases(),
        ...astroDependencyAliases(),
        ...packageDependencyAliases(),
        ...stylingDependencyAliases(),
      ],
    },
    ssr: {
      // Let React resolve as one external module for both Vite components and
      // ReactDOM's server renderer; absolute aliases bundle a second dispatcher.
      noExternal: ['@terra-symposium/styling', '@terra-symposium/boundaries', /^@radix-ui\//],
    },
    server: { fs: { allow: [projectRoot, consumerRoot, packageRoot] } },
  },
});

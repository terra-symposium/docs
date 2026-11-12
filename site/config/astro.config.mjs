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
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/standards-error-boundaries/astro-integration';
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

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates Vite aliases for package entry points declared by the consuming project's exports map.
 *
 * @return Alias records for concrete and wildcard project exports that target local files.
 */
function packageExportAliases() {
  return createProjectExportAliases(projectManifest, consumerRoot);
}

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

export default defineConfig({
  root: projectRoot,
  srcDir: resolve(packageRoot, 'site/src'),
  publicDir: resolve(projectRoot, 'dist/public'),
  outDir: resolve(projectRoot, process.env.DOCS_OUT ?? 'dist/docs'),
  ...(site ? { site } : {}),
  base,
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  integrations: [__terraErrorBoundaryIntegration(), react(), mdx()],
  markdown: { processor: unified({ remarkPlugins: [[basePathRemarkPlugin, { base }]] }) },
  vite: {
    plugins: [docsContentPlugin({ root: projectRoot, base })],
    optimizeDeps: { include: [...DOCS_VITE_OPTIMIZE_DEPS] },
    resolve: {
      // Astro's virtual build entries are resolved from the consumer project
      // root. Consumers only need the Docs package, so map Astro's exported
      // subpaths to the installation shipped with Docs.
      alias: [
        ...packageExportAliases(),
        ...createProjectExportAliases(docsManifest, packageRoot),
        ...astroPackageExportAliases(),
        ...astroDependencyAliases(),
        ...packageDependencyAliases(),
        ...stylingDependencyAliases(),
      ],
      // Use the consumer's React installation once, while leaving `server`
      // subpaths unaliased so Vite can select their environment-specific entry.
      dedupe: ['react', 'react-dom'],
    },
    ssr: {
      optimizeDeps: { include: ['react', 'react-dom', 'react-dom/server'] },
      noExternal: ['@terra-symposium/styling', '@terra-symposium/standards-error-boundaries'],
    },
    server: { fs: { allow: [projectRoot, consumerRoot, packageRoot] } },
  },
});

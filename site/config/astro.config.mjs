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
import { createRequire } from 'node:module';
import { defineConfig } from 'astro/config';
import { dirname, resolve } from 'node:path';
import { docsContentPlugin } from '../docs-content-plugin.mjs';
import {
  createConsumerProject,
  createProjectExportAliases,
  resolveConsumerDependency,
} from '../project-config.mjs';
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
const astroPackageRoot = dirname(astroManifestPath);
const requireFromAstro = createRequire(astroManifestPath);
const docsManifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const projectRoot = process.env.DOCS_ROOT ?? process.cwd();
const publicDir = resolve(projectRoot, 'dist/public');
const outDir = resolve(projectRoot, process.env.DOCS_OUT ?? 'dist/docs');
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
 * @returns Alias records for concrete and wildcard project exports that target local files.
 */
function packageExportAliases() {
  return createProjectExportAliases(projectManifest, consumerRoot);
}

/**
 * Resolves Astro's internal MDX runtime and public non-wildcard exports from the Docs installation.
 * @returns Vite alias records that keep Astro imports on the package's compatible runtime.
 */
function astroPackageExportAliases() {
  return [
    {
      // Astro's MDX renderer imports this internal runtime path, which Astro
      // does not expose through package exports. Resolve it from Docs' Astro.
      find: /^astro\/runtime\/(.+)$/,
      replacement: resolve(astroPackageRoot, 'dist/runtime/$1'),
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
 * @returns Vite aliases for Astro's direct dependencies used by its client optimizer.
 */
function astroDependencyAliases() {
  return Object.keys(astroManifest.dependencies ?? {}).flatMap((n) => {
    try {
      return [
        {
          find: new RegExp(`^${n.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`),
          replacement: resolveConsumerDependency(requireFromProject, requireFromAstro, n),
        },
      ];
    } catch {
      return [];
    }
  });
}

/**
 * Finds the package manifest owning a resolved entry by walking parent directories.
 * @param name Expected package name used to confirm the owning manifest.
 * @param resolver Module resolver whose installation tree should be searched.
 * @returns The matching package manifest, or `null` when resolution or lookup fails.
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
    const manifestPath = resolve(dir, 'package.json');
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
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
 * @returns Alias records resolved from the Docs package installation.
 */
function packageDependencyAliases() {
  return Object.keys(docsManifest.dependencies ?? {})
    .filter((n) => n !== 'astro')
    .flatMap((n) => {
      const manifest = dependencyManifest(n);
      if (!manifest) return [];
      const subpaths = Object.keys(manifest.exports ?? {}).filter(
        (key) => key.startsWith('./') && !key.includes('*'),
      );
      return [n, ...subpaths.map((key) => `${n}${key.slice(1)}`)].flatMap((specifier) => {
        try {
          return [
            {
              find: new RegExp(
                `^${specifier.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`,
              ),
              replacement: requireFromPackage.resolve(specifier),
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
 * @returns Alias records for the styling package's non-React peer dependencies.
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
      const subpaths = Object.keys(manifest.exports ?? {}).filter(
        (key) => key.startsWith('./') && !key.includes('*'),
      );
      return [n, ...subpaths.map((key) => `${n}${key.slice(1)}`)].flatMap((specifier) => {
        try {
          return [
            {
              find: new RegExp(
                `^${specifier.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`,
              ),
              replacement: requireFromProject.resolve(specifier),
            },
          ];
        } catch {
          return [];
        }
      });
    });
}

/**
 * Resolves React entry points from the consumer when available and supplies the browser server renderer.
 * @returns Vite aliases that keep Docs UI and its consumer on one React runtime.
 */
function sharedReactAliases() {
  const specifiers = [
    'react',
    'react/compiler-runtime',
    'react/jsx-dev-runtime',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
  ];
  return [
    ...specifiers.map((s) => {
      // Prefer the consumer's React, with Docs supplying it to content-only hosts.
      const replacement = resolveConsumerDependency(requireFromProject, requireFromPackage, s);
      return {
        find: new RegExp(`^${s.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&')}$`),
        replacement,
      };
    }),
    {
      // The Docs editor imports `react-dom/server` for Markdown previews. Its
      // Node entrypoint pulls `util.TextEncoder` into browser chunks, where
      // `util` is externalized and the Docs workspace fails to hydrate. The
      // browser server renderer also works during Node prerendering.
      find: /^react-dom\/server$/,
      replacement: resolveConsumerDependency(
        requireFromProject,
        requireFromPackage,
        'react-dom/server.browser',
      ),
    },
  ];
}
export default defineConfig({
  root: projectRoot,
  srcDir: resolve(packageRoot, 'site/src'),
  publicDir,
  outDir,
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
        ...sharedReactAliases(),
        ...astroPackageExportAliases(),
        ...astroDependencyAliases(),
        ...packageDependencyAliases(),
        ...stylingDependencyAliases(),
      ],
      dedupe: ['react', 'react-dom'],
    },
    ssr: {
      // Bundle the shared UI packages while retaining their peer runtime.
      noExternal: ['@terra-symposium/styling', '@terra-symposium/standards-error-boundaries'],
    },
    server: { fs: { allow: [projectRoot, consumerRoot, packageRoot] } },
  },
});

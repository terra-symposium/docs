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
const sourceDevelopment = process.env.DOCS_SOURCE_DEV === 'true';
const docsSiteAliases = [
  {
    find: '#docs-site-workspace',
    replacement: resolve(
      packageRoot,
      sourceDevelopment
        ? 'src/components/StaticWorkspace.tsx'
        : 'dist/lib/components/StaticWorkspace.js',
    ),
  },
  {
    find: '#docs-site-style',
    replacement: resolve(
      packageRoot,
      sourceDevelopment ? 'src/styles/style.css' : 'dist/lib/style.css',
    ),
  },
];
const site = process.env.DOCS_SITE;
const base = process.env.DOCS_BASE ?? '/';
const consumerProject = createConsumerProject(projectRoot, process.env.DOCS_PACKAGE_ROOT ?? '.');
const consumerRoot = consumerProject.root;
const projectManifest = consumerProject.manifest;
const requireFromProject = consumerProject.require;
const sourceTailwindConfig = sourceDevelopment
  ? (await import('../../config/tailwind.docs.config.mjs')).default
  : undefined;
const sourceCssPlugins = sourceDevelopment
  ? [
      requireFromPackage('postcss-import')(),
      requireFromPackage('tailwindcss/nesting')(),
      requireFromPackage('tailwindcss')(sourceTailwindConfig),
    ]
  : undefined;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Aliases exports from the content site's own package to its local sources.
 *
 * @return Vite aliases for the site's package exports.
 */
function packageExportAliases() {
  return createProjectExportAliases(projectManifest, consumerRoot);
}

/**
 * Checks whether the site package owns the dependency selected for its runtime.
 *
 * This avoids treating an unrelated pnpm workspace hoist as the site's React installation.
 *
 * @param name Package name to check.
 *
 * @return Whether the site package declares this dependency.
 */
function projectDeclaresDependency(name) {
  return ['dependencies', 'devDependencies', 'peerDependencies'].some(
    (s) => projectManifest[s]?.[name],
  );
}

/**
 * Checks whether the consumer explicitly owns the complete Docs UI runtime.
 *
 * React, ReactDOM, and Styling must come from one installation so their hooks share a dispatcher.
 *
 * @return Whether the project declares React, ReactDOM, and Styling directly.
 */
function projectOwnsSharedUiRuntime() {
  return (
    projectManifest.name === '@terra-symposium/styling' ||
    (projectDeclaresDependency('@terra-symposium/styling') &&
      projectDeclaresDependency('react') &&
      projectDeclaresDependency('react-dom'))
  );
}

/**
 * Escapes literal text before it is used as a Vite alias regular expression.
 *
 * @param value Literal package name or export path.
 *
 * @return The value with regular-expression metacharacters escaped.
 */
function escapeRegex(value) {
  return value.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&');
}

/**
 * Resolves Astro export paths from the installation used by Docs.
 *
 * @return Vite aliases for Astro's public exports and runtime entrypoints.
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
 * Reads the package manifest for a specifier resolved by the provided module loader.
 *
 * @param name Expected package name.
 * @param resolver Resolver rooted at the package installation to inspect.
 *
 * @return The matching package manifest, or null when it cannot be resolved.
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
 * Maps Docs dependencies to one consistent package-manager installation.
 *
 * @return Vite aliases for the public exports of Docs dependencies.
 */
function packageDependencyAliases() {
  return Object.keys(docsManifest.dependencies ?? {})
    .filter((n) => n !== 'astro')
    .flatMap((n) => {
      const resolver =
        projectOwnsSharedUiRuntime() &&
        ['@terra-symposium/styling', 'react', 'react-dom'].includes(n)
          ? requireFromProject
          : requireFromPackage;
      const manifest = dependencyManifest(n, resolver);
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
              replacement: resolver.resolve(specifier),
            },
          ];
        } catch {
          return [];
        }
      });
    });
}

/**
 * Keeps Styling's React-aware dependencies beside the selected Styling package.
 *
 * @return Vite aliases for Styling and its React-related dependency graph.
 */
function stylingDependencyAliases() {
  const resolveStylingFrom = projectOwnsSharedUiRuntime() ? requireFromProject : requireFromPackage;
  const stylingManifest =
    projectManifest.name === '@terra-symposium/styling'
      ? projectManifest
      : dependencyManifest('@terra-symposium/styling', resolveStylingFrom);
  if (!stylingManifest) return [];
  const requireFromStyling =
    projectManifest.name === '@terra-symposium/styling'
      ? requireFromProject
      : createRequire(resolveStylingFrom.resolve('@terra-symposium/styling'));
  const visited = new Set(['react', 'react-dom']);
  /**
   * Recursively aliases dependencies whose installed React peers must resolve beside Styling.
   *
   * @param name - Styling dependency currently being examined.
   * @param resolver - Module resolver rooted at the installation that owns this dependency.
   *
   * @return Vite aliases for its public entries and React-aware transitive dependencies.
   */
  function dependencyAliases(name, resolver) {
    if (visited.has(name)) return [];
    visited.add(name);
    let entry;
    try {
      entry = resolver.resolve(name);
    } catch {
      return [];
    }
    const manifest = dependencyManifest(name, resolver);
    if (!manifest) return [];
    const sharesReactRuntime =
      name.includes('react') ||
      name.startsWith('@radix-ui/') ||
      manifest.peerDependencies?.react ||
      manifest.peerDependencies?.['react-dom'];
    const subpaths = sharesReactRuntime
      ? Object.keys(manifest.exports ?? {}).filter((k) => k.startsWith('./') && !k.includes('*'))
      : [];
    const aliases = sharesReactRuntime
      ? [name, ...subpaths.map((k) => `${name}${k.slice(1)}`)].flatMap((s) => {
          try {
            return [{ find: new RegExp(`^${escapeRegex(s)}$`), replacement: resolver.resolve(s) }];
          } catch {
            return [];
          }
        })
      : [];
    const requireFromDependency = createRequire(entry);
    const nested = Object.keys(manifest.dependencies ?? {}).flatMap((d) =>
      dependencyAliases(d, requireFromDependency),
    );
    return [...aliases, ...nested];
  }
  return Object.keys(stylingManifest.dependencies ?? {})
    .filter(
      (n) =>
        n !== 'react' && n !== 'react-dom' && (n.includes('react') || ['cmdk', 'vaul'].includes(n)),
    )
    .flatMap((n) => dependencyAliases(n, requireFromStyling));
}

/**
 * Selects one React runtime for bundled and externalized Docs UI components.
 *
 * @return Vite aliases for React, ReactDOM, and browser-side Markdown rendering.
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
      const replacement = (
        projectOwnsSharedUiRuntime() ? requireFromProject : requireFromPackage
      ).resolve(s);
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
      replacement: (projectOwnsSharedUiRuntime() ? requireFromProject : requireFromPackage).resolve(
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
    ...(sourceCssPlugins ? { css: { postcss: { plugins: sourceCssPlugins } } } : {}),
    optimizeDeps: { include: [...DOCS_VITE_OPTIMIZE_DEPS] },
    resolve: {
      // Astro's virtual build entries are resolved from the consumer project
      // root. Consumers only need the Docs package, so map Astro's exported
      // subpaths to the installation shipped with Docs.
      alias: [
        ...docsSiteAliases,
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
      // Bundle Styling and Radix so their React peer imports pass through the shared aliases.
      noExternal: [
        '@terra-symposium/styling',
        '@terra-symposium/standards-error-boundaries',
        /^@radix-ui\/react-/,
      ],
    },
    server: { fs: { allow: [projectRoot, consumerRoot, packageRoot] } },
  },
});

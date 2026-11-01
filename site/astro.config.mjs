import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/standards-error-boundaries/astro-integration';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import { DOCS_VITE_OPTIMIZE_DEPS } from '../lib-dist/lib/astro.js';
import { basePathRemarkPlugin } from './base-path-remark-plugin.mjs';
import { docsContentPlugin } from './docs-content-plugin.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const requireFromPackage = createRequire(import.meta.url);
const astroManifest = JSON.parse(
  readFileSync(requireFromPackage.resolve('astro/package.json'), 'utf8'),
);
const docsManifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const projectRoot = process.env.TERRA_DOCS_ROOT ?? process.cwd();
const publicDir = resolve(projectRoot, '.terra-docs/public');
const outDir = resolve(projectRoot, process.env.TERRA_DOCS_OUT ?? 'dist/docs');
const site = process.env.TERRA_DOCS_SITE;
const base = process.env.TERRA_DOCS_BASE ?? '/';
const projectManifest = (() => {
  try {
    return JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
  } catch {
    return {};
  }
})();
const requireFromProject = createRequire(resolve(projectRoot, 'package.json'));

function packageExportAliases() {
  if (!projectManifest.name || !projectManifest.exports) return [];
  const escapeRegex = (value) => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  return Object.entries(projectManifest.exports).flatMap(([key, value]) => {
    const target = typeof value === 'string' ? value : (value?.import ?? value?.default);
    if (!target?.startsWith('./')) return [];
    const prefix = projectManifest.name + (key === '.' ? '' : key.slice(1));
    if (key.includes('*')) {
      const matcher = new RegExp(`^${escapeRegex(prefix).replace('*', '(.+)')}$`);
      return [{ find: matcher, replacement: resolve(projectRoot, target.replace('*', '$1')) }];
    }
    return [
      { find: new RegExp(`^${escapeRegex(prefix)}$`), replacement: resolve(projectRoot, target) },
    ];
  });
}

function astroPackageExportAliases() {
  return Object.keys(astroManifest.exports)
    .filter((key) => key.startsWith('./') && !key.includes('*'))
    .map((key) => {
      const specifier = `astro${key.slice(1)}`;
      try {
        requireFromProject.resolve(specifier);
        return null;
      } catch {
        // Package-owned Astro installation is the fallback for content-only repos.
      }
      return {
        find: new RegExp(`^${specifier.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')}$`),
        replacement: requireFromPackage.resolve(specifier),
      };
    })
    .filter(Boolean);
}

function packageDependencyAliases() {
  return Object.keys(docsManifest.dependencies ?? {})
    .filter((name) => name !== 'astro')
    .flatMap((name) => {
      const manifestPath = resolve(packageRoot, 'node_modules', name, 'package.json');
      let dependencyManifest;
      try {
        dependencyManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch {
        return [];
      }
      const subpaths = Object.keys(dependencyManifest.exports ?? {}).filter(
        (key) => key.startsWith('./') && !key.includes('*'),
      );
      return [name, ...subpaths.map((key) => `${name}${key.slice(1)}`)].flatMap((specifier) => {
        try {
          return [
            {
              find: new RegExp(`^${specifier.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')}$`),
              replacement: requireFromPackage.resolve(specifier),
            },
          ];
        } catch {
          return [];
        }
      });
    });
}

function sharedReactAliases() {
  const specifiers = [
    'react',
    'react/compiler-runtime',
    'react/jsx-dev-runtime',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    'react-dom/server',
  ];
  return specifiers.map((specifier) => {
    return {
      find: new RegExp(`^${specifier.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')}$`),
      replacement: requireFromPackage.resolve(specifier),
    };
  });
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
        ...sharedReactAliases(),
        ...astroPackageExportAliases(),
        ...packageDependencyAliases(),
      ],
      dedupe: ['react', 'react-dom'],
    },
    ssr: {
      // Bundle React peer consumers with the package-owned React runtime so
      // static rendering does not load two copies across pnpm virtual stores.
      noExternal: ['@terra-symposium/styling', '@terra-symposium/standards-error-boundaries'],
    },
    server: { fs: { allow: [projectRoot, packageRoot] } },
  },
});

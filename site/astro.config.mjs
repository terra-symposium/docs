import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import { basePathRemarkPlugin } from './base-path-remark-plugin.mjs';
import { docsContentPlugin } from './docs-content-plugin.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const requireFromPackage = createRequire(import.meta.url);
const projectRoot = process.env.TERRA_DOCS_ROOT ?? process.cwd();
const publicDir = resolve(projectRoot, '.terra-docs/public');
const outDir = resolve(projectRoot, process.env.TERRA_DOCS_OUT ?? 'docs-dist');
const site = process.env.TERRA_DOCS_SITE;
const base = process.env.TERRA_DOCS_BASE ?? '/';
const projectManifest = (() => {
  try {
    return JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
  } catch {
    return {};
  }
})();

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

const packageDependencyResolver = {
  name: 'terra-docs-package-dependencies',
  enforce: 'pre',
  resolveId(source) {
    if (!/^(?:astro|@astrojs\/(?:markdown-remark|mdx|react))(?:\/|$)/.test(source)) return null;
    try {
      return requireFromPackage.resolve(source);
    } catch {
      return null;
    }
  },
};

export default defineConfig({
  root: projectRoot,
  srcDir: resolve(packageRoot, 'site/src'),
  publicDir,
  outDir,
  ...(site ? { site } : {}),
  base,
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  integrations: [react({ experimentalDisableStreaming: true }), mdx()],
  markdown: { processor: unified({ remarkPlugins: [[basePathRemarkPlugin, { base }]] }) },
  vite: {
    plugins: [packageDependencyResolver, docsContentPlugin({ root: projectRoot, base })],
    resolve: { alias: packageExportAliases() },
    server: { fs: { allow: [projectRoot, packageRoot] } },
  },
});

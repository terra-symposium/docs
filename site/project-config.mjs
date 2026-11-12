/**
 * site/project-config.mjs
 * Consumer package metadata and module resolution for the shared Docs site.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import * as TerraQualityRegex from '../src/lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Loads the consumer's package metadata without changing the root that owns site content and output.
 *
 * @param siteRoot Directory used by Astro for pages, public assets, and generated output.
 * @param packageRoot Consumer package directory, absolute or relative to the site root.
 * @returns Consumer root, its parsed manifest when present, and a resolver based there.
 */
export function createConsumerProject(siteRoot, packageRoot = '.') {
  const consumerRoot = resolve(siteRoot, packageRoot);
  const manifestPath = resolve(consumerRoot, 'package.json');
  const manifest = (() => {
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      return {};
    }
  })();
  return { root: consumerRoot, manifest, require: createRequire(manifestPath) };
}

/**
 * Creates aliases for importable files declared in the consumer's package export map.
 *
 * @param manifest Consumer package manifest containing the public exports map.
 * @param packageRoot Directory against which relative export targets are resolved.
 * @returns Vite aliases for concrete and wildcard export paths that point to local files.
 */
export function createProjectExportAliases(manifest, packageRoot) {
  if (!manifest.name || !manifest.exports) return [];
  /**
   * Escapes a package specifier fragment for use as a regular-expression literal.
   * @param value Export-map prefix to match exactly.
   * @returns The prefix with every regular-expression metacharacter escaped.
   */
  const escapeRegex = (value) => value.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&');
  return Object.entries(manifest.exports).flatMap(([k, e]) => {
    const target = typeof e === 'string' ? e : (e?.import ?? e?.default);
    if (!target?.startsWith('./')) return [];
    const prefix = manifest.name + (k === '.' ? '' : k.slice(1));
    if (k.includes('*')) {
      const [prefixStart, prefixEnd = ''] = prefix.split('*');
      return [
        {
          find: new RegExp(`^${escapeRegex(prefixStart)}(.+)${escapeRegex(prefixEnd)}$`),
          replacement: resolve(packageRoot, target.replace('*', '$1')),
        },
      ];
    }
    return [
      { find: new RegExp(`^${escapeRegex(prefix)}$`), replacement: resolve(packageRoot, target) },
    ];
  });
}

/**
 * Resolves a dependency from the consumer first and from Docs when it is provided as a peer.
 *
 * @param consumerRequire Resolver rooted at the consumer's package manifest.
 * @param docsRequire Resolver rooted at the shared Docs installation.
 * @param specifier Package entry requested by the Astro or Vite integration.
 * @returns The consumer-owned entry when available, otherwise the Docs package entry.
 */
export function resolveConsumerDependency(consumerRequire, docsRequire, specifier) {
  try {
    return consumerRequire.resolve(specifier);
  } catch {
    return docsRequire.resolve(specifier);
  }
}

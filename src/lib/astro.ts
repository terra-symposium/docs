/**
 * src/lib/astro.ts
 * Vite dependencies that must be pre-bundled when an Astro React island loads
 * the published Docs package. Astro's island loader does not reliably expose
 * these package imports to Vite's dependency crawler, so each public JavaScript Docs entrypoint
 * and its nested CommonJS dependencies is optimized explicitly.
 */

/**
 * Checks a direct package import before adding its specifier to Vite's optimizer list.
 *
 * @param specifier Dependency specifier passed to Vite, including an optional parent edge.
 * @param resolvedImport Import URL resolved from the Docs package's Node context.
 * @return The unchanged Vite specifier after confirming its package is installed.
 * @throws Error when the dependency does not resolve to a local package file.
 */
const resolvablePrebundle = (specifier: string, resolvedImport: string): string => {
  if (!resolvedImport.startsWith('file:'))
    throw new Error(`Vite prebundle dependency did not resolve to a package file: ${specifier}`);
  return specifier;
};

export const DOCS_VITE_OPTIMIZE_DEPS = [
  '@terra-symposium/docs',
  '@terra-symposium/docs/astro',
  '@terra-symposium/docs/local-workspace',
  // Docs imports shared UI and hue utilities from this peer package. Include
  // it as a root so Vite also pre-bundles its CommonJS runtime dependencies.
  '@terra-symposium/styling',
  '@terra-symposium/styling > bezier-easing',
  '@terra-symposium/standards-error-boundaries/react',
  // Also expose the CommonJS package as a root entry. Some consumer Vite
  // roots do not discover the nested edge when styling is loaded lazily.
  resolvablePrebundle('bezier-easing', import.meta.resolve('bezier-easing')),
  'react',
  'react-dom/client',
  'react-dom',
  resolvablePrebundle(
    '@terra-symposium/docs > @xstate/react',
    import.meta.resolve('@xstate/react'),
  ),
  resolvablePrebundle(
    '@terra-symposium/docs > use-sync-external-store/shim',
    import.meta.resolve('use-sync-external-store/shim'),
  ),
  resolvablePrebundle(
    '@terra-symposium/docs > use-sync-external-store/shim/with-selector',
    import.meta.resolve('use-sync-external-store/shim/with-selector'),
  ),
  '@terra-symposium/docs > @carbon/icons-react',
  '@terra-symposium/docs > @dagrejs/dagre',
  '@terra-symposium/docs > @portabletext/editor',
  '@terra-symposium/docs > @xyflow/react',
  'react/compiler-runtime',
  'react-dom/server',
] as const;

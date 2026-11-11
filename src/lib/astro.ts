/**
 * src/lib/astro.ts
 * Vite dependencies that must be pre-bundled when an Astro React island loads
 * the published Docs package. Astro's island loader does not reliably expose
 * these package imports to Vite's dependency crawler, so each public JavaScript Docs entrypoint
 * and its nested CommonJS dependencies is optimized explicitly.
 */

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
  'bezier-easing',
  'react',
  'react-dom/client',
  'react-dom',
  '@terra-symposium/docs > @xstate/react',
  '@terra-symposium/docs > use-sync-external-store/shim',
  '@terra-symposium/docs > use-sync-external-store/shim/with-selector',
  '@terra-symposium/docs > @carbon/icons-react',
  '@terra-symposium/docs > @dagrejs/dagre',
  '@terra-symposium/docs > @portabletext/editor',
  '@terra-symposium/docs > @xyflow/react',
  'react/compiler-runtime',
  'react-dom/server',
] as const;

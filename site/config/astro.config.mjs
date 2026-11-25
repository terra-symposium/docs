import { terraErrorBoundaryIntegration as __terraErrorBoundaryIntegration } from '@terra-symposium/boundaries/astro-integration';
import { fileURLToPath, URL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import process from 'node:process';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import { DOCS_VITE_OPTIMIZE_DEPS } from '../../dist/lib/lib/astro.js';
import { basePathRemarkPlugin } from '../base-path-remark-plugin.mjs';
import { docsContentPlugin } from '../docs-content-plugin.mjs';
const G_REGEX = () => /[|\\{}()[\]^$+?.]/g;

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const requireFromPackage = createRequire(import.meta.url);
const astroManifestPath = requireFromPackage.resolve('astro/package.json');
const projectRoot = process.env.DOCS_ROOT ?? process.cwd();
const site = process.env.DOCS_SITE;
const base = process.env.DOCS_BASE ?? '/';
const projectManifest = (() => {
	try {
		return JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
	} catch {
		return {};
	}
})();
const requireFromProject = createRequire(resolve(projectRoot, 'package.json'));
/** Resolves this project's declared package exports to its source tree during a Docs build.
 *
 * @return Vite aliases for each concrete project export.
 */
export function packageExportAliases() {
	if (!projectManifest.name || !projectManifest.exports) return [];
	const escapeRegex = value => value.replace(G_REGEX(), '\\$&');
	return Object.entries(projectManifest.exports).flatMap(([key, value]) => {
		const target = typeof value === 'string' ? value : (value?.import ?? value?.default);
		if (!target?.startsWith('./')) return [];
		const prefix = projectManifest.name + (key === '.' ? '' : key.slice(1));
		if (key.includes('*')) return [{ find: new RegExp(`^${escapeRegex(prefix).replace('*', '(.+)')}$`), replacement: resolve(projectRoot, target.replace('*', '$1')) }];
		return [{ find: new RegExp(`^${escapeRegex(prefix)}$`), replacement: resolve(projectRoot, target) }];
	});
}

/** Resolves Astro's public subpaths and the MDX runtime path from Docs' installed Astro.
 *
 * @return Vite aliases backed by the Astro dependency shipped with Docs.
 */
export function astroPackageExportAliases() {
	return [
		{
			// Astro's MDX renderer imports this internal runtime path, which Astro
			// does not expose through package exports. Resolve it from Docs' Astro.
			find: /^astro\/runtime\/(.+)$/,
			replacement: resolve(dirname(astroManifestPath), 'dist/runtime/$1'),
		},
		...Object.keys(JSON.parse(readFileSync(astroManifestPath, 'utf8')).exports)
			.filter(key => key.startsWith('./') && !key.includes('*'))
			.map(key => {
				const specifier = `astro${key.slice(1)}`;
				return {
					find: new RegExp(`^${specifier.replace(G_REGEX(), '\\$&')}$`),
					replacement: requireFromPackage.resolve(specifier),
				};
			}),
	];
}

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

/** Resolves the Docs package's dependencies from its installation for consumer-root builds.
 *
 * @return Vite aliases for installed dependencies and their concrete subpaths.
 */
export function packageDependencyAliases() {
	return Object.keys(JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')).dependencies ?? {})
		.filter(name => name !== 'astro')
		.flatMap(name => {
			const manifest = dependencyManifest(name);
			if (!manifest) return [];
			return [
				name,
				...Object.keys(manifest.exports ?? {})
					.filter(key => key.startsWith('./') && !key.includes('*'))
					.map(key => `${name}${key.slice(1)}`),
			].flatMap(specifier => {
				try {
					return [
						{
							find: new RegExp(`^${specifier.replace(G_REGEX(), '\\$&')}$`),
							replacement: requireFromPackage.resolve(specifier),
						},
					];
				} catch {
					return [];
				}
			});
		});
}

/** Ensures browser React dependencies imported by Styling resolve from the consumer project.
 *
 * @return Vite aliases for Styling's React-related dependencies.
 */
export function stylingDependencyAliases() {
	const stylingManifest = projectManifest.name === '@terra-symposium/styling' ? projectManifest : dependencyManifest('@terra-symposium/styling', requireFromProject);
	if (!stylingManifest) return [];
	return Object.keys(stylingManifest.dependencies ?? {})
		.filter(name => name !== 'react' && name !== 'react-dom' && (name.includes('react') || ['cmdk', 'vaul'].includes(name)))
		.flatMap(name => {
			const manifest = dependencyManifest(name, requireFromProject);
			if (!manifest) return [];
			return [
				name,
				...Object.keys(manifest.exports ?? {})
					.filter(key => key.startsWith('./') && !key.includes('*'))
					.map(key => `${name}${key.slice(1)}`),
			].flatMap(specifier => {
				try {
					return [
						{
							find: new RegExp(`^${specifier.replace(G_REGEX(), '\\$&')}$`),
							replacement: requireFromProject.resolve(specifier),
						},
					];
				} catch {
					return [];
				}
			});
		});
}

/** Uses the browser renderer for Markdown preview bundles to avoid Node-only imports.
 *
 * @return The browser-safe React DOM server alias.
 */
export function sharedReactAliases() {
	// Markdown preview code reaches the renderer from browser bundles. Keep its
	// browser entry point so Node's `util` dependency does not enter client code.
	return [
		{
			find: /^react-dom\/server$/,
			replacement: requireFromProject.resolve('react-dom/server.browser'),
		},
	];
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
			alias: [...packageExportAliases(), ...sharedReactAliases(), ...astroPackageExportAliases(), ...packageDependencyAliases(), ...stylingDependencyAliases()],
			dedupe: ['react', 'react-dom'],
		},
		ssr: {
			external: ['react', 'react-dom'],
			noExternal: ['@terra-symposium/styling', '@terra-symposium/boundaries'],
		},
		server: { fs: { allow: [projectRoot, packageRoot] } },
	},
});

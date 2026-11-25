#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { spawn } from 'node:child_process';
import * as console from 'node:console';
import { watch } from 'node:fs';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import * as TerraQualityRegex from '../src/lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const MD_MDX_I_REGEX = TerraQualityRegex.REGEX_MD_MDX_I_REGEX();
const SKILL_SUFFIX_REGEX = /(?:^|\/)SKILL$/i;
const INDEX_SUFFIX_REGEX = /(?:^|\/)index$/i;
const SLASH_EDGE_REGEX = /^\/+|\/+$/g;
const FIRST_HEADING_REGEX = /^#\s+(.+?)\s*#*\s*$/m;
const FIRST_UNICODE_LETTER_REGEX = /\b\p{L}/gu;
const INLINE_CODE_REGEX = /`([^`]+)`/g;
const requestedMode = process.argv[2];
const mode = requestedMode === 'docs' ? 'dev' : requestedMode;
const root = resolve(process.cwd());
const args = [
	resolve(dirname(createRequire(import.meta.url).resolve('astro/package.json')), 'bin/astro.mjs'),
	mode,
	'--root',
	root,
	'--config',
	relative(root, resolve(dirname(fileURLToPath(import.meta.url)), '..', 'site/config/astro.config.mjs')),
];
const options = new Map();
const passthrough = [];
for (let index = 3; index < process.argv.length; index += 1) {
	const arg = process.argv[index];
	if (['--title', '--description', '--site', '--base', '--out', '--port', '--host', '--skills', '--agents'].includes(arg)) {
		const value = process.argv[index + 1];
		if (!value || value.startsWith('--')) {
			console.error(`Missing value for ${arg}`);
			process.exit(2);
		}
		options.set(arg, value);
		index += 1;
	} else {
		passthrough.push(arg);
	}
}
const docsRoot = resolve(root, 'docs');
const publicRoot = resolve(root, 'dist/public');
const publicAssetsRoot = resolve(publicRoot, '_docs/assets');
const docsConfig = await readFile(resolve(root, 'package.json'), 'utf8')
	.then(JSON.parse)
	.then(manifest => manifest.docs ?? {})
	.catch(() => ({}));
const searchIndexPath = resolve(publicRoot, '_docs/search-index.json');
const excludedDirs = new Set(['node_modules', '.astro', 'dist']);
const configuredAgents = docsConfig.includeAgents ?? docsConfig.includeSkills ?? true;
if (typeof configuredAgents !== 'boolean') throw new Error('package.json docs.includeAgents must be true or false');
if (options.has('--agents') && options.has('--skills')) throw new Error('Use only one of --agents or --skills');
const agentsOption = options.get('--agents') ?? options.get('--skills');
let includeAgents = configuredAgents;
if (agentsOption === 'true') includeAgents = true;
else if (agentsOption === 'false') includeAgents = false;
else if (agentsOption !== undefined) throw new Error('--skills must be true or false');
const requestedBase = (options.get('--base') ?? docsConfig.base ?? '/').trim();
if (!requestedBase.startsWith('/')) throw new Error('--base must begin with /');
const base = requestedBase.endsWith('/') ? requestedBase : `${requestedBase}/`;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates the search index from visible Docs pages and copies their supporting assets.
 *
 */
async function buildSearchIndex() {
	const files = [];
	const dirs = [{ path: docsRoot, entries: await readdir(docsRoot, { withFileTypes: true }), index: 0 }];
	while (dirs.length > 0) {
		const directory = dirs.at(-1);
		if (directory.index >= directory.entries.length) {
			dirs.pop();
			continue;
		}
		const entry = directory.entries[directory.index++];
		if (entry.name.startsWith('.') || (entry.isDirectory() && excludedDirs.has(entry.name))) continue;
		const path = join(directory.path, entry.name);
		if (entry.isDirectory()) dirs.push({ path, entries: await readdir(path, { withFileTypes: true }), index: 0 });
		else if (['.md', '.mdx'].includes(extname(entry.name).toLowerCase())) {
			files.push({ path, relativePath: relative(docsRoot, path) });
		}
	}
	const visibleFiles = files.filter(file => includeAgents || !isAgentsContent(file.relativePath));
	if (visibleFiles.length === 0) throw new Error('No Markdown files found in docs/. Add docs/index.md to start a Docs site.');
	const misplaced = visibleFiles.filter(file => !['index.md', 'index.mdx'].includes(file.relativePath.toLowerCase()) && !file.relativePath.includes('/'));
	if (misplaced.length)
		throw new Error(`Markdown pages must be grouped in folders directly under docs/ (keep only docs/index.md at the root): ${misplaced.map(file => `docs/${file.relativePath}`).join(', ')}`);
	const routeFiles = new Map();
	const records = [];
	for (const file of visibleFiles) {
		const route = file.relativePath.replace(MD_MDX_I_REGEX, '').replace(SKILL_SUFFIX_REGEX, '').replace(INDEX_SUFFIX_REGEX, '').replace(SLASH_EDGE_REGEX, '');
		const prev = routeFiles.get(route);
		if (prev) throw new Error(`Duplicate Docs route "${route || '/'}": docs/${prev} and docs/${file.relativePath}`);
		routeFiles.set(route, file.relativePath);
		if (route.toLowerCase() === '404') continue;
		const source = await readFile(file.path, 'utf8');
		const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(source);
		let body = source;
		let frontmatter = {};
		if (match) {
			try {
				frontmatter = parse(match[1]) ?? {};
				body = source.slice(match[0].length);
			} catch (err) {
				throw new Error(`Invalid YAML frontmatter: ${err.message}`, { cause: err });
			}
		}
		if (!(frontmatter.sidebar?.hidden ?? frontmatter.hidden ?? frontmatter.visibility === 'hidden'))
			records.push({
				title:
					frontmatter.title ??
					FIRST_HEADING_REGEX.exec(body)?.[1]?.trim() ??
					(file.relativePath.replace(MD_MDX_I_REGEX, '').split('/').at(-1) ?? '').replace(TerraQualityRegex.REGEX_G_REGEX_8(), ' ').replace(FIRST_UNICODE_LETTER_REGEX, letter => letter.toUpperCase()),
				description: frontmatter.description ?? '',
				href: route ? `${base}${route}/` : base,
				text: body
					.replace(/^\s*import\s+.+$/gm, ' ')
					.replace(/^\s*export\s+.+$/gm, ' ')
					.replace(/```[^\n]*\n?/g, ' ')
					.replace(/<[^>]*>/g, ' ')
					.replace(/!??\[([^\]]*)\]\([^)]*\)/g, '$1')
					.replace(INLINE_CODE_REGEX, '$1')
					.replace(/[*_~>#]/g, ' ')
					.replace(TerraQualityRegex.REGEX_S_G_REGEX(), ' ')
					.trim(),
			});
	}
	await rm(publicAssetsRoot, { recursive: true, force: true });
	const assetDirs = [{ path: docsRoot, relativePath: '' }];
	while (assetDirs.length > 0) {
		const directory = assetDirs.pop();
		if (!includeAgents && isAgentsContent(directory.relativePath)) continue;
		for (const entry of await readdir(directory.path, { withFileTypes: true })) {
			if (entry.name.startsWith('.') || (entry.isDirectory() && excludedDirs.has(entry.name))) continue;
			const source = join(directory.path, entry.name);
			const relativePath = directory.relativePath ? join(directory.relativePath, entry.name) : entry.name;
			if (entry.isDirectory()) {
				assetDirs.push({ path: source, relativePath });
				continue;
			}
			if (['.md', '.mdx'].includes(extname(entry.name).toLowerCase())) continue;
			const dest = resolve(publicAssetsRoot, relativePath);
			await mkdir(dirname(dest), { recursive: true });
			await copyFile(source, dest);
		}
	}
	await mkdir(dirname(searchIndexPath), { recursive: true });
	await writeFile(searchIndexPath, `${JSON.stringify(records)}\n`);
}

/**
 * Checks whether a Docs-relative path belongs to the top-level Agents section.
 *
 * @param relativePath Path relative to docs/.
 *
 * @return True when the path is inside docs/agents/.
 */
function isAgentsContent(relativePath) {
	const norm = relativePath.split(sep).join('/');
	return norm === 'agents' || norm.startsWith('agents/');
}

if (!['dev', 'build', 'preview'].includes(mode)) {
	console.error('Usage: docs <docs|dev|build|preview> [--title title] [--description text] [--site url] [--base /path/] [--out directory] [--agents true|false]');
	process.exit(2);
}
if (mode !== 'preview') await buildSearchIndex();
const port = options.get('--port') ?? docsConfig.port;
const host = options.get('--host') ?? docsConfig.host;
if (port) args.push('--port', String(port));
if (host) args.push('--host', host);
args.push(...passthrough);
const child = spawn(process.execPath, args, {
	cwd: root,
	env: {
		...process.env,
		DOCS_ROOT: root,
		DOCS_SITE: options.get('--site') ?? docsConfig.site ?? '',
		DOCS_BASE: base,
		DOCS_OUT: options.get('--out') ?? docsConfig.out ?? 'dist/docs',
		PUBLIC_DOCS_TITLE: options.get('--title') ?? docsConfig.title ?? 'Documentation',
		PUBLIC_DOCS_DESCRIPTION: options.get('--description') ?? docsConfig.description ?? '',
		PUBLIC_DOCS_INCLUDE_AGENTS: String(includeAgents),
	},
	stdio: 'inherit',
});
child.on('error', err => {
	console.error(`Could not start Astro: ${err.message}. Install @terra-symposium/docs in this repository first.`);
	process.exitCode = 1;
});
child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	else process.exitCode = code ?? 1;
});
if (mode === 'dev') {
	let timer;
	try {
		const watcher = watch(docsRoot, { recursive: true }, () => {
			clearTimeout(timer);
			timer = setTimeout(() => buildSearchIndex().catch(error => console.error(error.message)), 100);
		});
		process.on('SIGINT', () => watcher.close());
		process.on('SIGTERM', () => watcher.close());
	} catch (err) {
		console.warn(`Search index updates are disabled: ${err.message}`);
	}
}

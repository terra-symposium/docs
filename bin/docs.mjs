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
import { watch } from 'node:fs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const MD_MDX_I_REGEX = /\.(?:md|mdx)$/i;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const astroPackage = require.resolve('astro/package.json');
const astroCli = resolve(dirname(astroPackage), 'bin/astro.mjs');
const configFile = resolve(packageRoot, 'site/config/astro.config.mjs');
const requestedMode = process.argv[2];
const mode = requestedMode === 'docs' ? 'dev' : requestedMode;
const root = resolve(process.cwd());
const options = new Map();
const passthrough = [];
for (let index = 3; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (
    [
      '--title',
      '--description',
      '--site',
      '--base',
      '--out',
      '--port',
      '--host',
      '--skills',
      '--agents',
    ].includes(argument)
  ) {
    const value = process.argv[index + 1];
    if (!value || value.startsWith('--')) {
      console.error(`Missing value for ${argument}`);
      process.exit(2);
    }
    options.set(argument, value);
    index += 1;
  } else {
    passthrough.push(argument);
  }
}
const docsRoot = resolve(root, 'docs');
const publicRoot = resolve(root, 'dist/public');
const publicAssetsRoot = resolve(publicRoot, '_docs/assets');
const manifest = await readJson(resolve(root, 'package.json')).catch(() => ({}));
const docsConfig = manifest.docs ?? {};
const outputDir = options.get('--out') ?? docsConfig.out ?? 'dist/docs';
const searchIndexPath = resolve(publicRoot, '_docs/search-index.json');
const excludedDirs = new Set(['node_modules', '.astro', 'dist']);
const configuredAgents = docsConfig.includeAgents ?? docsConfig.includeSkills ?? true;
if (typeof configuredAgents !== 'boolean') {
  throw new Error('package.json docs.includeAgents must be true or false');
}
if (options.has('--agents') && options.has('--skills')) {
  throw new Error('Use only one of --agents or --skills');
}
const agentsOption = options.get('--agents') ?? options.get('--skills');
const includeAgents = agentsOption === undefined ? configuredAgents : parseBoolean(agentsOption);
const siteTitle = options.get('--title') ?? docsConfig.title ?? 'Documentation';
const siteDescription = options.get('--description') ?? docsConfig.description ?? '';
const base = normBase(options.get('--base') ?? docsConfig.base ?? '/');
const env = {
  ...process.env,
  DOCS_ROOT: root,
  DOCS_SITE: options.get('--site') ?? docsConfig.site ?? '',
  DOCS_BASE: base,
  DOCS_OUT: outputDir,
  PUBLIC_DOCS_TITLE: siteTitle,
  PUBLIC_DOCS_DESCRIPTION: siteDescription,
  PUBLIC_DOCS_INCLUDE_AGENTS: String(includeAgents),
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Collects Markdown and MDX files beneath a directory while preserving their route-relative paths.
 *
 * @param dir Directory currently being scanned.
 * @param rootDir Root used to calculate each file's relative path.
 *
 * @return Markdown files paired with paths relative to `rootDir`.
 */
async function collectMarkdown(dir, rootDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || (entry.isDirectory() && excludedDirs.has(entry.name)))
      continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(path, rootDir)));
    else if (['.md', '.mdx'].includes(extname(entry.name).toLowerCase()))
      files.push({ path, relativePath: relative(rootDir, path) });
  }
  return files;
}

/**
 * Creates the search index from visible Docs pages and copies their supporting assets.
 *
 */
async function buildSearchIndex() {
  const files = (await collectMarkdown(docsRoot)).filter(
    (file) => includeAgents || !isAgentsContent(file.relativePath),
  );
  if (files.length === 0)
    throw new Error('No Markdown files found in docs/. Add docs/index.md to start a Docs site.');
  const misplaced = files.filter((file) => {
    const isRootIndex = ['index.md', 'index.mdx'].includes(file.relativePath.toLowerCase());
    return !isRootIndex && !file.relativePath.includes('/');
  });
  if (misplaced.length) {
    const paths = misplaced.map((file) => `docs/${file.relativePath}`).join(', ');
    throw new Error(
      `Markdown pages must be grouped in folders directly under docs/ (keep only docs/index.md at the root): ${paths}`,
    );
  }
  const routeFiles = new Map();
  const records = [];
  for (const file of files) {
    const route = file.relativePath
      .replace(MD_MDX_I_REGEX, '')
      .replace(/(?:^|\/)SKILL$/i, '')
      .replace(/(?:^|\/)index$/i, '')
      .replace(/^\/+|\/+$/g, '');
    const previous = routeFiles.get(route);
    if (previous)
      throw new Error(
        `Duplicate Docs route "${route || '/'}": docs/${previous} and docs/${file.relativePath}`,
      );
    routeFiles.set(route, file.relativePath);
    if (route.toLowerCase() === '404') continue;
    const source = await readFile(file.path, 'utf8');
    const { body, frontmatter } = splitFrontmatter(source);
    const title =
      frontmatter.title ??
      /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1]?.trim() ??
      titleFromName(file.relativePath.replace(MD_MDX_I_REGEX, '').split('/').at(-1));
    const description = frontmatter.description ?? '';
    const text = searchableText(body);
    const hidden =
      frontmatter.sidebar?.hidden ?? frontmatter.hidden ?? frontmatter.visibility === 'hidden';
    if (!hidden)
      records.push({ title, description, href: route ? `${base}${route}/` : base, text });
  }
  await copyDocsAssets();
  await mkdir(dirname(searchIndexPath), { recursive: true });
  await writeFile(searchIndexPath, `${JSON.stringify(records)}\n`);
}

/**
 * Replaces the public asset copy with the assets currently stored in the Docs source tree.
 *
 * @param dir Docs directory whose assets should be copied.
 * @param relativeDir Relative destination prefix used for recursive copies.
 */
async function copyDocsAssets(dir = docsRoot, relativeDir = '') {
  await rm(publicAssetsRoot, { recursive: true, force: true });
  await copyAssetDir(dir, relativeDir);
}

/**
 * Copies non-Markdown Docs assets into the public tree, preserving their directory layout.
 *
 * @param dir Source directory to scan.
 * @param relativeDir Path prefix relative to the Docs root for the destination.
 */
async function copyAssetDir(dir, relativeDir) {
  if (!includeAgents && isAgentsContent(relativeDir)) return;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || (entry.isDirectory() && excludedDirs.has(entry.name)))
      continue;
    const source = join(dir, entry.name);
    const relativePath = relativeDir ? join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await copyAssetDir(source, relativePath);
      continue;
    }
    if (['.md', '.mdx'].includes(extname(entry.name).toLowerCase())) continue;
    const destination = resolve(publicAssetsRoot, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

/**
 * Checks whether a Docs-relative path belongs to the top-level Agents section.
 *
 * @param relativePath Path relative to docs/.
 *
 * @return True when the path is inside docs/agents/.
 */
function isAgentsContent(relativePath) {
  const normalized = relativePath.split(sep).join('/');
  return normalized === 'agents' || normalized.startsWith('agents/');
}

/**
 * Parses optional YAML frontmatter while preserving the Markdown body.
 *
 * @param source Markdown source that may begin with a YAML frontmatter block.
 *
 * @return Parsed frontmatter and the remaining Markdown body.
 */
function splitFrontmatter(source) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(source);
  if (!match) return { frontmatter: {}, body: source };
  try {
    return { frontmatter: parse(match[1]) ?? {}, body: source.slice(match[0].length) };
  } catch (err) {
    throw new Error(`Invalid YAML frontmatter: ${err.message}`, { cause: err });
  }
}

/**
 * Removes Markdown, JSX, and code syntax that should not appear in search snippets.
 *
 * @param source Markdown or MDX body to normalize for search.
 *
 * @return Plain searchable text with repeated whitespace collapsed.
 */
function searchableText(source) {
  return source
    .replace(/^\s*import\s+.+$/gm, ' ')
    .replace(/^\s*export\s+.+$/gm, ' ')
    .replace(/```[^\n]*\n?/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!??\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates and normalizes the public base path used by Docs routes.
 *
 * @param value Base path configured by the host application.
 *
 * @return A slash-delimited path suitable for route construction.
 */
function normBase(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) throw new Error('--base must begin with /');
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * Parses the command-line boolean used to enable or disable the generated Agents section.
 *
 * @param value Boolean text supplied to `--skills`.
 *
 * @return The parsed option value.
 */
function parseBoolean(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('--skills must be true or false');
}

/**
 * Derives a display title from a package name or documentation path.
 *
 * @param value Package name or path segment to turn into a title.
 *
 * @return A title with separators removed and words capitalized.
 */
function titleFromName(value = '') {
  const name =
    value
      .replace(/^@[^/]+\//, '')
      .replace(MD_MDX_I_REGEX, '')
      .split('/')
      .at(-1) ?? '';
  return name
    .replace(/^\d+[-_]+/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/**
 * Reads and parses a JSON file from disk.
 *
 * @param path File to read.
 *
 * @return The parsed JSON value.
 */
async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/**
 * Starts the Astro command with the Docs root, generated config, and host environment.
 *
 * @param cmd Astro subcommand such as `dev`, `build`, or `preview`.
 */
function runAstro(cmd) {
  const args = [astroCli, cmd, '--root', root, '--config', relative(root, configFile)];
  const port = options.get('--port') ?? docsConfig.port;
  const host = options.get('--host') ?? docsConfig.host;
  if (port) args.push('--port', String(port));
  if (host) args.push('--host', host);
  args.push(...passthrough);
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  child.on('error', (error) => {
    console.error(
      `Could not start Astro: ${error.message}. Install @terra-symposium/docs in this repository first.`,
    );
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
  });
}
if (!['dev', 'build', 'preview'].includes(mode)) {
  console.error(
    'Usage: docs <docs|dev|build|preview> [--title title] [--description text] [--site url] [--base /path/] [--out directory] [--agents true|false]',
  );
  process.exit(2);
}
if (mode !== 'preview') {
  await buildSearchIndex();
}
runAstro(mode);
if (mode === 'dev') {
  let timer;
  try {
    const watcher = watch(docsRoot, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => buildSearchIndex().catch((error) => console.error(error.message)),
        100,
      );
    });
    process.on('SIGINT', () => watcher.close());
    process.on('SIGTERM', () => watcher.close());
  } catch (err) {
    console.warn(`Search index updates are disabled: ${err.message}`);
  }
}

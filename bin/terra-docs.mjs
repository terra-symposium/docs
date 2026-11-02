#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSkillsIndex } from './generate-skills.mjs';
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
const configFile = resolve(packageRoot, 'site/astro.config.mjs');
const mode = process.argv[2];
const root = resolve(process.cwd());
const options = new Map();
const passthrough = [];
const docsRoot = resolve(root, 'docs');
const publicRoot = resolve(root, 'dist/public');
const publicAssetsRoot = resolve(publicRoot, '_terra-docs/assets');
const outputDir = options.get('--out') ?? 'dist/docs';
const searchIndexPath = resolve(publicRoot, '_terra-docs/search-index.json');
const skillsIndexPath = resolve(root, 'dist/cache/skills.generated.json');
const excludedDirs = new Set(['node_modules', '.astro', 'dist']);
const manifest = await readJson(resolve(root, 'package.json')).catch(() => ({}));
const siteTitle = options.get('--title') ?? titleFromName(manifest.name) ?? 'Documentation';
const siteDescription = options.get('--description') ?? manifest.description ?? '';
const base = normBase(options.get('--base') ?? '/');
const env = {
  ...process.env,
  TERRA_DOCS_ROOT: root,
  TERRA_DOCS_SITE: options.get('--site') ?? '',
  TERRA_DOCS_BASE: base,
  TERRA_DOCS_OUT: outputDir,
  PUBLIC_TERRA_DOCS_TITLE: siteTitle,
  PUBLIC_TERRA_DOCS_DESCRIPTION: siteDescription,
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
  const files = await collectMarkdown(docsRoot);
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
  return name.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
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
  if (options.has('--port')) args.push('--port', options.get('--port'));
  if (options.has('--host')) args.push('--host', options.get('--host'));
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
for (let index = 3; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (
    ['--title', '--description', '--site', '--base', '--out', '--port', '--host'].includes(argument)
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
if (!['dev', 'build', 'preview'].includes(mode)) {
  console.error(
    'Usage: terra-docs <dev|build|preview> [--title title] [--description text] [--site url] [--base /path/] [--out directory]',
  );
  process.exit(2);
}
if (mode !== 'preview') {
  await generateSkillsIndex(root, skillsIndexPath);
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

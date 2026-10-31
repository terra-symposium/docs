#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parse } from 'yaml';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const astroPackage = require.resolve('astro/package.json');
const astroCli = resolve(dirname(astroPackage), 'bin/astro.mjs');
const configFile = resolve(packageRoot, 'site/astro.config.mjs');
const mode = process.argv[2];
const root = resolve(process.cwd());
const options = new Map();
const passthrough = [];
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

const docsRoot = resolve(root, 'docs');
const publicRoot = resolve(root, '.terra-docs/public');
const publicAssetsRoot = resolve(publicRoot, '_terra-docs/assets');
const outputDirectory = options.get('--out') ?? 'docs-dist';
const searchIndexPath = resolve(publicRoot, '_terra-docs/search-index.json');
const excludedDirectories = new Set(['node_modules', '.astro', 'dist', 'docs-dist']);
const manifest = await readJson(resolve(root, 'package.json')).catch(() => ({}));
const siteTitle = options.get('--title') ?? titleFromName(manifest.name) ?? 'Documentation';
const siteDescription = options.get('--description') ?? manifest.description ?? '';
const base = normalizeBase(options.get('--base') ?? '/');

async function collectMarkdown(directory, rootDirectory = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || (entry.isDirectory() && excludedDirectories.has(entry.name)))
      continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(path, rootDirectory)));
    else if (['.md', '.mdx'].includes(extname(entry.name).toLowerCase()))
      files.push({ path, relativePath: relative(rootDirectory, path) });
  }
  return files;
}

async function buildSearchIndex() {
  const files = await collectMarkdown(docsRoot);
  if (files.length === 0)
    throw new Error(
      'No Markdown files found in docs/. Add docs/index.md to start a Terra Docs site.',
    );
  const routeFiles = new Map();
  const records = [];
  for (const file of files) {
    const route = file.relativePath
      .replace(/\.(?:md|mdx)$/i, '')
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
      titleFromName(
        file.relativePath
          .replace(/\.(?:md|mdx)$/i, '')
          .split('/')
          .at(-1),
      );
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

async function copyDocsAssets(directory = docsRoot, relativeDirectory = '') {
  await rm(publicAssetsRoot, { recursive: true, force: true });
  await copyAssetDirectory(directory, relativeDirectory);
}

async function copyAssetDirectory(directory, relativeDirectory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || (entry.isDirectory() && excludedDirectories.has(entry.name)))
      continue;
    const source = join(directory, entry.name);
    const relativePath = relativeDirectory ? join(relativeDirectory, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await copyAssetDirectory(source, relativePath);
      continue;
    }
    if (['.md', '.mdx'].includes(extname(entry.name).toLowerCase())) continue;
    const destination = resolve(publicAssetsRoot, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

function splitFrontmatter(source) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(source);
  if (!match) return { frontmatter: {}, body: source };
  try {
    return { frontmatter: parse(match[1]) ?? {}, body: source.slice(match[0].length) };
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter: ${error.message}`, { cause: error });
  }
}

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

function normalizeBase(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) throw new Error('--base must begin with /');
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function titleFromName(value = '') {
  const name =
    value
      .replace(/^@[^/]+\//, '')
      .replace(/\.(?:md|mdx)$/i, '')
      .split('/')
      .at(-1) ?? '';
  return name.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const env = {
  ...process.env,
  TERRA_DOCS_ROOT: root,
  TERRA_DOCS_SITE: options.get('--site') ?? '',
  TERRA_DOCS_BASE: base,
  TERRA_DOCS_OUT: outputDirectory,
  PUBLIC_TERRA_DOCS_TITLE: siteTitle,
  PUBLIC_TERRA_DOCS_DESCRIPTION: siteDescription,
};

if (mode !== 'preview') await buildSearchIndex();

function runAstro(command) {
  const args = [astroCli, command, '--root', root, '--config', relative(root, configFile)];
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
  } catch (error) {
    console.warn(`Search index updates are disabled: ${error.message}`);
  }
}

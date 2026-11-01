#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { dirname, join, relative, resolve, sep } from 'node:path';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const ignoredDirs = new Set([
  '.astro',
  '.cache',
  '.git',
  '.next',
  '.nuxt',
  '.output',
  '.svelte-kit',
  '.turbo',
  '.vite',
  '.vercel',
  '.wrangler',
  'build',
  'coverage',
  'dist',
  'docs-dist',
  'lib-dist',
  'node_modules',
  'site-dist',
  'target',
  'vendor',
]);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Finds skill instruction files beneath a directory, skipping generated and dependency folders.
 *
 * @param dir Directory whose descendants should be searched.
 * @param files Accumulator shared by recursive calls.
 *
 * @return Paths to the discovered `SKILL.md` files.
 */
async function findSkillFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await findSkillFiles(path, files);
    else if (entry.isFile() && entry.name === 'SKILL.md') files.push(path);
  }
  return files;
}

/**
 * Separates a skill document's Markdown body from its optional YAML frontmatter.
 *
 * @param source Complete skill document contents.
 *
 * @return Parsed metadata and body, plus a validation issue when YAML parsing fails.
 */
function splitFrontmatter(source) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(source);
  if (!match) return { body: source.trim(), metadata: {}, metadataIssue: undefined };
  try {
    const metadata = parse(match[1]);
    return {
      body: source.slice(match[0].length).trim(),
      metadata:
        metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
      metadataIssue: undefined,
    };
  } catch (err) {
    return {
      body: source.slice(match[0].length).trim(),
      metadata: {},
      metadataIssue: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Resolves a skill's display scope and directory from its repository-relative path.
 *
 * @param root Repository root used to make the skill path relative.
 * @param path Absolute path of the skill instruction file.
 *
 * @return Directory and scope labels for the generated index entry.
 */
function skillLocation(root, path) {
  const segments = relative(root, path).split(sep);
  const skillRootIndex = segments.findIndex(
    (segment, i) => (segment === '.agents' || segment === '.codex') && segments[i + 1] === 'skills',
  );
  if (skillRootIndex >= 0) {
    const scope = segments.slice(0, skillRootIndex).join('/') || 'repository';
    const dir = segments.slice(skillRootIndex + 2, -1).join('/') || 'root';
    return { directory: dir, scope };
  }
  return { directory: segments.slice(0, -1).join('/') || 'root', scope: 'repository' };
}

/**
 * Derives a fallback description from the first prose paragraph in a skill document.
 *
 * @param body Markdown body with frontmatter removed.
 *
 * @return The first non-heading paragraph, or an empty string when none exists.
 */
function fallbackDescription(body) {
  return (
    body
      .replace(/^\s*#.+\n/, '')
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
      .find((paragraph) => paragraph && !paragraph.startsWith('#')) ?? ''
  );
}

/**
 * Converts a directory or skill name into a title-style label.
 *
 * @param value Slug containing words separated by hyphens or underscores.
 *
 * @return A human-readable label with each word capitalized.
 */
function humanize(value) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/**
 * Builds a sorted index of repository skills and writes it as JSON.
 *
 * @param repoRoot Repository root whose `.agents` and `.codex` skill trees are scanned.
 * @param outputPath Destination file for the generated skill index.
 *
 * @return The indexed skills, including their parsed metadata and Markdown bodies.
 */
export async function generateSkillsIndex(repoRoot, outputPath) {
  const root = resolve(repoRoot);
  const files = await findSkillFiles(root);
  const skills = await Promise.all(
    files.map(async (path) => {
      const source = await readFile(path, 'utf8');
      const { body, metadata, metadataIssue } = splitFrontmatter(source);
      const location = skillLocation(root, path);
      const dirName = location.directory.split('/').at(-1) ?? 'skill';
      const name = typeof metadata.name === 'string' ? metadata.name.trim() : dirName;
      const title = /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1]?.trim() ?? humanize(name);
      const description =
        typeof metadata.description === 'string'
          ? metadata.description.trim()
          : fallbackDescription(body);
      return {
        body,
        description,
        directory: location.directory,
        metadata,
        ...(metadataIssue ? { metadataIssue } : {}),
        name,
        scope: location.scope,
        sourcePath: relative(root, path).split(sep).join('/'),
        title,
      };
    }),
  );
  skills.sort((first, second) =>
    `${first.scope}/${first.directory}/${first.name}`.localeCompare(
      `${second.scope}/${second.directory}/${second.name}`,
    ),
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(skills, null, 2)}\n`);
  return skills;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const root = resolve(process.argv[2] ?? process.cwd());
  const outputPath = resolve(
    process.argv[3] ?? join(root, '.terra-docs/cache/skills.generated.json'),
  );
  const skills = await generateSkillsIndex(root, outputPath);
  console.log(`Indexed ${skills.length} skills from ${root}`);
}

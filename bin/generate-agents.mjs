#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parse, stringify } from 'yaml';

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
  'node_modules',
  'target',
  'vendor',
]);

/**
 * Finds conventional agent skill files while skipping dependency and build trees.
 *
 * @param dir Directory currently being scanned.
 * @param root Repository root used for skill path validation.
 * @param files Accumulator for discovered skill files.
 *
 * @return Absolute paths to discovered skill files.
 */
async function findSkillFiles(dir, root, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await findSkillFiles(path, root, files);
    else if (entry.isFile() && entry.name === 'SKILL.md') {
      const segments = relative(root, path).split(sep);
      if (
        segments.some(
          (segment, index) =>
            ['.agents', '.codex'].includes(segment) && segments[index + 1] === 'skills',
        )
      )
        files.push(path);
    }
  }
  return files;
}

/**
 * Reads the prior generated manifest and removes only its listed pages.
 *
 * @param root Repository root that contains docs/ and dist/cache/.
 * @param manifestPath Path to the generated page manifest.
 *
 * @return Prior generated relative page paths.
 */
async function removePreviousPages(root, manifestPath) {
  const previous = await readFile(manifestPath, 'utf8')
    .then((source) => JSON.parse(source))
    .catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
  if (!Array.isArray(previous)) throw new Error('Invalid generated Agents page manifest');
  for (const path of previous) {
    const absolutePath = resolve(root, 'docs', path);
    const relativePath = relative(resolve(root, 'docs'), absolutePath);
    if (relativePath.startsWith(`..${sep}`) || relativePath === '..') {
      throw new Error(`Invalid path in generated Agents page manifest: ${path}`);
    }
    await rm(absolutePath, { force: true });
  }
  return previous;
}

/**
 * Copies a skill's supporting files beside its generated Docs page, preserving relative links.
 *
 * @param sourceDir Source skill directory.
 * @param destinationDir Generated Docs directory for the skill.
 * @param docsRoot Docs content root used to record generated paths.
 * @param generatedPaths Manifest accumulator for copied files.
 */
async function copySkillSupportFiles(sourceDir, destinationDir, docsRoot, generatedPaths) {
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    if (entry.isFile() && entry.name === 'SKILL.md') continue;
    const source = join(sourceDir, entry.name);
    const destination = join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      await copySkillSupportFiles(source, destination, docsRoot, generatedPaths);
      continue;
    }
    if (!entry.isFile()) continue;
    const relativePath = relative(docsRoot, destination);
    const exists = await access(destination)
      .then(() => true)
      .catch((error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
    if (exists) {
      throw new Error(
        `A Docs page already exists at docs/${relativePath}, which is reserved for skills.`,
      );
    }
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    generatedPaths.push(relativePath);
  }
}

/**
 * Replaces repository skills with ordinary Markdown pages in the Docs Agents section.
 *
 * @param repoRoot Repository root whose .agents/.codex skill directories are included.
 * @param manifestPath File used to track generated pages for cleanup.
 * @param enabled Whether the Agents section should include skills.
 *
 * @return Cleanup details for generated pages and their manifest.
 */
export async function generateAgentsSection(repoRoot, manifestPath, enabled = true) {
  const root = resolve(repoRoot);
  const docsRoot = resolve(root, 'docs');
  const generatedManifest = resolve(manifestPath);
  await removePreviousPages(root, generatedManifest);
  const files = enabled ? await findSkillFiles(root, root) : [];
  const generatedPaths = [];
  const usedRoutes = new Set();

  try {
    for (const path of files.sort((left, right) => left.localeCompare(right))) {
      const relativePath = relative(root, path).split(sep);
      const skillRootIndex = relativePath.findIndex(
        (segment, index) =>
          ['.agents', '.codex'].includes(segment) && relativePath[index + 1] === 'skills',
      );
      const scope = relativePath.slice(0, skillRootIndex).join('/') || 'repository';
      const skillDirectory = relativePath.slice(skillRootIndex + 2, -1).join('/') || 'root';
      const sourcePath = relative(root, path).split(sep).join('/');
      const pagePath = join('agents', scope, skillDirectory, 'index.md');
      const routeKey = pagePath.split(sep).join('/').toLocaleLowerCase();
      if (usedRoutes.has(routeKey)) {
        throw new Error(
          `Multiple skills map to docs/${pagePath}; give each skill a unique directory.`,
        );
      }
      usedRoutes.add(routeKey);

      const destination = resolve(docsRoot, pagePath);
      const exists = await access(destination)
        .then(() => true)
        .catch((error) => {
          if (error.code === 'ENOENT') return false;
          throw error;
        });
      if (exists) {
        throw new Error(
          `A Docs page already exists at docs/${pagePath}, which is reserved for skills.`,
        );
      }

      const source = await readFile(path, 'utf8');
      const frontmatterMatch = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(source);
      let metadata = {};
      let body = source;
      if (frontmatterMatch) {
        metadata = parse(frontmatterMatch[1]) ?? {};
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) metadata = {};
        body = source.slice(frontmatterMatch[0].length);
      }
      const dirName = skillDirectory.split('/').at(-1) ?? 'skill';
      const humanizedName = String(metadata.name ?? dirName)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
      const title =
        metadata.title ?? /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1]?.trim() ?? humanizedName;
      const description = metadata.description ?? '';
      metadata.title = title;
      if (description) metadata.description = description;
      const page = `---\n${stringify(metadata).trimEnd()}\n---\n\n${body.trim()}\n\n---\n\n_Source: \`${sourcePath}\`._\n`;
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, page);
      generatedPaths.push(pagePath);
      await copySkillSupportFiles(dirname(path), dirname(destination), docsRoot, generatedPaths);
    }
  } catch (error) {
    await Promise.all(generatedPaths.map((path) => rm(resolve(docsRoot, path), { force: true })));
    throw error;
  }

  await mkdir(dirname(generatedManifest), { recursive: true });
  await writeFile(generatedManifest, `${JSON.stringify(generatedPaths, null, 2)}\n`);
  return { manifestPath: generatedManifest, paths: generatedPaths, root };
}

/** Removes pages generated for the current Docs process and their tracking manifest. */
export async function cleanupGeneratedAgents(generated) {
  if (!generated) return;
  await removePreviousPages(generated.root, generated.manifestPath);
  await rm(generated.manifestPath, { force: true });
}

/**
 * packages/skills/src/index.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { Buffer } from 'node:buffer';
import { readFile, readdir, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';

// DATA
import { parse, stringify } from 'yaml';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const marker = '.terra-skills-generated';
const slug = /^[a-z][a-z0-9-]*$/;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Collect files recursively under a directory.
 *
 * @param root Directory to walk.
 *
 * @return Sorted file paths, or an empty list when the directory is missing.
 */
async function filesBelow(root) {
  const found = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) found.push(path);
    }
  }
  try {
    await visit(root);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return found.sort();
}

/**
 * Parse a marked Markdown page's YAML frontmatter.
 *
 * @param src Complete Markdown source.
 * @param path Source path for diagnostics.
 *
 * @return Parsed metadata and Markdown body.
 */
function splitFrontmatter(src, path) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(src);
  if (!match) throw new Error(`Missing YAML frontmatter: ${path}`);
  let fields;
  try {
    fields = parse(match[1], { uniqueKeys: true });
  } catch (err) {
    throw new Error(`Invalid YAML frontmatter in ${path}: ${err.message}`, { cause: err });
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields))
    throw new Error(`Invalid skill metadata: ${path}`);
  return { fields, body: src.slice(match[0].length) };
}

/**
 * Reject broken relative links in the portable skill bundle.
 *
 * @param contents Markdown content to inspect.
 * @param file Generated relative path.
 * @param expected Compiled file map.
 *
 * @return Nothing; throws when a link cannot resolve.
 */
function validLinks(contents, file, expected) {
  const withoutFences = contents.replace(/```[\s\S]*?```/g, '');
  for (const match of withoutFences.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const tgt = match[1].split('#', 1)[0];
    if (!tgt || /^(?:[a-z][\w+.-]*:|\/)/i.test(tgt)) continue;
    const dest = normalize(join(dirname(file), decodeURIComponent(tgt)));
    if (dest === '..' || dest.startsWith(`..${sep}`))
      throw new Error(`Skill link escapes generated skills: ${file} -> ${tgt}`);
    if (!expected.has(dest)) throw new Error(`Broken skill link: ${file} -> ${tgt}`);
  }
}

/*//////////////////////////////////////////////////
API
//////////////////////////////////////////////////*/

/**
 * Compile marked Docs skill pages into a portable file map.
 *
 * @param root Repository root.
 *
 * @return Number of skills and their generated file map.
 */
export async function compileSkills(root) {
  const repo = resolve(root);
  const pages = (await filesBelow(join(repo, 'docs'))).filter(
    (file) => basename(file) === 'SKILL.md',
  );
  const expected = new Map();
  const names = new Set();
  for (const page of pages) {
    const { fields, body } = splitFrontmatter(await readFile(page, 'utf8'), page);
    if (fields.skill !== true) continue;
    const { name, description: desc } = fields;
    if (!slug.test(name ?? '') || typeof desc !== 'string' || !desc.trim()) {
      throw new Error(`Skill needs a slug name and description: ${page}`);
    }
    if (names.has(name)) throw new Error(`Duplicate skill name: ${name}`);
    names.add(name);
    delete fields.skill;
    delete fields.title;
    if (!fields.metadata) fields.metadata = { 'related-files': [] };
    const related = fields.metadata?.['related-files'];
    if (!Array.isArray(related)) throw new Error(`Invalid related-files: ${page}`);
    for (const path of related) {
      if (typeof path !== 'string' || path.startsWith('/') || path.split('/').includes('..'))
        throw new Error(`Invalid related file: ${page} -> ${path}`);
      try {
        if (!(await stat(join(repo, path))).isFile()) throw new Error();
      } catch {
        throw new Error(`Missing related file: ${page} -> ${path}`);
      }
    }
    expected.set(join(name, 'SKILL.md'), `---\n${stringify(fields).trimEnd()}\n---\n${body}`);
    for (const file of await filesBelow(dirname(page))) {
      if (file === page) continue;
      const local = relative(dirname(page), file);
      if (
        !['agents', 'assets', 'examples', 'references', 'scripts', 'README.template.md'].includes(
          local.split(sep)[0],
        )
      )
        continue;
      expected.set(join(name, local), await readFile(file));
    }
  }
  for (const [file, content] of expected) {
    if (extname(file) === '.md') validLinks(String(content), file, expected);
  }
  return { skills: names.size, files: expected };
}

/**
 * Write compiled skills to the repository discovery directory.
 *
 * @param root Repository root.
 *
 * @return Number of written skills and files.
 */
export async function prepareSkills(root) {
  const repo = resolve(root);
  const out = join(repo, '.agents', 'skills');
  const compiled = await compileSkills(repo);
  try {
    const entries = await readdir(out);
    if (entries.length && !entries.includes(marker))
      throw new Error(`Refusing to replace non-generated skills: ${out}`);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const [file, content] of compiled.files) {
    const tgt = join(out, file);
    await mkdir(dirname(tgt), { recursive: true });
    await writeFile(tgt, content);
  }
  await writeFile(join(out, marker), 'Generated from docs/ by @terra-symposium/skills.\n');
  return { skills: compiled.skills, files: compiled.files.size };
}

/**
 * Compare generated discovery files with Docs without changing the repository.
 *
 * @param root Repository root.
 *
 * @return Number of checked skills and files.
 */
export async function checkSkills(root) {
  const repo = resolve(root);
  const out = join(repo, '.agents', 'skills');
  const compiled = await compileSkills(repo);
  const actual = (await filesBelow(out))
    .map((file) => relative(out, file))
    .filter((file) => file !== marker);
  const expected = [...compiled.files.keys()];
  const diffs = new Set([
    ...actual.filter((file) => !compiled.files.has(file)),
    ...expected.filter((file) => !actual.includes(file)),
  ]);
  for (const file of expected) {
    if (!actual.includes(file)) continue;
    if (!(await readFile(join(out, file))).equals(Buffer.from(compiled.files.get(file))))
      diffs.add(file);
  }
  if (diffs.size)
    throw new Error(`Generated skills differ from Docs: ${[...diffs].sort().join(', ')}`);
  return { skills: compiled.skills, files: compiled.files.size };
}

/**
 * packages/skills/tests/compiler.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';

// SKILLS
import { compileSkills, prepareSkills, checkSkills } from '../src/index.mjs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const valid = `---\nname: sample\ndescription: Review a sample.\nskill: true\nmetadata:\n  related-files:\n    - src/example.ts\n---\n\n# Sample\n\nRead [details](references/details.md).\n`;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Run a fixture in an isolated temporary repository.
 * @param fn Async fixture body.
 * @return The fixture body's result.
 */
async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'terra-skills-'));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * Write a Docs skill source page.
 * @param root Temporary repository root.
 * @param src Markdown source.
 * @param name Source folder name.
 * @return Source folder path.
 */
async function page(root, src, name = 'sample') {
  const dir = join(root, 'docs', 'guides', name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'SKILL.md'), src);
  return dir;
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('prepares a portable skill and detects drift without rewriting it', async () =>
  fixture(async (root) => {
    const dir = await page(root, valid);
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/example.ts'), 'export {};\n');
    await mkdir(join(dir, 'references'));
    await writeFile(join(dir, 'references/details.md'), '# Details\n');
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'assets/icon.png'), Buffer.from([1, 2, 3]));
    assert.deepEqual(await prepareSkills(root), { skills: 1, files: 3 });
    assert.match(
      await readFile(join(root, '.agents/skills/sample/SKILL.md'), 'utf8'),
      /name: sample/,
    );
    assert.doesNotMatch(
      await readFile(join(root, '.agents/skills/sample/SKILL.md'), 'utf8'),
      /skill: true/,
    );
    assert.deepEqual(
      await readFile(join(root, '.agents/skills/sample/assets/icon.png')),
      Buffer.from([1, 2, 3]),
    );
    await checkSkills(root);
    await writeFile(join(root, '.agents/skills/sample/references/details.md'), 'changed\n');
    await assert.rejects(checkSkills(root), /differ/);
  }));

test('rejects duplicate names, broken links, and missing source evidence', async () =>
  fixture(async (root) => {
    await page(root, valid);
    await assert.rejects(compileSkills(root), /Missing related file/);
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/example.ts'), 'export {};\n');
    await assert.rejects(compileSkills(root), /Broken skill link/);
    await page(root, valid, 'other');
    await assert.rejects(compileSkills(root), /Duplicate skill name/);
  }));

test('refuses to replace hand-authored skill files', async () =>
  fixture(async (root) => {
    await mkdir(join(root, '.agents/skills/manual'), { recursive: true });
    await writeFile(join(root, '.agents/skills/manual/SKILL.md'), '# Keep me\n');
    await assert.rejects(prepareSkills(root), /Refusing to replace/);
  }));

test('CLI prepares a repository with no skills and exposes the packaged guide', async () =>
  fixture(async (root) => {
    const cli = new URL('../bin/terra-skills.mjs', import.meta.url).pathname;
    assert.match(
      execFileSync(process.execPath, [cli, 'prepare', root], { encoding: 'utf8' }),
      /0 skills/,
    );
    assert.match(
      execFileSync(process.execPath, [cli, 'check', root], { encoding: 'utf8' }),
      /0 skills/,
    );
    assert.match(
      await readFile(new URL(import.meta.resolve('@terra-symposium/skills/authoring.md')), 'utf8'),
      /Agent skill authoring/,
    );
  }));

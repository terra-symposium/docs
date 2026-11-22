/**
 * bin/init.mjs
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { copyFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const starterFiles = [
  '.gitignore',
  '.github/workflows/docs.yml',
  'README.md',
  'package.json',
  'pnpm-workspace.yaml',
  'docs/index.md',
];

// hygiene-ignore single-use -- This CLI operation owns the entire init transaction and is called from the docs command dispatcher.
/**
 * Copy the no-code Docs starter into a new directory and install its dependencies.
 *
 * @param {string[]} args - CLI arguments containing the destination and optional install flag.
 */
export async function initDocsProject(args) {
  const names = args.filter((arg) => arg !== '--no-install');
  if (names.length !== 1 || names[0].startsWith('-'))
    throw new Error('Usage: docs init <directory> [--no-install]');

  const dest = resolve(names[0]);
  const template = resolve(dirname(fileURLToPath(import.meta.url)), '../template');
  await mkdir(dest);
  for (const file of starterFiles) {
    const tgt = join(dest, file);
    await mkdir(dirname(tgt), { recursive: true });
    await copyFile(join(template, file), tgt);
  }

  if (!args.includes('--no-install')) {
    // Preserve a named completion boundary so failed installs report the destination after the child exits.
    // hygiene-ignore single-use -- The exit status is read after the child process resolves, without moving its await into the failure branch.
    const code = await new Promise((done, reject) => {
      const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['install'], {
        cwd: dest,
        stdio: 'inherit',
      });
      child.on('error', reject);
      child.on('exit', (status) => done(status ?? 1));
    });
    if (code !== 0) throw new Error(`pnpm install failed in ${dest}`);
  }
  console.log(`Docs site created in ${dest}`);
  console.log(`Next: cd ${names[0]} && pnpm run docs`);
}

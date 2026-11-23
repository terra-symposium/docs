/**
 * scripts/build-styles.mjs
 * Builds the package stylesheet through the configured PostCSS pipeline.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, 'dist', 'cache');
await mkdir(cache, { recursive: true });
// Keep Astro's imported dist/lib/style.css available until the replacement is complete.
const buildDir = await mkdtemp(join(cache, 'docs-styles-'));
const tailwindCli = join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js');

/**
 * Runs one build command and rejects if it fails.
 *
 * @param cmd - Executable to run.
 * @param args - Command arguments.
 *
 * @returns A promise that resolves when the command exits successfully.
 */
function run(cmd, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`${cmd} exited from ${signal}`));
      else if (code !== 0) reject(new Error(`${cmd} exited with code ${code}`));
      else resolveRun();
    });
  });
}

try {
  await run(process.execPath, [
    tailwindCli,
    '--postcss',
    'config/tailwind.postcss.config.mjs',
    '-c',
    'config/tailwind.docs.config.mjs',
    '-i',
    'src/styles/style.css',
    '-o',
    join(buildDir, 'style.css'),
    '--minify',
  ]);
  await run(process.execPath, [
    tailwindCli,
    '--postcss',
    'config/tailwind.postcss.config.mjs',
    '-c',
    'config/tailwind.docs.config.mjs',
    '-i',
    'src/styles/workspace.css',
    '-o',
    join(buildDir, 'workspace.css'),
    '--minify',
  ]);
  await run(process.execPath, [join(root, 'scripts', 'copy-runtime.mjs'), buildDir]);
} finally {
  await rm(buildDir, { recursive: true, force: true });
}

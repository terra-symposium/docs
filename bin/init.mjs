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

export async function initDocsProject(args) {
  const install = !args.includes('--no-install');
  const names = args.filter((arg) => arg !== '--no-install');
  if (names.length !== 1 || names[0].startsWith('-')) {
    throw new Error('Usage: docs init <directory> [--no-install]');
  }

  const destination = resolve(names[0]);
  const template = resolve(dirname(fileURLToPath(import.meta.url)), '../template');
  await mkdir(destination);
  for (const file of starterFiles) {
    const target = join(destination, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(template, file), target);
  }

  if (install) {
    const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const code = await new Promise((done, reject) => {
      const child = spawn(command, ['install'], { cwd: destination, stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', (status) => done(status ?? 1));
    });
    if (code !== 0) throw new Error(`pnpm install failed in ${destination}`);
  }
  console.log(`Docs site created in ${destination}`);
  console.log(`Next: cd ${names[0]} && pnpm run docs`);
}

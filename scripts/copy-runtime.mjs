/**
 * scripts/copy-runtime.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import postcss from 'postcss';
import { appendFile, cp, mkdir, readFile, readdir, rename, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'lib', 'terra');
const output = join(root, 'dist', 'lib', 'lib', 'terra');
const buildDir = process.argv[2];
if (!buildDir) throw new Error('Pass the temporary stylesheet directory to copy-runtime.mjs.');
// Keep authored Docs prose after generated utilities, matching the original
// website's cascade where its prose stylesheet loaded after global.css. Styling's
// effect layer also contains authored @layer rules, so append it last.
// hygiene-ignore single-use -- Read staged output before atomically replacing the package stylesheet.
const workspaceStyles = await readFile(join(buildDir, 'workspace.css'), 'utf8');
// Tailwind has already run. Leave the authored rules intact, but remove their
// build-time layers so a consumer's Tailwind plugin can process this stylesheet.
const effectCss = postcss.parse(
  await readFile(
    join(root, 'node_modules', '@terra-symposium', 'styling', 'dist', 'effects.css'),
    'utf8',
  ),
);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Copies runtime `.mjs` modules into the package's nested runtime export directory.
 *
 * @param dir - Source directory whose JavaScript modules should be copied recursively.
 */
async function copyRuntime(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await copyRuntime(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
    const dest = join(output, relative(src, path));
    await mkdir(dirname(dest), { recursive: true });
    await cp(path, dest);
  }
}
await copyRuntime(src);
await mkdir(join(root, 'dist', 'lib'), { recursive: true });
for (const name of ['EditorHarness', 'WorkspaceDemo']) {
  for (const ext of ['js', 'js.map', 'd.ts', 'd.ts.map']) {
    await rm(join(root, 'dist', 'lib', 'components', `${name}.${ext}`), { force: true });
  }
}
await cp(
  join(root, 'node_modules', '@terra-symposium', 'styling', 'dist', 'assets', 'fonts'),
  join(root, 'dist', 'lib', 'assets', 'fonts'),
  { recursive: true },
);
const stagedStylesPath = join(buildDir, 'style.css');
await appendFile(stagedStylesPath, `\n${workspaceStyles}`);
for (const rule of [...effectCss.nodes]) {
  if (rule.type === 'atrule' && rule.name === 'layer') rule.replaceWith(...(rule.nodes ?? []));
}
await appendFile(stagedStylesPath, `\n${effectCss}`);
await cp(join(root, 'node_modules', 'katex', 'dist', 'fonts'), join(root, 'dist', 'lib', 'fonts'), {
  recursive: true,
});
await rename(stagedStylesPath, join(root, 'dist', 'lib', 'style.css'));

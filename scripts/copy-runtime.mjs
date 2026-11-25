/**
 * scripts/copy-runtime.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'lib', 'terra');
const output = join(root, 'dist/lib', 'lib', 'terra');

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param dir
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
await mkdir(join(root, 'dist/lib'), { recursive: true });
for (const name of ['EditorHarness', 'WorkspaceDemo']) {
	for (const ext of ['js', 'js.map', 'd.ts', 'd.ts.map']) {
		await rm(join(root, 'dist/lib', 'components', `${name}.${ext}`), { force: true });
	}
}
await cp(join(root, 'node_modules', '@terra-symposium', 'styling', 'dist', 'assets', 'fonts'), join(root, 'dist/lib', 'assets', 'fonts'), { recursive: true });
await cp(join(root, 'src', 'styles', 'style.css'), join(root, 'dist/lib', 'style.css'));
await writeFile(join(root, 'dist/lib', 'workspace.css'), "@import './docs-workspace-style.css';\n");

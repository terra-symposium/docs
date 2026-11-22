/**
 * site/local-source-rebuild-plugin.mjs
 */
/* Rebuild this checkout's package when its Docs site is used as a development host. */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import { spawn } from 'node:child_process';
import { sep, resolve } from 'node:path';

// hygiene-ignore single-use -- This exported Vite watcher is loaded by the Astro site config during local development.
/**
 * Keep the package output used by the site in step with edits to its source.
 * Consumer Docs sites use their installed package and do not run this watcher.
 *
 * @param {string} root - Root directory of the Docs package checkout.
 *
 * @returns {import('vite').Plugin} Vite development plugin.
 */
export function localSourceRebuildPlugin({ root }) {
  const srcRoot = resolve(root, 'src');
  let timer;
  let building = false;
  let pending = false;

  return {
    name: 'terra-docs-local-source-rebuild',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(srcRoot);
      const rebuild = async () => {
        if (building) {
          pending = true;
          return;
        }
        building = true;
        try {
          // hygiene-ignore single-use -- Wait for the child build result before choosing module invalidation or failure reporting.
          const code = await new Promise((done) => {
            const child = spawn('pnpm', ['run', 'build:dev'], { cwd: root, stdio: 'inherit' });
            child.once('error', (err) => {
              console.error(`Docs source rebuild could not start: ${err.message}`);
              done(1);
            });
            child.once('exit', (exitCode) => done(exitCode ?? 1));
          });
          if (code === 0) {
            server.moduleGraph.invalidateAll();
            server.ws.send({ type: 'full-reload', path: '*' });
          } else {
            console.error(
              'Docs source rebuild failed; fix the source and save again to refresh the preview.',
            );
          }
        } finally {
          building = false;
          if (pending) {
            pending = false;
            void rebuild();
          }
        }
      };

      const onSrcChange = (path) => {
        if (!path.startsWith(`${srcRoot}${sep}`)) return;
        clearTimeout(timer);
        timer = setTimeout(() => void rebuild(), 150);
      };
      for (const e of ['add', 'change', 'unlink']) server.watcher.on(e, onSrcChange);
      server.httpServer?.once('close', () => {
        clearTimeout(timer);
        for (const e of ['add', 'change', 'unlink']) server.watcher.off(e, onSrcChange);
      });
    },
  };
}

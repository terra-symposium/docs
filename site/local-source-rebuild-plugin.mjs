/** Rebuild this checkout's package when its Docs site is used as a development host. */
import { spawn } from 'node:child_process';
import { sep, resolve } from 'node:path';

/**
 * Keep the package output used by the site in step with edits to its source.
 * Consumer Docs sites use their installed package and do not run this watcher.
 * @param {{ root: string }} options The Docs package checkout.
 * @returns {import('vite').Plugin} Vite development plugin.
 */
export function localSourceRebuildPlugin({ root }) {
  const sourceRoot = resolve(root, 'src');
  let timer;
  let building = false;
  let pending = false;

  return {
    name: 'terra-docs-local-source-rebuild',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(sourceRoot);

      const rebuild = async () => {
        if (building) {
          pending = true;
          return;
        }
        building = true;
        try {
          const code = await new Promise((done) => {
            const child = spawn('pnpm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
            child.once('error', (error) => {
              console.error(`Docs source rebuild could not start: ${error.message}`);
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

      const onSourceChange = (path) => {
        if (!path.startsWith(`${sourceRoot}${sep}`)) return;
        clearTimeout(timer);
        timer = setTimeout(() => void rebuild(), 150);
      };
      for (const event of ['add', 'change', 'unlink']) server.watcher.on(event, onSourceChange);
      server.httpServer?.once('close', () => {
        clearTimeout(timer);
        for (const event of ['add', 'change', 'unlink']) server.watcher.off(event, onSourceChange);
      });
    },
  };
}

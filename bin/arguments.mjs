/**
 * bin/arguments.mjs
 * Separates Docs-owned flags from switches forwarded to Astro.
 */

// hygiene-ignore single-use -- The CLI and its argument-parser contract tests import this named function across module boundaries.
/**
 * Routes flags consumed by Docs away from Astro-only switches so each process
 * receives the options it owns.
 *
 * @param args Arguments after the Docs mode; recognized value-taking options
 *   are removed while Astro flags retain their original order.
 *
 * @returns Docs option values and the remaining arguments for Astro.
 *
 * @throws {Error} When a Docs option that requires a value is missing one.
 */
export function parseDocsArguments(args) {
  const options = new Map();
  const passthrough = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (
      [
        '--title',
        '--description',
        '--site',
        '--base',
        '--out',
        '--port',
        '--host',
        '--skills',
        '--agents',
      ].includes(arg)
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      options.set(arg, value);
      index += 1;
    } else {
      passthrough.push(arg);
    }
  }
  return { options, passthrough };
}

/**
 * bin/arguments.mjs
 * Separates Docs-owned flags from switches forwarded to Astro.
 */

/**
 * Routes flags consumed by Docs away from Astro-only switches so each process
 * receives the options it owns.
 *
 * @param args Arguments after the Docs mode; recognized value-taking options
 *   are removed while Astro flags retain their original order.
 * @returns Docs option values and the remaining arguments for Astro.
 * @throws {Error} When a Docs option that requires a value is missing one.
 */
export function parseDocsArguments(args) {
  const options = new Map();
  const passthrough = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
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
      ].includes(argument)
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
      options.set(argument, value);
      index += 1;
    } else {
      passthrough.push(argument);
    }
  }
  return { options, passthrough };
}

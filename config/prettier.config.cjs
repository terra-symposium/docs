/** Shared formatting style for this repository. */
const config = { arrowParens: 'avoid', jsxSingleQuote: true, printWidth: 200, proseWrap: 'never', singleQuote: true, useTabs: true };
config.overrides = [{ files: ['README.md', '**/README.md'], options: { printWidth: 100, proseWrap: 'always' } }];
config.plugins = [require.resolve('prettier-plugin-astro')];
module.exports = config;

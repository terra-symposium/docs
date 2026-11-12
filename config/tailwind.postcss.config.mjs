/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import postcssImport from 'postcss-import';
import tailwindNesting from 'tailwindcss/nesting/index.js';
import tailwind from 'tailwindcss';

/**
 * Keeps the CSS processing order aligned with the original Terra website.
 * Imports expand first, then nesting is flattened before Tailwind resolves
 * `@apply` directives and utilities.
 */
export default { plugins: [postcssImport(), tailwindNesting(), tailwind()] };

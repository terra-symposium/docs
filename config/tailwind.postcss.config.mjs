/**
 * config/tailwind.postcss.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import postcssImport from 'postcss-import';
import tailwindNesting from 'tailwindcss/nesting/index.js';
import tailwindcss from 'tailwindcss';

// Match the Terra website's original CSS transform order. CSS imports expand
// first, then Tailwind-compatible nesting is flattened before Tailwind resolves
// @apply and utilities.
export default { plugins: [postcssImport(), tailwindNesting(), tailwindcss()] };

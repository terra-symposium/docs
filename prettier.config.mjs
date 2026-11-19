/**
 * prettier.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const config = JSON.parse(
  readFileSync(new URL('./config/.prettierrc.json', import.meta.url), 'utf8'),
);
export default config;

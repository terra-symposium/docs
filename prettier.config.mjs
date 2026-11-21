/**
 * prettier.config.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

export default JSON.parse(
  readFileSync(new URL('./config/.prettierrc.json', import.meta.url), 'utf8'),
);

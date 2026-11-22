/**
 * scripts/quality-runner.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { runQualityFromCfg } from '@terra-symposium/hygiene/cli';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

await runQualityFromCfg(
  fileURLToPath(new URL('../config/quality.json', import.meta.url)),
  process.argv.slice(2),
);

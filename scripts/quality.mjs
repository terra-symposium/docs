#!/usr/bin/env node
/**
 * scripts/quality.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { runQualityFromCfg } from '@terra-symposium/hygiene/cli';

// DATA
import { URL } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

await runQualityFromCfg(
  fileURLToPath(new URL('../config/quality.json', import.meta.url)),
  process.argv.slice(2),
);

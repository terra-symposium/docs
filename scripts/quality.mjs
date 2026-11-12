#!/usr/bin/env node

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { runQualityFromCfg } from '@terra-symposium/standards-quality/cli';

// DATA
import { URL } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

await runQualityFromCfg(
  fileURLToPath(new URL('../config/quality.json', import.meta.url)),
  process.argv.slice(2),
);

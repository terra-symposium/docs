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

const configPath = fileURLToPath(new URL('../config/quality.json', import.meta.url));
await runQualityFromCfg(configPath, process.argv.slice(2));

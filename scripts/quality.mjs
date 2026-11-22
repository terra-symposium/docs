#!/usr/bin/env node
/**
 * scripts/quality.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const result = spawnSync(
  'uv',
  [
    'run',
    '--with-requirements',
    fileURLToPath(new URL('../config/python-quality-requirements.txt', import.meta.url)),
    '--',
    'node',
    fileURLToPath(new URL('./quality-runner.mjs', import.meta.url)),
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);

#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { runQualityFromCfg } from '@terra-symposium/standards-quality/cli';

const configPath = fileURLToPath(new URL('../config/quality.json', import.meta.url));
await runQualityFromCfg(configPath, process.argv.slice(2));

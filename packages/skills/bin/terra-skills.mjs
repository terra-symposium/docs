#!/usr/bin/env node
/**
 * packages/skills/bin/terra-skills.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import console from 'node:console';
import process from 'node:process';
import { resolve } from 'node:path';

// SKILLS
import { prepareSkills, checkSkills } from '../src/index.mjs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const [cmd, rootArg] = process.argv.slice(2);
if (!['prepare', 'check'].includes(cmd) || process.argv.length > 4) {
  console.error('Usage: terra-skills <prepare|check> [repository-root]');
  process.exitCode = 2;
} else {
  try {
    const root = resolve(rootArg ?? process.cwd());
    const result = cmd === 'prepare' ? await prepareSkills(root) : await checkSkills(root);
    console.log(`${cmd}: ${result.skills} skills, ${result.files} files`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

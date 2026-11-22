/**
 * packages/skills/scripts/copy-docs.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const tgt = resolve(import.meta.dirname, '../dist/docs/authoring.md');
await mkdir(dirname(tgt), { recursive: true });
await copyFile(
  resolve(import.meta.dirname, '../../../docs/developer/repo/skill-authoring.md'),
  tgt,
);

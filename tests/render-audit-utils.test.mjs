/**
 * tests/render-audit-utils.test.mjs
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';

// UTILITIES
import { normalizeCodeForAudit } from '../scripts/render-audit-utils.mjs';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('normalizes CR, CRLF, trailing line whitespace, and final newlines', () => {
  assert.equal(normalizeCodeForAudit('first\r\nsecond\rthird  \n\t\n\n'), 'first\nsecond\nthird');
});

test('keeps leading line breaks while trimming only the end of the code value', () => {
  assert.equal(normalizeCodeForAudit('\nfirst\n'), '\nfirst');
});

test('converts nullish input to an empty string', () => {
  assert.equal(normalizeCodeForAudit(null), '');
});

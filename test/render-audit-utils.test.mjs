import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCodeForAudit } from '../scripts/render-audit-utils.mjs';

test('normalizes CR, CRLF, trailing line whitespace, and final newlines', () => {
  assert.equal(normalizeCodeForAudit('first\r\nsecond\rthird  \n\t\n\n'), 'first\nsecond\nthird');
});

test('keeps leading line breaks while trimming only the end of the code value', () => {
  assert.equal(normalizeCodeForAudit('\nfirst\n'), '\nfirst');
});

test('converts nullish input to an empty string', () => {
  assert.equal(normalizeCodeForAudit(null), '');
});

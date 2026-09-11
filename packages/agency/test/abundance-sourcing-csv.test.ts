import test from 'node:test';
import assert from 'node:assert/strict';
import { sourcingCsvHeader, sourcingCsvRow } from '../src/lib/abundance/sourcing-export.ts';

test('sourcing CSV preserves registry fields, escapes cells and leaves clinical claims unverified', () => {
  const row = sourcingCsvRow({
    npi: '1000000001',
    name: '=DANGEROUS()',
    practice_address_1: '12 Main St, Floor 2',
    practice_phone: '9999999999'
  } as never);
  assert.match(row, /"'=DANGEROUS\(\)"/);
  assert.match(row, /"12 Main St, Floor 2"/);
  assert.match(row, /"9999999999"/);
  assert.match(row, /invalid_placeholder/);
  assert.match(row, /public_registry_unverified/);
  assert.match(sourcingCsvHeader(), /EMR Experience/);
  assert.match(sourcingCsvHeader(), /Recruiter Notes/);
  assert.match(row, /Not verified/);
});

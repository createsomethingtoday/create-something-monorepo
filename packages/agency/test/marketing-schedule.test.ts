import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  marketingCadence,
  marketingEvidenceRules,
  marketingEditorialStatus
} from '../src/lib/data/marketingSchedule.ts';

test('publishing cadence keeps LinkedIn primary and YouTube bounded', () => {
  assert.equal(marketingCadence[0].channel, 'LinkedIn');
  assert.equal(marketingCadence.filter((item) => item.channel === 'YouTube').length, 1);
  assert.match(
    marketingCadence.find((item) => item.channel === 'Email')?.day ?? '',
    /twice monthly/i
  );
});

test('editorial status does not turn review dates into publication receipts', () => {
  assert.match(marketingEditorialStatus.title, /not yet announced/);
  assert.match(marketingEditorialStatus.detail, /not publication or email-send confirmations/);
  assert.match(marketingEditorialStatus.detail, /awaits evidence review/);
});

test('publication rules separate repository history from current proof', () => {
  assert.ok(
    marketingEvidenceRules.some((rule) => rule.includes('merge does not establish live behavior'))
  );
  assert.ok(marketingEvidenceRules.some((rule) => rule.includes('Client-private records')));
});

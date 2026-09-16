import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  marketingCadence,
  marketingEvidenceRules,
  marketingSchedule
} from '../src/lib/data/marketingSchedule.ts';

test('publishing cadence keeps LinkedIn primary and YouTube bounded', () => {
  assert.equal(marketingCadence[0].channel, 'LinkedIn');
  assert.equal(marketingCadence.filter((item) => item.channel === 'YouTube').length, 1);
  assert.match(
    marketingCadence.find((item) => item.channel === 'Email')?.day ?? '',
    /twice monthly/i
  );
});

test('the queue carries a reviewable source and evidence object', () => {
  assert.equal(marketingSchedule.length, 4);
  for (const item of marketingSchedule) {
    assert.ok(item.readerQuestion.endsWith('?'));
    assert.ok(item.source.length > 12);
    assert.ok(item.evidence.length > 12);
    assert.equal(item.state, 'evidence review');
  }
});

test('publication rules separate repository history from current proof', () => {
  assert.ok(
    marketingEvidenceRules.some((rule) => rule.includes('merge does not establish live behavior'))
  );
  assert.ok(marketingEvidenceRules.some((rule) => rule.includes('Client-private records')));
});

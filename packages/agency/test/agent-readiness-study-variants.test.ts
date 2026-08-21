import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  agentReadinessStudyVariantIds,
  agentReadinessStudyVariants,
  productionAgentReadinessVariantId,
  resolveAgentReadinessStudyVariant
} from '../src/lib/data/agentReadinessStudyVariants.ts';

const requiredCopy = [
  '$3,000',
  '25 high-intent buyer questions',
  'up to three competitors',
  'timestamped answers',
  'cited sources',
  'prioritized 30-day plan',
  'does not include implementation',
  'separately scoped Build',
  'Control from $900/month after launch',
  'No guaranteed rankings, citations, or recommendations.'
];

test('every local-only study variant retains the Buyer Readiness offer and boundary', () => {
  assert.deepEqual(agentReadinessStudyVariantIds, ['baseline', 'proof-first', 'outcome-first']);

  for (const id of agentReadinessStudyVariantIds) {
    const variant = agentReadinessStudyVariants[id];
    const copy = JSON.stringify(variant);
    for (const term of requiredCopy) {
      assert.match(copy, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.equal(variant.diagnostic.scenes.length, 3);
  }
});

test('the production route defaults to the highest-scoring baseline hierarchy', () => {
  assert.equal(productionAgentReadinessVariantId, 'baseline');
  assert.equal(resolveAgentReadinessStudyVariant(null).id, 'baseline');
  assert.equal(resolveAgentReadinessStudyVariant('not-a-study').id, 'baseline');
  assert.equal(resolveAgentReadinessStudyVariant('proof-first').id, 'proof-first');
});

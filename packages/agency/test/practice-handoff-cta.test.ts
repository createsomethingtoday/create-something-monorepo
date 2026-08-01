import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../src/routes/practice/+page.svelte', import.meta.url), 'utf8');

test('the closing handoff gives the mapping session one dominant action', () => {
  const handoffStart = route.indexOf('eyebrow="School + skeptical review"');
  const handoffEnd = route.indexOf('</PerformanceConversionHandoff>', handoffStart);
  const handoff = route.slice(handoffStart, handoffEnd);

  assert.ok(handoffStart >= 0, 'the skeptical-review handoff should exist');
  assert.ok(handoffEnd > handoffStart, 'the skeptical-review handoff should be complete');
  assert.equal((handoff.match(/<Button\b/g) ?? []).length, 1);
  assert.match(handoff, /<Button[\s\S]*?Request a mapping session[\s\S]*?<\/Button\s*>/);
  assert.match(handoff, /Inspect the bounded proof/);
  assert.match(handoff, /For service providers/);
  assert.match(handoff, /Use the Practice with clients/);
  assert.doesNotMatch(handoff, /Rehearse the operator journey/);

  const primaryIndex = handoff.indexOf('Request a mapping session');
  const proofIndex = handoff.indexOf('Inspect the bounded proof');
  const serviceProviderIndex = handoff.indexOf('For service providers');
  assert.ok(primaryIndex < proofIndex);
  assert.ok(proofIndex < serviceProviderIndex);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../../../.github/workflows/agent-wiki.yml', import.meta.url), 'utf8');

test('wiki checkout has a bounded fetch window plus time for every validation', () => {
  const jobMinutes = Number(workflow.match(/^    timeout-minutes: (\d+)$/m)?.[1]);
  const checkoutMinutes = Number(workflow.match(/- uses: actions\/checkout@[a-f0-9]{40}[^\n]*\n        timeout-minutes: (\d+)/)?.[1]);
  assert.equal(checkoutMinutes, 10, 'checkout needs its bounded 10-minute fetch window');
  assert(jobMinutes >= checkoutMinutes + 5 && jobMinutes <= 15, 'reserve five minutes for validation within a 15-minute job');
  assert.match(workflow, /actions\/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09/);
  assert(!workflow.includes('continue-on-error'), 'validation remains blocking');
  for (const command of [
    "node --test packages/database-layer/test/agent-wiki*.test.mjs",
    'node packages/database-layer/scripts/generate-agent-wiki.mjs --check',
    'node --test packages/database-layer/test/ontology.test.mjs',
    'node packages/database-layer/scripts/ontology.mjs check'
  ]) assert(workflow.includes(command), command);
});

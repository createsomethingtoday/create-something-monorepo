import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createOfferFindAgent } from '../dist/agent.js';
import { canonicalStringify, findOffers, SOURCE_POLICIES } from '../dist/index.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(packageRoot, 'fixtures/abercrombie-august-9.json');
const fixtureText = await readFile(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const firstInput = structuredClone(fixture);
const secondInput = structuredClone(fixture);
const first = findOffers(firstInput.request, firstInput.observations);
const second = findOffers(secondInput.request, secondInput.observations);

assert.equal(canonicalStringify(first), canonicalStringify(second));
assert.equal(JSON.stringify(firstInput), JSON.stringify(fixture));
assert.equal(JSON.stringify(secondInput), JSON.stringify(fixture));
assert.equal(await readFile(fixturePath, 'utf8'), fixtureText);
assert.deepEqual(first.summary, { recommend: 1, verify: 1, lead: 2, rejected: 1 });

const expected = new Map([
  ['fixture-official-20', ['recommend', 100]],
  ['fixture-ltk-15', ['verify', 69]],
  ['fixture-app-only', ['lead', 50]],
  ['fixture-deal-lead', ['lead', 45]],
  ['fixture-expired', ['rejected', 0]]
]);
for (const decision of first.decisions) {
  assert.deepEqual(
    [decision.status, decision.reliability.score],
    expected.get(decision.observationId)
  );
  assert.match(decision.receiptHash, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(decision.reliability.components).sort(), [
    'applicability',
    'freshness',
    'fulfillment',
    'sourceAuthority',
    'validity'
  ]);
}
assert.equal(
  new Set(first.decisions.map((decision) => decision.receiptHash)).size,
  first.decisions.length
);
assert.equal(Object.keys(SOURCE_POLICIES).length, 8);

const agent = createOfferFindAgent();
const agentTools = agent.tools.map((candidate) =>
  candidate.type === 'function' ? candidate.name : (candidate.name ?? candidate.type)
);
assert.deepEqual(agentTools, ['web_search', 'resolve_offer_evidence']);
assert.deepEqual(agent.toolUseBehavior, { stopAtToolNames: ['resolve_offer_evidence'] });

const summary = {
  schemaVersion: 'offer_resolution_acceptance.v0.1',
  ok: true,
  scenario: fixture.fixtureMetadata.scenario,
  fixtureNotice: fixture.fixtureMetadata.purpose,
  deterministic: true,
  inputUnchanged: true,
  sourceFamilyCount: Object.keys(SOURCE_POLICIES).length,
  agentTools,
  resolverTerminatesRun: true,
  counts: first.summary,
  decisions: first.decisions.map((decision) => ({
    observationId: decision.observationId,
    status: decision.status,
    score: decision.reliability.score,
    components: decision.reliability.components,
    caps: decision.reliability.caps.map((cap) => cap.code),
    receiptHash: decision.receiptHash
  }))
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

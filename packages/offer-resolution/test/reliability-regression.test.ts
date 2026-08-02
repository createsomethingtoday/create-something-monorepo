import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createOfferService, type OfferObservation, type OfferRequest } from '../src/index.js';

interface ReliabilityRegressionFixture {
  request: OfferRequest;
  observations: OfferObservation[];
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/verified-offer-regression.json', import.meta.url), 'utf8')
) as ReliabilityRegressionFixture;
const hostObservations = fixture.observations.map(({ source, ...observation }) => {
  const { observedAt: _observedAt, ...hostSource } = source;
  return { ...observation, source: hostSource };
});

test('current official evidence remains usable while stale LTK evidence is quarantined', async () => {
  const service = createOfferService({
    clock: () => new Date(fixture.request.asOf)
  });

  const result = await service.resolveOffers({ request: fixture.request, observations: hostObservations });
  const currentOfficial = result.supplementalOffers.find(
    (offer) => offer.observationId === 'fixture-current-official'
  );
  const staleLtk = result.evidence.find((offer) => offer.observationId === 'fixture-stale-ltk');

  assert.equal(currentOfficial?.confidence.label, 'Verified');
  assert.equal(currentOfficial?.actions.canCopyCode, true);
  assert.equal(currentOfficial?.actions.canWatch, true);
  assert.equal(staleLtk?.confidence.label, 'Evidence only');
  assert.equal(staleLtk?.projectedSavings, undefined);
  assert.deepEqual(staleLtk?.actions, { canCopyCode: false, canWatch: false });
  assert.equal(
    result.resolution.decisions.find((decision) => decision.observationId === 'fixture-stale-ltk')
      ?.reliability.components.freshness,
    15
  );
  assert.equal(
    result.resolution.decisions.find((decision) => decision.observationId === 'fixture-stale-ltk')
      ?.status,
    'lead'
  );
});

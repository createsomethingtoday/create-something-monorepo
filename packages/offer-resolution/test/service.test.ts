import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createFileOfferWatchRepository,
  createOfferService,
  findOffers,
  type OfferObservation,
  type OfferRequest
} from '../src/index.js';

interface Fixture {
  request: OfferRequest;
  observations: OfferObservation[];
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/abercrombie-august-9.json', import.meta.url), 'utf8')
) as Fixture;

test('find_offers returns authoritative receipts as user-ready offer cards', async () => {
  const service = createOfferService({
    discovery: {
      discover: async () => fixture.observations
    }
  });

  const result = await service.findOffers(fixture.request);
  const authoritative = findOffers(fixture.request, fixture.observations);

  assert.equal(result.schemaVersion, 'offer_service.v0.1');
  assert.equal(result.operation, 'find_offers');
  assert.deepEqual(result.resolution, authoritative);
  assert.equal(result.offers[0]?.observationId, 'fixture-official-20');
  assert.equal(result.offers[0]?.confidence.label, 'Verified');
  assert.equal(result.offers[0]?.confidence.score, 100);
  assert.equal(result.offers[0]?.freshness.score, 100);
  assert.equal(result.offers[0]?.projectedSavings?.amount, 40);
  assert.equal(result.offers[0]?.projectedSavings?.currency, 'USD');
  assert.equal(result.offers[0]?.actions.canCopyCode, true);
  assert.equal(result.offers[0]?.actions.canWatch, true);

  const creatorOffer = result.offers.find((offer) => offer.observationId === 'fixture-ltk-15');
  assert.equal(creatorOffer?.confidence.label, 'Worth trying');
  assert.match(creatorOffer?.disclosure ?? '', /retailer before relying/i);

  const expiredOffer = result.offers.find((offer) => offer.observationId === 'fixture-expired');
  assert.equal(expiredOffer?.confidence.label, 'Do not use');
  assert.equal(expiredOffer?.actions.canCopyCode, false);
});

test('verify_offer never promotes uncorroborated creator evidence to verified', async () => {
  const service = createOfferService({
    discovery: {
      discover: async () => fixture.observations
    }
  });
  const creatorObservation = fixture.observations.find(
    (observation) => observation.id === 'fixture-ltk-15'
  );
  assert.ok(creatorObservation);

  const result = await service.verifyOffer({
    request: fixture.request,
    observation: creatorObservation
  });

  assert.equal(result.schemaVersion, 'offer_service.v0.1');
  assert.equal(result.operation, 'verify_offer');
  assert.equal(result.verification, 'needs_checkout');
  assert.equal(result.offer.confidence.label, 'Worth trying');
  assert.match(result.offer.disclosure, /retailer before relying/i);
});

test('watch_offers is idempotent and survives a service restart', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-watch-service-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const filePath = join(stateDirectory, 'watches.json');
  const clock = () => new Date('2026-07-30T15:00:00.000Z');
  const discovery = {
    discover: async () => fixture.observations
  };
  const service = createOfferService({
    discovery,
    watches: createFileOfferWatchRepository({ filePath }),
    clock
  });
  const input = {
    request: fixture.request,
    until: '2026-08-09T23:59:59.000Z',
    idempotencyKey: 'user-123-abercrombie-august-9'
  };

  const first = await service.watchOffers(input);
  const retried = await service.watchOffers(input);

  assert.equal(first.schemaVersion, 'offer_service.v0.1');
  assert.equal(first.operation, 'watch_offers');
  assert.equal(first.watch.id, retried.watch.id);
  assert.equal(first.watch.runCount, 1);
  assert.equal(first.watch.latestResult?.operation, 'find_offers');

  const restarted = createOfferService({
    discovery,
    watches: createFileOfferWatchRepository({ filePath }),
    clock
  });
  assert.deepEqual(await restarted.getWatch(first.watch.id), first.watch);
  assert.doesNotMatch(readFileSync(filePath, 'utf8'), /user-123-abercrombie-august-9/);
});

test('due-watch execution records retry-safe failure history without losing the last receipt', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-watch-runner-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const filePath = join(stateDirectory, 'watches.json');
  let refreshShouldFail = false;
  const service = createOfferService({
    discovery: {
      discover: async () => {
        if (refreshShouldFail) throw new Error('public discovery unavailable');
        return fixture.observations;
      }
    },
    watches: createFileOfferWatchRepository({ filePath }),
    clock: () => new Date('2026-07-30T15:00:00.000Z')
  });
  const created = await service.watchOffers({
    request: fixture.request,
    until: '2026-08-09T23:59:59.000Z',
    idempotencyKey: 'runner-watch'
  });
  const initialReceipt = created.watch.latestResult;

  refreshShouldFail = true;
  const failed = await service.runDueWatches({ runKey: 'scheduled-2026-07-30T16:00Z' });
  const retried = await service.runDueWatches({ runKey: 'scheduled-2026-07-30T16:00Z' });
  const afterFailure = await service.getWatch(created.watch.id);

  assert.deepEqual(failed, { attempted: 1, succeeded: 0, failed: 1, skipped: 0 });
  assert.deepEqual(retried, { attempted: 0, succeeded: 0, failed: 0, skipped: 1 });
  assert.equal(afterFailure?.runCount, 2);
  assert.equal(afterFailure?.runs.at(-1)?.status, 'failed');
  assert.match(afterFailure?.runs.at(-1)?.error ?? '', /public discovery unavailable/);
  assert.deepEqual(afterFailure?.latestResult, initialReceipt);

  refreshShouldFail = false;
  assert.deepEqual(await service.runDueWatches({ runKey: 'scheduled-2026-07-30T17:00Z' }), {
    attempted: 1,
    succeeded: 1,
    failed: 0,
    skipped: 0
  });
  const afterSuccess = await service.getWatch(created.watch.id);
  assert.equal(afterSuccess?.runCount, 3);
  assert.equal(afterSuccess?.runs.at(-1)?.status, 'succeeded');
  assert.equal(afterSuccess?.latestResult?.operation, 'find_offers');
});

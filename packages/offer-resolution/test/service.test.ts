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
const hostObservations = fixture.observations.map(({ source, ...observation }) => {
  const { observedAt: _observedAt, ...hostSource } = source;
  return { ...observation, source: hostSource };
});

test('find_offers returns authoritative receipts as user-ready offer cards', async () => {
  const service = createOfferService({
    discovery: {
      discover: async () => fixture.observations
    },
    clock: () => new Date(fixture.request.asOf)
  });

  const callerTimestampIsIgnored = {
    ...fixture.request,
    asOf: '1999-01-01T00:00:00.000Z'
  };
  const result = await service.findOffers(callerTimestampIsIgnored);
  const repeated = await service.findOffers(callerTimestampIsIgnored);
  const authoritative = findOffers(fixture.request, fixture.observations);

  assert.equal(result.schemaVersion, 'offer_service.v0.1');
  assert.equal(result.operation, 'find_offers');
  assert.equal(result.observedAt, fixture.request.asOf);
  assert.match(result.receiptHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(repeated.receiptHash, result.receiptHash);
  assert.deepEqual(result.resolution, authoritative);
  assert.equal(result.offers[0]?.observationId, 'fixture-ltk-15');
  assert.equal(result.ltkOffers[0]?.observationId, 'fixture-ltk-15');
  assert.equal(result.supplementalOffers[0]?.observationId, 'fixture-official-20');
  assert.equal(result.evidence.length, 0);

  const official = result.supplementalOffers[0];
  assert.equal(official?.confidence.label, 'Verified');
  assert.equal(official?.confidence.score, 100);
  assert.equal(official?.freshness.score, 100);
  assert.equal(official?.projectedSavings?.amount, 40);
  assert.equal(official?.projectedSavings?.currency, 'USD');
  assert.equal(official?.actions.canCopyCode, true);
  assert.equal(official?.actions.canWatch, true);

  const creatorOffer = result.offers.find((offer) => offer.observationId === 'fixture-ltk-15');
  assert.equal(creatorOffer?.confidence.label, 'Worth trying');
  assert.match(creatorOffer?.disclosure ?? '', /retailer before relying/i);

  assert.equal(
    result.offers.some((offer) => offer.observationId === 'fixture-expired'),
    false
  );
  assert.equal(
    result.resolution.decisions.find((decision) => decision.observationId === 'fixture-expired')
      ?.status,
    'rejected'
  );
});

test('resolve_offers scores host-discovered evidence without invoking nested discovery', async () => {
  let discoveryCalls = 0;
  const service = createOfferService({
    discovery: {
      discover: async () => {
        discoveryCalls += 1;
        return [];
      }
    },
    clock: () => new Date(fixture.request.asOf)
  });

  const result = await service.resolveOffers({
    request: fixture.request,
    observations: hostObservations
  });

  assert.equal(discoveryCalls, 0);
  assert.equal(result.operation, 'find_offers');
  assert.equal(result.counts.ltk, 1);
  assert.equal(result.counts.supplemental, 3);
  assert.equal(result.resolution.request.asOf, fixture.request.asOf);
  assert.equal(result.observedAt, fixture.request.asOf);
});

test('resolve_offers tolerates imprecise public dates and coded offers without a stated discount', async () => {
  const service = createOfferService({
    discovery: { discover: async () => [] },
    clock: () => new Date(fixture.request.asOf)
  });
  const [hostObservation] = hostObservations;
  assert.ok(hostObservation);

  const result = await service.resolveOffers({
    request: fixture.request,
    observations: [
      {
        ...hostObservation,
        id: 'host-imprecise-public-date',
        source: { ...hostObservation.source, publishedAt: '2026-08-01' },
        offer: {
          code: 'HOSTCODE',
          status: 'unknown',
          endsAt: '2026-08-09'
        }
      }
    ]
  });

  assert.equal(result.resolution.decisions.length, 1);
  assert.equal(result.resolution.decisions[0]?.offerCode, 'HOSTCODE');
  assert.match(result.receiptHash, /^sha256:[a-f0-9]{64}$/);
});

test('keeps generic fulfillment pages out of LTK coupon and fallback offer results', async () => {
  const official = fixture.observations.find(
    (observation) => observation.id === 'fixture-official-20'
  );
  const ltk = fixture.observations.find((observation) => observation.id === 'fixture-ltk-15');
  assert.ok(official);
  assert.ok(ltk);
  const fulfillmentPage: OfferObservation = {
    ...official,
    id: 'abercrombie-pickup-information',
    title: 'Pickup & Delivery: how pickup works',
    source: {
      ...official.source,
      url: 'https://www.abercrombie.com/shop/us/help/shipping-handling'
    },
    offer: {
      discount: { kind: 'shipping' },
      status: 'active',
      minimumSubtotal: 35
    },
    evidence: { terms: 'explicit', code: 'not_applicable', corroboratingUrls: [] }
  };
  const service = createOfferService({
    discovery: { discover: async () => [official, ltk, fulfillmentPage] },
    clock: () => new Date(fixture.request.asOf)
  });

  const result = await service.findOffers(fixture.request);

  assert.deepEqual(
    result.offers.map((offer) => offer.observationId),
    ['fixture-ltk-15', 'fixture-official-20']
  );
  assert.equal(result.evidence[0]?.observationId, 'abercrombie-pickup-information');
  assert.equal(result.evidence[0]?.confidence.label, 'Evidence only');
  assert.deepEqual(result.evidence[0]?.actions, { canCopyCode: false, canWatch: false });
});

test('verify_offer never promotes uncorroborated creator evidence to verified', async () => {
  const service = createOfferService({
    discovery: {
      discover: async () => fixture.observations
    },
    clock: () => new Date(fixture.request.asOf)
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

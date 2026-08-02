import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createOfferHttpHandler,
  createFileOfferWatchRepository,
  createOfferService,
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
const { asOf: _fixtureAsOf, ...publicRequest } = fixture.request;

test('HTTP adapter exposes health and find_offers through real network requests', async (t) => {
  const service = createOfferService({
    discovery: { discover: async () => fixture.observations },
    clock: () => new Date(fixture.request.asOf)
  });
  const server = createServer(createOfferHttpHandler(service));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
  );
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;

  const healthResponse = await fetch(`${origin}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), {
    ok: true,
    service: 'offer-resolution',
    schemaVersion: 'offer_service.v0.1'
  });

  const findResponse = await fetch(`${origin}/v1/offers/find`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(publicRequest)
  });
  assert.equal(findResponse.status, 200);
  const result = (await findResponse.json()) as {
    operation: string;
    ltkOffers: Array<{ confidence: { label: string } }>;
    supplementalOffers: Array<{ confidence: { label: string } }>;
    evidence: Array<{ confidence: { label: string }; actions: { canCopyCode: boolean } }>;
  };
  assert.equal(result.operation, 'find_offers');
  assert.equal(result.ltkOffers.length, 0);
  assert.equal(result.supplementalOffers[0]?.confidence.label, 'Verified');
  assert.equal(result.evidence[0]?.confidence.label, 'Evidence only');
  assert.equal(result.evidence[0]?.actions.canCopyCode, false);
});

test('HTTP adapter exposes verify and persistent watch operations with actionable errors', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-http-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const service = createOfferService({
    discovery: { discover: async () => fixture.observations },
    watches: createFileOfferWatchRepository({
      filePath: join(stateDirectory, 'watches.json')
    }),
    clock: () => new Date('2026-07-30T15:00:00.000Z')
  });
  const server = createServer(createOfferHttpHandler(service));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
  );
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const creatorObservation = fixture.observations.find(
    (observation) => observation.id === 'fixture-ltk-15'
  );
  assert.ok(creatorObservation);

  const verifyResponse = await fetch(`${origin}/v1/offers/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ request: publicRequest, observation: creatorObservation })
  });
  assert.equal(verifyResponse.status, 200);
  assert.equal(
    ((await verifyResponse.json()) as { verification: string }).verification,
    'needs_checkout'
  );

  const watchInput = {
    request: publicRequest,
    until: '2026-08-09T23:59:59.000Z',
    idempotencyKey: 'http-watch-abercrombie'
  };
  const watchResponse = await fetch(`${origin}/v1/watches`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(watchInput)
  });
  assert.equal(watchResponse.status, 201);
  const watchResult = (await watchResponse.json()) as { watch: { id: string } };

  const retryResponse = await fetch(`${origin}/v1/watches`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(watchInput)
  });
  assert.equal(retryResponse.status, 200);
  assert.equal(
    ((await retryResponse.json()) as { watch: { id: string } }).watch.id,
    watchResult.watch.id
  );

  const getResponse = await fetch(`${origin}/v1/watches/${watchResult.watch.id}`);
  assert.equal(getResponse.status, 200);
  assert.equal(((await getResponse.json()) as { id: string }).id, watchResult.watch.id);

  const missingResponse = await fetch(`${origin}/v1/watches/watch_missing`);
  assert.equal(missingResponse.status, 404);
  assert.equal(((await missingResponse.json()) as { error: string }).error, 'watch_not_found');

  const invalidResponse = await fetch(`${origin}/v1/offers/find`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...publicRequest, budget: 0 })
  });
  assert.equal(invalidResponse.status, 400);
  assert.match(
    ((await invalidResponse.json()) as { message: string }).message,
    /budget must be greater than zero/i
  );

  const unknownFieldResponse = await fetch(`${origin}/v1/offers/find`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...publicRequest, modelAuthoredScore: 100 })
  });
  assert.equal(unknownFieldResponse.status, 400);
  assert.match(
    ((await unknownFieldResponse.json()) as { message: string }).message,
    /unrecognized key/i
  );
});

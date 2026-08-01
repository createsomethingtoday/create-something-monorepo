import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  createFileOfferWatchRepository,
  createOfferService,
  type OfferObservation,
  type OfferRequest
} from '@create-something/offer-resolution';

import { createOfferSavingsHttpServer } from '../src/index.js';

interface Fixture {
  request: OfferRequest;
  observations: OfferObservation[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../../offer-resolution/fixtures/abercrombie-august-9.json', import.meta.url),
    'utf8'
  )
) as Fixture;
const fixtureOfficial = fixture.observations.find(
  (observation) => observation.id === 'fixture-official-20'
);
if (!fixtureOfficial) throw new Error('Fixture is missing its official offer observation.');
const fixtureEvidenceOnly: OfferObservation = {
  ...fixtureOfficial,
  id: 'fixture-pickup-information',
  title: '[Fixture] Pickup & Delivery information',
  source: {
    ...fixtureOfficial.source,
    url: 'https://www.abercrombie.com/shop/us/help/shipping-handling'
  },
  offer: {
    discount: { kind: 'shipping' },
    status: 'active',
    minimumSubtotal: 35
  },
  evidence: { terms: 'explicit', code: 'not_applicable', corroboratingUrls: [] }
};
const { asOf: _fixtureAsOf, ...publicRequest } = fixture.request;
const port = Number.parseInt(process.env.PORT ?? '8791', 10);
const stateFile = resolve(process.env.OFFER_STATE_FILE ?? '.state/fixture-watches.json');
mkdirSync(dirname(stateFile), { recursive: true });

const service = createOfferService({
  discovery: { discover: async () => [...fixture.observations, fixtureEvidenceOnly] },
  watches: createFileOfferWatchRepository({ filePath: stateFile }),
  clock: () => new Date('2026-07-30T15:00:00.000Z')
});
const initialResult = await service.findOffers(fixture.request);
const server = createOfferSavingsHttpServer({
  service,
  standalone: {
    initialResult,
    watchInput: {
      request: publicRequest,
      until: '2026-08-09T23:59:59.000Z',
      idempotencyKey: 'standalone-widget-watch'
    }
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Offer Savings fixture server: http://127.0.0.1:${port}/widget`);
  console.log(`State file: ${stateFile}`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

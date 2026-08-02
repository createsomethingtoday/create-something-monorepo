import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
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
const { asOf: _fixtureAsOf, ...publicRequest } = fixture.request;
const hostObservations = fixture.observations.map(({ source, ...observation }) => {
  const { observedAt: _observedAt, ...hostSource } = source;
  return { ...observation, source: hostSource };
});
const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-savings-acceptance-'));
const stateFile = join(stateDirectory, 'watches.json');
const idempotencyKey = 'acceptance-watch-retry';
const clock = () => new Date('2026-07-30T15:00:00.000Z');

async function closeServer(server: ReturnType<typeof createOfferSavingsHttpServer>): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
}

async function start() {
  const service = createOfferService({
    watches: createFileOfferWatchRepository({ filePath: stateFile }),
    clock
  });
  const server = createOfferSavingsHttpServer({ service });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return { server, service, baseUrl: `http://127.0.0.1:${port}` };
}

try {
  const firstRuntime = await start();
  const client = new Client({ name: 'offer-savings-acceptance', version: '0.1.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${firstRuntime.baseUrl}/mcp`)));
  const listed = await client.listTools();
  const resources = await client.listResources();
  const hostResolved = await client.callTool({
    name: 'resolve_offers',
    arguments: { request: publicRequest, observations: hostObservations }
  });
  const searchPlan = await client.callTool({ name: 'plan_offer_search', arguments: publicRequest });
  const creator = fixture.observations.find((item) => item.id === 'fixture-ltk-15');
  if (!creator) throw new Error('Acceptance fixture is missing the LTK creator observation.');
  const verified = await client.callTool({
    name: 'verify_offer',
    arguments: { request: publicRequest, observation: creator }
  });
  const watchInput = {
    request: publicRequest,
    observations: hostObservations,
    until: '2026-08-09T23:59:59.000Z',
    idempotencyKey
  };
  const firstWatch = await client.callTool({ name: 'watch_offers', arguments: watchInput });
  const retryWatch = await client.callTool({ name: 'watch_offers', arguments: watchInput });
  const watchId = (firstWatch.structuredContent?.watch as { id: string }).id;
  const readWatch = await client.callTool({ name: 'get_watch', arguments: { id: watchId } });
  const malformed = await client.callTool({
    name: 'plan_offer_search',
    arguments: { ...publicRequest, budget: -1 }
  });
  const serverInfo = client.getServerVersion();
  const serverCapabilities = client.getServerCapabilities();
  await client.close();
  await closeServer(firstRuntime.server);

  const persistedText = readFileSync(stateFile, 'utf8');
  const persisted = JSON.parse(persistedText) as {
    schemaVersion: string;
    watches: Record<string, { runCount: number }>;
    idempotencyIndex: Record<string, string>;
  };
  const restarted = await start();
  const restartResponse = await fetch(`${restarted.baseUrl}/v1/watches/${watchId}`);
  const restartWatch = (await restartResponse.json()) as { id: string; runCount: number };
  await closeServer(restarted.server);

  const toolNames = listed.tools.map((tool) => tool.name);
  const hostResolvedResult = hostResolved.structuredContent as {
    receiptHash: string;
    request: { asOf: string };
    offers: Array<{ observationId: string; confidence: { label: string } }>;
  };
  const transcript = {
    schemaVersion: 'offer_savings_acceptance.v0.1',
    ok:
      serverInfo?.name === 'offer-savings-agent' &&
      toolNames.join(',') === 'plan_offer_search,resolve_offers,verify_offer,watch_offers,get_watch' &&
      resources.resources[0]?.mimeType === 'text/html;profile=mcp-app' &&
      /^sha256:[a-f0-9]{64}$/.test(hostResolvedResult.receiptHash) &&
      searchPlan.structuredContent?.operation === 'plan_offer_search' &&
      verified.structuredContent?.verification === 'needs_checkout' &&
      firstWatch.structuredContent?.created === true &&
      retryWatch.structuredContent?.created === false &&
      restartResponse.status === 200 &&
      restartWatch.id === watchId &&
      malformed.isError === true,
    initialization: { serverInfo, serverCapabilities },
    tools: listed.tools.map((tool) => ({
      name: tool.name,
      annotations: tool.annotations,
      resourceUri: (tool._meta?.ui as { resourceUri?: string } | undefined)?.resourceUri
    })),
    resources: resources.resources,
    hostResolve: {
      offerCount: hostResolvedResult.offers.length,
      bestObservationId: hostResolvedResult.offers[0]?.observationId,
      receiptHash: hostResolvedResult.receiptHash
    },
    plan: {
      operation: searchPlan.structuredContent?.operation,
      stages: (searchPlan.structuredContent?.plan as { stages?: Array<{ lane: string }> } | undefined)
        ?.stages?.map((stage) => stage.lane)
    },
    verify: { status: verified.structuredContent?.verification },
    watch: {
      id: watchId,
      created: firstWatch.structuredContent?.created,
      retryCreated: retryWatch.structuredContent?.created,
      getWatchId: (readWatch.structuredContent?.watch as { id: string }).id
    },
    persisted: {
      schemaVersion: persisted.schemaVersion,
      watchIds: Object.keys(persisted.watches),
      idempotencyIndexSize: Object.keys(persisted.idempotencyIndex).length,
      rawIdempotencyKeyPresent: persistedText.includes(idempotencyKey),
      runCount: persisted.watches[watchId]?.runCount
    },
    restart: {
      status: restartResponse.status,
      sameIdentity: restartWatch.id === watchId,
      runCount: restartWatch.runCount
    },
    negative: {
      malformedIsError: malformed.isError,
      purchaseSurfacePresent: toolNames.some((name) =>
        /purchase|checkout|cart|private|scrap/i.test(name)
      )
    }
  };
  if (
    !transcript.ok ||
    transcript.persisted.rawIdempotencyKeyPresent ||
    transcript.negative.purchaseSurfacePresent
  ) {
    throw new Error(`Offer Savings acceptance failed: ${JSON.stringify(transcript)}`);
  }
  process.stdout.write(`${JSON.stringify(transcript, null, 2)}\n`);
} finally {
  rmSync(stateDirectory, { recursive: true, force: true });
}

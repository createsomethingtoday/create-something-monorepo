import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createFileOfferWatchRepository,
  createOfferService,
  type OfferObservation,
  type OfferRequest
} from '@create-something/offer-resolution';

import {
  OFFER_WIDGET_URI,
  createOfferSavingsHttpServer,
  createOfferSavingsMcpServer,
  readOfferSavingsRuntimeConfig
} from '../src/index.js';
import { extractOfferSavingsWidgetResult } from '../src/widget.js';

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

test('widget waits for an authoritative result and unwraps supported host envelopes', () => {
  const result = {
    schemaVersion: 'offer_service.v0.1',
    operation: 'find_offers',
    counts: { ltk: 8, supplemental: 0, evidence: 0 }
  };

  assert.equal(extractOfferSavingsWidgetResult(null), null);
  assert.equal(extractOfferSavingsWidgetResult({ status: 'invoking' }), null);
  assert.deepEqual(extractOfferSavingsWidgetResult(result), result);
  assert.deepEqual(extractOfferSavingsWidgetResult({ structuredContent: result }), result);
  assert.deepEqual(
    extractOfferSavingsWidgetResult({ result: { structuredContent: result } }),
    result
  );
  assert.deepEqual(
    extractOfferSavingsWidgetResult({ mcp_tool_result: { structuredContent: result } }),
    result
  );
  assert.deepEqual(
    extractOfferSavingsWidgetResult({ call_tool_result: { structuredContent: result } }),
    result
  );
});

async function connectClient(
  stateFile: string,
  security?: {
    readSecuritySchemes: Array<{ type: 'oauth2'; scopes: string[] }>;
    writeSecuritySchemes: Array<{ type: 'oauth2'; scopes: string[] }>;
  }
) {
  const service = createOfferService({
    discovery: { discover: async () => fixture.observations },
    watches: createFileOfferWatchRepository({ filePath: stateFile }),
    clock: () => new Date('2026-07-30T15:00:00.000Z')
  });
  const server = createOfferSavingsMcpServer({ service, ...security });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'offer-savings-test', version: '0.1.0' });
  await client.connect(clientTransport);
  return { client, server };
}

test('MCP advertises resource-specific OAuth scopes when the host requires authentication', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-savings-mcp-auth-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const { client, server } = await connectClient(join(stateDirectory, 'watches.json'), {
    readSecuritySchemes: [{ type: 'oauth2', scopes: ['offer-savings:read'] }],
    writeSecuritySchemes: [
      { type: 'oauth2', scopes: ['offer-savings:read', 'offer-savings:write'] }
    ]
  });
  t.after(async () => {
    await client.close();
    await server.close();
  });

  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.find((tool) => tool.name === 'find_offers')?._meta?.securitySchemes, [
    { type: 'oauth2', scopes: ['offer-savings:read'] }
  ]);
  assert.deepEqual(tools.find((tool) => tool.name === 'watch_offers')?._meta?.securitySchemes, [
    { type: 'oauth2', scopes: ['offer-savings:read', 'offer-savings:write'] }
  ]);
});

test('MCP protocol exposes only the bounded offer workflow and widget resource', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-savings-mcp-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const { client, server } = await connectClient(join(stateDirectory, 'watches.json'));
  t.after(async () => {
    await client.close();
    await server.close();
  });

  const listed = await client.listTools();
  assert.equal(client.getServerVersion()?.version, '0.2.2');
  assert.equal(OFFER_WIDGET_URI, 'ui://offer-savings/results-v3.html');
  assert.deepEqual(
    listed.tools.map((tool) => tool.name),
    ['find_offers', 'verify_offer', 'watch_offers', 'get_watch']
  );
  assert.equal(
    listed.tools.find((tool) => tool.name === 'find_offers')?.annotations?.readOnlyHint,
    true
  );
  const findInputSchema = listed.tools.find((tool) => tool.name === 'find_offers')?.inputSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.equal(findInputSchema.properties?.asOf, undefined);
  assert.equal(findInputSchema.required?.includes('asOf'), false);
  for (const toolName of ['verify_offer', 'watch_offers']) {
    const schema = listed.tools.find((tool) => tool.name === toolName)?.inputSchema as {
      properties?: { request?: { properties?: Record<string, unknown>; required?: string[] } };
    };
    assert.equal(schema.properties?.request?.properties?.asOf, undefined);
    assert.equal(schema.properties?.request?.required?.includes('asOf'), false);
  }
  assert.equal(
    listed.tools.find((tool) => tool.name === 'watch_offers')?.annotations?.readOnlyHint,
    false
  );
  assert.equal(
    listed.tools.find((tool) => tool.name === 'watch_offers')?.annotations?.idempotentHint,
    true
  );
  assert.equal(
    (
      listed.tools.find((tool) => tool.name === 'find_offers')?._meta?.ui as {
        resourceUri?: string;
      }
    )?.resourceUri,
    OFFER_WIDGET_URI
  );
  assert.equal(
    listed.tools.some((tool) => /purchase|checkout|cart|private|scrap/i.test(tool.name)),
    false
  );

  const resources = await client.listResources();
  assert.deepEqual(
    resources.resources.map((resource) => resource.uri),
    [
      OFFER_WIDGET_URI,
      'ui://offer-savings/results-v2.html',
      'ui://offer-savings/results-v1.html'
    ]
  );
  assert.equal(
    resources.resources.every(
      (resource) => resource.mimeType === 'text/html;profile=mcp-app'
    ),
    true
  );
  const widget = await client.readResource({ uri: OFFER_WIDGET_URI });
  const widgetContent = widget.contents[0];
  const widgetHtml = widgetContent && 'text' in widgetContent ? widgetContent.text : '';
  assert.match(widgetHtml, /Offer Savings/i);
  assert.match(widgetHtml, /ui\/notifications\/tool-result/);
  assert.match(widgetHtml, /tools\/call/);
  assert.match(widgetHtml, /window\.openai/);
  assert.match(widgetHtml, /Try this code/);
  assert.match(widgetHtml, /Watch for a better offer/);
  assert.match(widgetHtml, /Freshness/);
  assert.match(widgetHtml, /LTK coupons first/i);
  assert.match(widgetHtml, /Evidence-only sources/i);
  assert.match(widgetHtml, /Search run/i);
  assert.match(widgetHtml, /Search in progress\. Waiting for a completed offer result\./i);
  assert.deepEqual(widgetContent?._meta?.ui, {
    prefersBorder: true,
    csp: { connectDomains: [], resourceDomains: [] }
  });
  for (const legacyUri of [
    'ui://offer-savings/results-v2.html',
    'ui://offer-savings/results-v1.html'
  ]) {
    const legacyWidget = await client.readResource({ uri: legacyUri });
    const legacyContent = legacyWidget.contents[0];
    assert.equal(legacyContent?.uri, legacyUri);
    assert.match(
      legacyContent && 'text' in legacyContent ? legacyContent.text : '',
      /Search in progress\. Waiting for a completed offer result\./i
    );
  }
});

test('MCP calls find, verify, and idempotent watch through the authoritative service', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-savings-mcp-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const { client, server } = await connectClient(join(stateDirectory, 'watches.json'));
  t.after(async () => {
    await client.close();
    await server.close();
  });

  const found = await client.callTool({ name: 'find_offers', arguments: publicRequest });
  assert.equal(found.isError, undefined);
  assert.equal(found.structuredContent?.operation, 'find_offers');
  assert.deepEqual(found.structuredContent?.counts, { ltk: 1, supplemental: 3, evidence: 0 });
  assert.match(
    found.content[0] && found.content[0].type === 'text' ? found.content[0].text : '',
    /1 LTK coupon candidate.*3 supplemental fallback offers/i
  );
  assert.equal(
    (found.structuredContent?.resolution as { request: { asOf: string } }).request.asOf,
    '2026-07-30T15:00:00.000Z'
  );
  assert.equal(
    (found.structuredContent?.ltkOffers as Array<{ confidence: { label: string } }>)[0]?.confidence
      .label,
    'Worth trying'
  );
  assert.equal(
    (found.structuredContent?.supplementalOffers as Array<{ confidence: { label: string } }>)[0]
      ?.confidence.label,
    'Verified'
  );

  const creator = fixture.observations.find((observation) => observation.id === 'fixture-ltk-15');
  assert.ok(creator);
  const verified = await client.callTool({
    name: 'verify_offer',
    arguments: { request: publicRequest, observation: creator }
  });
  assert.equal(verified.structuredContent?.verification, 'needs_checkout');

  const watchInput = {
    request: publicRequest,
    until: '2026-08-09T23:59:59.000Z',
    idempotencyKey: 'protocol-retry-key'
  };
  const first = await client.callTool({ name: 'watch_offers', arguments: watchInput });
  const retried = await client.callTool({ name: 'watch_offers', arguments: watchInput });
  assert.equal(first.structuredContent?.created, true);
  assert.equal(retried.structuredContent?.created, false);
  assert.equal(
    (first.structuredContent?.watch as { id: string }).id,
    (retried.structuredContent?.watch as { id: string }).id
  );

  const read = await client.callTool({
    name: 'get_watch',
    arguments: { id: (first.structuredContent?.watch as { id: string }).id }
  });
  assert.equal(
    (read.structuredContent?.watch as { id: string }).id,
    (first.structuredContent?.watch as { id: string }).id
  );
});

test('MCP input validation rejects malformed requests before service execution', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-savings-mcp-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const { client, server } = await connectClient(join(stateDirectory, 'watches.json'));
  t.after(async () => {
    await client.close();
    await server.close();
  });

  const malformed = await client.callTool({
    name: 'find_offers',
    arguments: { ...fixture.request, budget: -1 }
  });
  assert.equal(malformed.isError, true);
  assert.match(
    malformed.content[0] && malformed.content[0].type === 'text' ? malformed.content[0].text : '',
    /invalid|greater than zero/i
  );
});

test('Streamable HTTP serves MCP and the versioned API from one process', async (t) => {
  const stateDirectory = mkdtempSync(join(tmpdir(), 'offer-savings-http-'));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const service = createOfferService({
    discovery: { discover: async () => fixture.observations },
    watches: createFileOfferWatchRepository({ filePath: join(stateDirectory, 'watches.json') }),
    clock: () => new Date('2026-07-30T15:00:00.000Z')
  });
  const initialResult = await service.findOffers(fixture.request);
  const httpServer = createOfferSavingsHttpServer({
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
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  let client: Client | undefined;
  t.after(async () => {
    await client?.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve()))
    );
  });
  const port = (httpServer.address() as AddressInfo).port;
  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true,
    service: 'offer-savings-agent',
    schemaVersion: 'offer_service.v0.1',
    mcpEndpoint: '/mcp'
  });

  const api = await fetch(`http://127.0.0.1:${port}/v1/offers/find`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(publicRequest)
  });
  assert.equal(api.status, 200);
  assert.equal(((await api.json()) as { operation: string }).operation, 'find_offers');

  const standaloneWidget = await fetch(`http://127.0.0.1:${port}/widget`);
  assert.equal(standaloneWidget.status, 200);
  const standaloneHtml = await standaloneWidget.text();
  assert.match(standaloneHtml, /fixture-official-20/);
  assert.match(standaloneHtml, /standalone-widget-watch/);

  client = new Client({ name: 'offer-savings-http-test', version: '0.1.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
  assert.deepEqual(
    (await client.listTools()).tools.map((tool) => tool.name),
    ['find_offers', 'verify_offer', 'watch_offers', 'get_watch']
  );
  assert.equal(
    (await client.callTool({ name: 'find_offers', arguments: publicRequest })).structuredContent
      ?.operation,
    'find_offers'
  );
});

test('live runtime requires injected API credentials and an explicit state location', () => {
  assert.throws(() => readOfferSavingsRuntimeConfig({}), /OPENAI_API_KEY/);
  assert.throws(
    () => readOfferSavingsRuntimeConfig({ OPENAI_API_KEY: 'present-for-test' }),
    /OFFER_STATE_FILE/
  );
  const config = readOfferSavingsRuntimeConfig({
    OPENAI_API_KEY: 'present-for-test',
    OFFER_STATE_FILE: '/tmp/offer-savings-runtime-test.json',
    PORT: '9001',
    OFFER_AGENT_MODEL: 'gpt-5.4-mini',
    OFFER_AGENT_MAX_TURNS: '8'
  });
  assert.deepEqual(config, {
    port: 9001,
    stateFile: '/tmp/offer-savings-runtime-test.json',
    model: 'gpt-5.4-mini',
    maxTurns: 8
  });
});

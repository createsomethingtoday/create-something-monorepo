import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer, request as httpsRequest, type RequestOptions, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import { Webhook } from 'standardwebhooks';
import { sendCallback, type TransportOverrides } from '../sender/transport.mjs';

const headers = { 'content-type': 'application/json', 'webhook-id': 'evt_fixture', 'webhook-timestamp': '1', 'webhook-signature': 'v1,fixture', 'x-mcp-subscription-id': 'sub_fixture' };
const publicAnswer = [{ address: '1.1.1.1', family: 4 }];
const fixtureDir = mkdtempSync(join(tmpdir(), 'a2a-egress-'));
let certificate: Buffer;
let key: Buffer;

before(() => {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=hooks.example.net', '-addext', 'subjectAltName=DNS:hooks.example.net', '-keyout', join(fixtureDir, 'key.pem'), '-out', join(fixtureDir, 'cert.pem')], { stdio: 'ignore' });
  certificate = readFileSync(join(fixtureDir, 'cert.pem'));
  key = readFileSync(join(fixtureDir, 'key.pem'));
});
after(() => rmSync(fixtureDir, { recursive: true, force: true }));

async function fixture(handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const server = createServer({ key, cert: certificate }, handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const observed: RequestOptions[] = [];
  const requests: ClientRequest[] = [];
  // Explicit fixture network adapter: policy-selected public IPs are asserted,
  // then routed to a local TLS server. This is not live public DNS/egress proof.
  const request: NonNullable<TransportOverrides['request']> = (options, callback) => {
    observed.push(options);
    assert.equal(options.port, 443);
    assert.equal(options.agent, false);
    assert.equal(options.rejectUnauthorized, true);
    assert.equal(options.servername, options.hostname);
    assert.ok(options.lookup);
    options.lookup(String(options.hostname), { all: false }, (error, address, family) => {
      assert.equal(error, null);
      assert.equal(address, '1.1.1.1');
      assert.equal(family, 4);
    });
    const outgoing = httpsRequest({ ...options, port, ca: certificate, lookup: (_hostname, _options, done) => done(null, '127.0.0.1', 4) }, callback);
    requests.push(outgoing);
    return outgoing;
  };
  return { server, observed, requests, options: { resolve: async () => publicAnswer, request } };
}

async function stop(server: Server) {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
}

test('actual TLS fixture preserves exact signed bytes, hostname/SNI and pinned lookup', async () => {
  let received = Buffer.alloc(0);
  let host: string | undefined;
  let sni: string | false | null | undefined;
  const verifier = new Webhook(Buffer.alloc(32, 1), { format: 'raw' });
  const timestamp = new Date();
  const body = '{ "message": "hello 🧭", "escaped": "\\n" }\n';
  const signedHeaders = { ...headers, 'webhook-timestamp': String(Math.floor(timestamp.getTime() / 1000)), 'webhook-signature': verifier.sign(headers['webhook-id'], timestamp, body) };
  let verified: unknown;
  const local = await fixture((request, response) => {
    host = request.headers.host;
    sni = (request.socket as import('node:tls').TLSSocket).servername;
    const chunks: Buffer[] = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      received = Buffer.concat(chunks);
      assert.equal(request.headers['x-mcp-subscription-id'], headers['x-mcp-subscription-id']);
      assert.equal(request.headers['webhook-signature'], signedHeaders['webhook-signature']);
      verified = verifier.verify(received, request.headers as Record<string, string>);
      response.writeHead(202); response.end('accepted');
    });
  });
  let lookups = 0;
  try {
    const result = await sendCallback('https://hooks.example.net/events?x=1', body, signedHeaders, {
      ...local.options, resolve: async () => { lookups++; return lookups === 1 ? publicAnswer : [{ address: '127.0.0.1', family: 4 }]; },
    });
    assert.deepEqual(result, { status: 202, body: 'accepted' });
    assert.deepEqual(received, Buffer.from(body));
    assert.deepEqual(verified, JSON.parse(body));
    assert.equal(lookups, 1);
    // Fixture rewrites only the TCP port, so HTTP Host carries its test port.
    assert.ok(host?.startsWith('hooks.example.net:'));
    assert.equal(sni, 'hooks.example.net');
    assert.equal(local.observed[0].path, '/events?x=1');
  } finally { await stop(local.server); }
});

test('mixed DNS answers and empty DNS fail before connecting', async () => {
  let connected = 0;
  const request: NonNullable<TransportOverrides['request']> = () => { connected++; throw new Error('must not connect'); };
  for (const answers of [[], [...publicAnswer, { address: '10.0.0.1', family: 4 }], [{ address: '::ffff:1.1.1.1', family: 6 }], [{ address: '1.1.1.1', family: 6 }]]) {
    await assert.rejects(sendCallback('https://hooks.example.net/', '{}', headers, { resolve: async () => answers, request }), /callback_(address_denied|dns_failed)/);
  }
  assert.equal(connected, 0);
});

test('every later attempt resolves again and rejects a rebound private address', async () => {
  const local = await fixture((_request, response) => response.end('ok'));
  let lookups = 0;
  const options = { ...local.options, resolve: async () => ++lookups === 1 ? publicAnswer : [{ address: '127.0.0.1', family: 4 }] };
  try {
    await sendCallback('https://hooks.example.net/', '{}', headers, options);
    await assert.rejects(sendCallback('https://hooks.example.net/', '{}', headers, options), /callback_address_denied/);
    assert.equal(lookups, 2);
    assert.equal(local.observed.length, 1);
  } finally { await stop(local.server); }
});

test('actual TLS rejects a certificate for a different original callback hostname', async () => {
  let delivered = 0;
  const local = await fixture((_request, response) => { delivered++; response.end('bad'); });
  try {
    await assert.rejects(sendCallback('https://wrong.example.net/', '{}', headers, local.options), /callback_connection_failed/);
    assert.equal(delivered, 0);
  } finally { await stop(local.server); }
});

test('redirect is returned once and the Location target is never requested', async () => {
  let attempts = 0;
  const local = await fixture((_request, response) => { attempts++; response.writeHead(307, { location: 'https://127.0.0.1/private' }); response.end('redirect'); });
  try {
    assert.deepEqual(await sendCallback('https://hooks.example.net/', '{}', headers, local.options), { status: 307, body: 'redirect' });
    assert.equal(attempts, 1);
  } finally { await stop(local.server); }
});

test('request byte cap is enforced before DNS lookup', async () => {
  let lookups = 0;
  await assert.rejects(sendCallback('https://hooks.example.net/', '🧭'.repeat(65537), headers, { resolve: async () => { lookups++; return publicAnswer; } }), /callback_body_too_large/);
  assert.equal(lookups, 0);
});

test('actual TLS enforces declared and streaming response caps and rejects compression', async () => {
  for (const variant of ['declared', 'streamed', 'compressed']) {
    const local = await fixture((_request, response) => {
      if (variant === 'declared') response.writeHead(200, { 'content-length': String(65537) });
      else if (variant === 'compressed') response.writeHead(200, { 'content-encoding': 'gzip' });
      response.end(Buffer.alloc(65537));
    });
    try {
      await assert.rejects(sendCallback('https://hooks.example.net/', '{}', headers, local.options), /callback_response_(too_large|encoding)/);
    } finally { await stop(local.server); }
  }
});

test('deadline aborts actual TLS socket; late DNS result cannot start a connection', async () => {
  const local = await fixture((_request, _response) => {});
  try {
    await assert.rejects(sendCallback('https://hooks.example.net/', '{}', headers, { ...local.options, deadlineMs: 50 }), /callback_deadline_exceeded/);
    assert.equal(local.observed.length, 1);
    assert.equal(local.requests[0].destroyed, true);
  } finally { await stop(local.server); }
  let complete: ((value: typeof publicAnswer) => void) | undefined;
  let connections = 0;
  const pending = sendCallback('https://hooks.example.net/', '{}', headers, {
    deadlineMs: 10,
    resolve: () => new Promise(resolve => { complete = resolve; }),
    request: () => { connections++; throw new Error('must not connect'); },
  });
  await assert.rejects(pending, /callback_deadline_exceeded/);
  complete!(publicAnswer);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(connections, 0);
});

test('cancellation destroys an acquired TLS request', async () => {
  const controller = new AbortController();
  let arrived: (() => void) | undefined;
  const connected = new Promise<void>(resolve => { arrived = resolve; });
  const local = await fixture((_request, _response) => arrived!());
  try {
    const pending = sendCallback('https://hooks.example.net/', '{}', headers, { ...local.options, signal: controller.signal });
    await connected;
    controller.abort();
    await assert.rejects(pending, /callback_cancelled/);
    assert.equal(local.requests[0].destroyed, true);
  } finally { await stop(local.server); }
});

test('cancellation interrupts DNS and prevents the later result opening a socket', async () => {
  const controller = new AbortController();
  let complete: ((value: typeof publicAnswer) => void) | undefined;
  let connections = 0;
  const pending = sendCallback('https://hooks.example.net/', '{}', headers, {
    signal: controller.signal,
    resolve: () => new Promise(resolve => { complete = resolve; }),
    request: () => { connections++; throw new Error('must not connect'); },
  });
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, /callback_cancelled/);
  complete!(publicAnswer);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(connections, 0);
});

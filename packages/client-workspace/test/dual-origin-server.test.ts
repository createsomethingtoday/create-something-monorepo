import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { createDualOriginHandler } from '../scripts/dual-origin-server.mjs';

test('dual-origin listener owns the forwarded scheme and rejects unknown hosts', async () => {
  const server = createServer(createDualOriginHandler({
    localOrigin: 'http://127.0.0.1:5290',
    remoteOrigin: 'https://client-agent.example.test',
    handler: (incoming, response) => {
      response.end(JSON.stringify({
        host: incoming.headers.host,
        protocol: incoming.headers['x-forwarded-proto'],
        forwardedHost: incoming.headers['x-forwarded-host'] ?? null
      }));
    }
  }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const port = address.port;
    async function probe(host: string) {
      return await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const outgoing = request({
          hostname: '127.0.0.1',
          port,
          headers: {
            Host: host,
            'X-Forwarded-Proto': 'javascript',
            'X-Forwarded-Host': 'attacker.example.test'
          }
        }, (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
          incoming.on('end', () => resolve({ status: incoming.statusCode ?? 0, body: Buffer.concat(chunks).toString() }));
        });
        outgoing.on('error', reject);
        outgoing.end();
      });
    }
    assert.deepEqual(await probe('127.0.0.1:5290'), {
      status: 200,
      body: JSON.stringify({ host: '127.0.0.1:5290', protocol: 'http', forwardedHost: null })
    });
    assert.deepEqual(await probe('client-agent.example.test'), {
      status: 200,
      body: JSON.stringify({ host: 'client-agent.example.test', protocol: 'https', forwardedHost: null })
    });
    assert.equal((await probe('attacker.example.test')).status, 421);
  } finally {
    server.close();
  }
});

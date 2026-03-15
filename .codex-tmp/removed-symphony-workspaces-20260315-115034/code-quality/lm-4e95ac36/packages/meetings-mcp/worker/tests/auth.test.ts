import test from 'node:test';
import assert from 'node:assert/strict';

import { extractApiKey, validateApiKey } from '../lib/auth.js';

test('extractApiKey reads bearer token', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'Bearer abc123',
    },
  });

  assert.equal(extractApiKey(request), 'abc123');
});

test('extractApiKey reads X-API-Key header', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      'X-API-Key': 'header-key',
    },
  });

  assert.equal(extractApiKey(request), 'header-key');
});

test('extractApiKey reads token query parameter', () => {
  const request = new Request('https://example.com/mcp?token=query-key');
  assert.equal(extractApiKey(request), 'query-key');
});

test('validateApiKey rejects missing key', async () => {
  const request = new Request('https://example.com/mcp');
  const response = validateApiKey(request, { MCP_API_KEY: 'expected' });

  assert.ok(response);
  assert.equal(response?.status, 401);
  const body = (await response?.json()) as { error?: string };
  assert.equal(body?.error, 'Unauthorized');
});

test('validateApiKey rejects server without configured secret', async () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'Bearer expected',
    },
  });

  const response = validateApiKey(request, {});
  assert.ok(response);
  assert.equal(response?.status, 500);
  const body = (await response?.json()) as { error?: string };
  assert.equal(body?.error, 'ServerMisconfigured');
});

test('validateApiKey accepts matching key', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'Bearer expected',
    },
  });

  const response = validateApiKey(request, { MCP_API_KEY: 'expected' });
  assert.equal(response, null);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractApiKey,
  resolveRequestAccountId,
  validateApiKey,
} from '../lib/auth.js';

test('extractApiKey reads bearer token case-insensitively and trims it', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'bearer   abc123   ',
    },
  });

  assert.equal(extractApiKey(request), 'abc123');
});

test('extractApiKey reads X-API-Key header and trims it', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      'X-API-Key': '  header-key  ',
    },
  });

  assert.equal(extractApiKey(request), 'header-key');
});

test('resolveRequestAccountId prefers explicit account headers and ignores bearer auth', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'Bearer shared-secret',
      'x-mcp-account-id': '  account-42  ',
    },
  });

  assert.equal(resolveRequestAccountId(request), 'account-42');
});

test('resolveRequestAccountId does not fall back to the bearer token', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'Bearer shared-secret',
    },
  });

  assert.equal(resolveRequestAccountId(request), null);
});

test('validateApiKey accepts matching key with lowercase bearer auth', () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'bearer expected',
    },
  });

  const response = validateApiKey(request, { MCP_API_KEY: 'expected' });
  assert.equal(response, null);
});

test('validateApiKey rejects wrong key', async () => {
  const request = new Request('https://example.com/mcp', {
    headers: {
      Authorization: 'Bearer wrong',
    },
  });

  const response = validateApiKey(request, { MCP_API_KEY: 'expected' });
  assert.ok(response);
  assert.equal(response?.status, 401);
  const body = (await response?.json()) as { error?: string };
  assert.equal(body?.error, 'Unauthorized');
});

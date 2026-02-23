import { describe, expect, it } from 'vitest';

import { misconfiguredResponse, validateBearerToken } from './auth.js';

describe('validateBearerToken', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('https://example.com/mcp');
    const response = validateBearerToken(req, 'secret');
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    const body = await response?.json();
    expect(body?.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when bearer token is invalid', () => {
    const req = new Request('https://example.com/mcp', {
      headers: { Authorization: 'Bearer wrong' },
    });
    const response = validateBearerToken(req, 'secret');
    expect(response?.status).toBe(401);
  });

  it('accepts valid bearer token', () => {
    const req = new Request('https://example.com/mcp', {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(validateBearerToken(req, 'secret')).toBeNull();
  });
});

describe('misconfiguredResponse', () => {
  it('returns 503 with MISCONFIGURED code', async () => {
    const response = misconfiguredResponse('MCP_API_KEY is not configured.');
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body?.error?.code).toBe('MISCONFIGURED');
  });
});

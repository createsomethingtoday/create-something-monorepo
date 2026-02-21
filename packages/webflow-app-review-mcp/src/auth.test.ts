import { describe, expect, it } from 'vitest';

import { validateBearerToken } from './auth.js';

describe('validateBearerToken', () => {
  it('allows requests when token enforcement is disabled', () => {
    const req = new Request('https://example.com/mcp');
    expect(validateBearerToken(req, undefined)).toBeNull();
  });

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


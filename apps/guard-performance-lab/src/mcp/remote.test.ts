import { describe, expect, it } from 'vitest';
import { authorizeRemoteGuardMcp } from './remote.js';

describe('remote Guard Lab MCP authorization', () => {
  it('does not construct a tool server before bearer identity is verified', async () => {
    const result = await authorizeRemoteGuardMcp({
      request: new Request('https://guard.example/mcp'),
      url: new URL('https://guard.example/mcp'),
      env: {
        ENVIRONMENT: 'production',
        CS_IDENTITY_ISSUER: 'https://id.example',
        CS_IDENTITY_JWKS_URL: 'https://id.example/.well-known/jwks.json',
        CS_IDENTITY_AUDIENCE: 'guard-performance-lab',
        GUARD_LAB_OPERATOR_SUBJECTS: 'subject-operator'
      }
    });
    expect(result.access.status).toBe('anonymous');
    expect(result.server).toBeNull();
  });
});

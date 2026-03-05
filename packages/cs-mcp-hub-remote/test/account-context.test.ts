import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAccountContext, resolveHubIdentityMode } from '../index.ts';

function makeExtra(headers: Record<string, string>) {
  return {
    requestInfo: {
      headers,
    },
  };
}

test('resolveHubIdentityMode defaults to session_required', () => {
  const mode = resolveHubIdentityMode({} as any);
  assert.equal(mode, 'session_required');
});

test('resolveAccountContext requires session token header in session_required mode', async () => {
  await assert.rejects(
    resolveAccountContext(
      makeExtra({}),
      {
        HUB_IDENTITY_MODE: 'session_required',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    ),
    /Missing X-MCP-Session-Token header\./,
  );
});

test('resolveAccountContext resolves identity via session resolver in session_required mode', async () => {
  const originalFetch = globalThis.fetch;
  let capturedAuth = '';
  let capturedToken = '';

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    capturedAuth = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const body = JSON.parse(String(init?.body ?? '{}')) as { token?: string };
    capturedToken = body.token ?? '';
    return new Response(
      JSON.stringify({
        valid: true,
        session_id: 'ms_123',
        account_id: 'acct_123',
        tenant_id: 'tenant_acme',
        user_id: 'user_123',
        allowed_tool_prefixes: ['composio-toolkit-gmail__'],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  };

  try {
    const context = await resolveAccountContext(
      makeExtra({ 'x-mcp-session-token': 'ms_tok_abc' }),
      {
        HUB_IDENTITY_MODE: 'session_required',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(capturedAuth, 'Bearer resolver_secret');
    assert.equal(capturedToken, 'ms_tok_abc');
    assert.equal(context.accountId, 'acct_123');
    assert.equal(context.tenantId, 'tenant_acme');
    assert.equal(context.userId, 'user_123');
    assert.equal(context.sessionId, 'ms_123');
    assert.equal(context.identitySource, 'session');
    assert.deepEqual(context.allowedToolPrefixes, ['composio-toolkit-gmail__']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveAccountContext keeps fallback behavior in compat mode', async () => {
  const context = await resolveAccountContext(
    makeExtra({ 'x-mcp-account-id': 'acct_fallback' }),
    {
      HUB_IDENTITY_MODE: 'compat',
    } as any,
  );

  assert.equal(context.accountId, 'acct_fallback');
  assert.equal(context.identitySource, 'fallback');
});

test('resolveAccountContext can disable compat header account override', async () => {
  const context = await resolveAccountContext(
    makeExtra({ 'x-mcp-account-id': 'acct_header_override' }),
    {
      HUB_IDENTITY_MODE: 'compat',
      HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS: 'false',
      HUB_ACCOUNT_ID: 'acct_fixed',
    } as any,
  );

  assert.equal(context.accountId, 'acct_fixed');
  assert.equal(context.identitySource, 'fallback');
});

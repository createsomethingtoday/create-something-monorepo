import assert from 'node:assert/strict';
import test from 'node:test';

import { authorizeRequest, resolveAccountContext, resolveHubIdentityMode } from '../index.ts';

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

test('resolveAccountContext preserves unrestricted tool access for compat personal bearer tokens', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (): Promise<Response> =>
    new Response(
      JSON.stringify({
        valid: true,
        account_id: 'acct_personal',
        tenant_id: 'tenant_acme',
        user_id: 'user_legacy',
        allowed_tool_prefixes: null,
        auth_mode: 'legacy_key',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

  try {
    const context = await resolveAccountContext(
      makeExtra({ authorization: 'Bearer mlk_personal_token' }),
      {
        HUB_IDENTITY_MODE: 'compat',
        HUB_API_TOKEN: 'hub_static_token',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(context.accountId, 'acct_personal');
    assert.equal(context.identitySource, 'session');
    assert.equal(context.allowedToolPrefixes, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authorizeRequest accepts a resolved personal bearer token in compat mode', async () => {
  const originalFetch = globalThis.fetch;
  let capturedAuth = '';
  let capturedToken = '';

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    capturedAuth = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const body = JSON.parse(String(init?.body ?? '{}')) as { token?: string };
    capturedToken = body.token ?? '';
    return new Response(
      JSON.stringify({
        valid: true,
        account_id: 'acct_personal',
        tenant_id: 'tenant_acme',
        user_id: 'user_legacy',
        auth_mode: 'legacy_key',
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
    const failure = await authorizeRequest(
      new Request('https://hub.example/mcp', {
        headers: {
          Authorization: 'Bearer mlk_personal_token',
        },
      }),
      {
        HUB_API_TOKEN: 'hub_static_token',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(failure, null);
    assert.equal(capturedAuth, 'Bearer resolver_secret');
    assert.equal(capturedToken, 'mlk_personal_token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authorizeRequest rejects an invalid personal bearer token when static auth is configured', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (): Promise<Response> =>
    new Response(
      JSON.stringify({
        valid: false,
        reason: 'token_not_found',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

  try {
    const failure = await authorizeRequest(
      new Request('https://hub.example/mcp', {
        headers: {
          Authorization: 'Bearer mlk_invalid_token',
        },
      }),
      {
        HUB_API_TOKEN: 'hub_static_token',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.ok(failure instanceof Response);
    assert.equal(failure.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

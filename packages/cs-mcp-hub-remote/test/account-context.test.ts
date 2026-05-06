import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizeRequest,
  normalizeInboundMcpRequest,
  resolveAccountContext,
  resolveHubIdentityMode,
} from '../index.ts';

function makeExtra(headers: Record<string, string>) {
  return {
    requestInfo: {
      headers,
    },
  };
}

function makeExtraFromRequest(request: Request) {
  const headers = Object.fromEntries(request.headers.entries());
  headers.host ??= new URL(request.url).host;
  return makeExtra(headers);
}

test('resolveHubIdentityMode defaults to session_required', () => {
  const mode = resolveHubIdentityMode({} as any);
  assert.equal(mode, 'session_required');
});

test('resolveAccountContext requires session token header or bearer token in session_required mode', async () => {
  await assert.rejects(
    resolveAccountContext(
      makeExtra({}),
      {
        HUB_IDENTITY_MODE: 'session_required',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    ),
    /Missing X-MCP-Session-Token header or bearer token\./,
  );
});

test('resolveAccountContext resolves identity via session resolver in session_required mode', async () => {
  const originalFetch = globalThis.fetch;
  let capturedAuth = '';
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    capturedAuth = request.headers.get('authorization') ?? '';
    const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
    capturedToken = body.token ?? '';
    capturedResourceHost = body.resource_host ?? '';
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
      makeExtra({
        'x-mcp-session-token': 'ms_tok_abc',
        host: 'viv-blondish.mcp.createsomething.agency',
      }),
      {
        HUB_IDENTITY_MODE: 'session_required',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(capturedAuth, 'Bearer resolver_secret');
    assert.equal(capturedToken, 'ms_tok_abc');
    assert.equal(capturedResourceHost, 'viv-blondish');
    assert.equal(context.accountId, 'acct_123');
    assert.equal(context.tenantId, 'tenant_acme');
    assert.equal(context.userId, 'user_123');
    assert.equal(context.sessionId, 'ms_123');
    assert.equal(context.authMode, 'session');
    assert.equal(context.boundHost, null);
    assert.equal(context.resourceHost, 'viv-blondish');
    assert.equal(context.identitySource, 'session');
    assert.deepEqual(context.allowedToolPrefixes, ['composio-toolkit-gmail__']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveAccountContext prefers identity service binding when available', async () => {
  const originalFetch = globalThis.fetch;
  let bindingCalled = false;
  let capturedAuth = '';
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (): Promise<Response> => {
    throw new Error('global fetch should not be used when IDENTITY_WORKER binding is present');
  };

  try {
    const context = await resolveAccountContext(
      makeExtra({
        'x-mcp-session-token': 'ms_tok_binding',
        host: 'cs-mcp-hub-remote.createsomething.workers.dev',
      }),
      {
        HUB_IDENTITY_MODE: 'session_required',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
        IDENTITY_WORKER: {
          fetch: async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const request = _input instanceof Request ? _input : new Request(String(_input), init);
            bindingCalled = true;
            capturedAuth = request.headers.get('authorization') ?? '';
            const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
            capturedToken = body.token ?? '';
            capturedResourceHost = body.resource_host ?? '';
            return new Response(
              JSON.stringify({
                valid: true,
                session_id: 'ms_binding',
                account_id: 'acct_binding',
                tenant_id: 'tenant_binding',
                user_id: 'user_binding',
                allowed_tool_prefixes: ['composio-toolkit-slack__'],
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            );
          },
        },
      } as any,
    );

    assert.equal(bindingCalled, true);
    assert.equal(capturedAuth, 'Bearer resolver_secret');
    assert.equal(capturedToken, 'ms_tok_binding');
    assert.equal(capturedResourceHost, 'cs-mcp-hub-remote');
    assert.equal(context.accountId, 'acct_binding');
    assert.equal(context.authMode, 'session');
    assert.equal(context.identitySource, 'session');
    assert.deepEqual(context.allowedToolPrefixes, ['composio-toolkit-slack__']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveAccountContext accepts managed bearer auth in session_required mode', async () => {
  const originalFetch = globalThis.fetch;
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = _input instanceof Request ? _input : new Request(String(_input), init);
    const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
    capturedToken = body.token ?? '';
    capturedResourceHost = body.resource_host ?? '';
    return new Response(
      JSON.stringify({
        valid: true,
        session_id: null,
        account_id: 'acct_lane',
        tenant_id: 'tenant_lane',
        user_id: 'user_lane',
        bound_host: 'morgan-young-c3-management',
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
      makeExtra({
        authorization: 'Bearer mcpu_lane_token',
        host: 'morgan-young-c3-management.mcp.createsomething.agency',
      }),
      {
        HUB_IDENTITY_MODE: 'session_required',
        HUB_API_TOKEN: 'hub_static_token',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(capturedToken, 'mcpu_lane_token');
    assert.equal(capturedResourceHost, 'morgan-young-c3-management');
    assert.equal(context.accountId, 'acct_lane');
    assert.equal(context.authMode, 'resolved');
    assert.equal(context.boundHost, 'morgan-young-c3-management');
    assert.equal(context.resourceHost, 'morgan-young-c3-management');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveAccountContext ignores compat header account override by default', async () => {
  const context = await resolveAccountContext(
    makeExtra({ 'x-mcp-account-id': 'acct_fallback' }),
    {
      HUB_IDENTITY_MODE: 'compat',
    } as any,
  );

  assert.equal(context.accountId, 'operator');
  assert.equal(context.authMode, 'fallback');
  assert.equal(context.toolMode, 'read_write');
  assert.equal(context.resourceHost, null);
  assert.equal(context.identitySource, 'fallback');
});

test('resolveAccountContext can opt into compat header account override', async () => {
  const context = await resolveAccountContext(
    makeExtra({ 'x-mcp-account-id': 'acct_header_override' }),
    {
      HUB_IDENTITY_MODE: 'compat',
      HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS: 'true',
    } as any,
  );

  assert.equal(context.accountId, 'acct_header_override');
  assert.equal(context.authMode, 'fallback');
  assert.equal(context.toolMode, 'read_write');
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
  assert.equal(context.authMode, 'fallback');
  assert.equal(context.toolMode, 'read_write');
  assert.equal(context.identitySource, 'fallback');
});

test('resolveAccountContext can force compat fallback identities to read_only', async () => {
  const context = await resolveAccountContext(
    makeExtra({ 'x-mcp-account-id': 'acct_fallback' }),
    {
      HUB_IDENTITY_MODE: 'compat',
      HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS: 'true',
      HUB_COMPAT_FALLBACK_TOOL_MODE: 'read_only',
    } as any,
  );

  assert.equal(context.accountId, 'acct_fallback');
  assert.equal(context.authMode, 'fallback');
  assert.equal(context.toolMode, 'read_only');
  assert.equal(context.identitySource, 'fallback');
});

test('resolveAccountContext preserves resolver-backed compat personal bearer identities', async () => {
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
    assert.equal(context.authMode, 'legacy_key');
    assert.equal(context.identitySource, 'session');
    assert.equal(context.allowedToolPrefixes, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveAccountContext does not resolve compat static hub bearer through identity', async () => {
  const originalFetch = globalThis.fetch;
  let resolverCalled = false;

  globalThis.fetch = async (): Promise<Response> => {
    resolverCalled = true;
    return new Response(
      JSON.stringify({
        valid: true,
        account_id: 'acct_reviewer',
        tenant_id: 'tenant_webflow_marketplace',
        user_id: 'auth0|reviewer',
        tool_mode: 'read_write',
        allowed_tool_prefixes: ['webflow-template-review-mcp__template_review_assign_self'],
        auth_mode: 'managed_bearer',
        bound_host: 'wf-template-review-eric',
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
      makeExtra({
        authorization: 'Bearer mcpu_reviewer_lane_token',
        host: 'wf-template-review-eric.mcp.createsomething.agency',
      }),
      {
        HUB_IDENTITY_MODE: 'compat',
        HUB_API_TOKEN: 'mcpu_reviewer_lane_token',
        HUB_ACCOUNT_ID: 'acct_reviewer_lane',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(resolverCalled, false);
    assert.equal(context.accountId, 'acct_reviewer_lane');
    assert.equal(context.authMode, 'fallback');
    assert.equal(context.identitySource, 'fallback');
    assert.equal(context.boundHost, null);
    assert.equal(context.resourceHost, 'wf-template-review-eric');
    assert.deepEqual(context.allowedToolPrefixes, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveAccountContext skips resolver for compat static hub bearer even if resolver would reject it', async () => {
  const originalFetch = globalThis.fetch;
  let resolverCalled = false;

  globalThis.fetch = async (): Promise<Response> => {
    resolverCalled = true;
    return new Response(
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
  };

  try {
    const context = await resolveAccountContext(
      makeExtra({
        authorization: 'Bearer hub_static_token',
      }),
      {
        HUB_IDENTITY_MODE: 'compat',
        HUB_API_TOKEN: 'hub_static_token',
        HUB_ACCOUNT_ID: 'acct_lane',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(resolverCalled, false);
    assert.equal(context.accountId, 'acct_lane');
    assert.equal(context.authMode, 'fallback');
    assert.equal(context.identitySource, 'fallback');
    assert.equal(context.toolMode, 'read_write');
    assert.equal(context.allowedToolPrefixes, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authorizeRequest accepts a resolved personal bearer token in compat mode', async () => {
  const originalFetch = globalThis.fetch;
  let capturedAuth = '';
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = _input instanceof Request ? _input : new Request(String(_input), init);
    capturedAuth = request.headers.get('authorization') ?? '';
    const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
    capturedToken = body.token ?? '';
    capturedResourceHost = body.resource_host ?? '';
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
      new Request('https://viv-blondish.mcp.createsomething.agency/mcp', {
        headers: {
          Authorization: 'Bearer mlk_personal_token_authz',
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
    assert.equal(capturedToken, 'mlk_personal_token_authz');
    assert.equal(capturedResourceHost, 'viv-blondish');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authorizeRequest accepts the configured HUB_API_TOKEN via mcp_access_token query param', async () => {
  const failure = await authorizeRequest(
    new Request(
      'https://aaron-outerfields.mcp.createsomething.agency/mcp?mcp_access_token=hub_static_token',
    ),
    {
      HUB_API_TOKEN: 'hub_static_token',
      HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
      HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
    } as any,
  );

  assert.equal(failure, null);
});

test('authorizeRequest accepts a resolved personal token via mcp_access_token query param', async () => {
  const originalFetch = globalThis.fetch;
  let capturedAuth = '';
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = _input instanceof Request ? _input : new Request(String(_input), init);
    capturedAuth = request.headers.get('authorization') ?? '';
    const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
    capturedToken = body.token ?? '';
    capturedResourceHost = body.resource_host ?? '';
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
      new Request(
        'https://aaron-outerfields.mcp.createsomething.agency/mcp?mcp_access_token=mlk_personal_token_query',
      ),
      {
        HUB_API_TOKEN: 'hub_static_token',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(failure, null);
    assert.equal(capturedAuth, 'Bearer resolver_secret');
    assert.equal(capturedToken, 'mlk_personal_token_query');
    assert.equal(capturedResourceHost, 'aaron-outerfields');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authorizeRequest accepts a resolved personal token via token query param', async () => {
  const originalFetch = globalThis.fetch;
  const token = 'mlk_personal_token_query_via_token';
  let capturedAuth = '';
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = _input instanceof Request ? _input : new Request(String(_input), init);
    capturedAuth = request.headers.get('authorization') ?? '';
    const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
    capturedToken = body.token ?? '';
    capturedResourceHost = body.resource_host ?? '';
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
      new Request(`https://aaron-outerfields.mcp.createsomething.agency/mcp?token=${token}`),
      {
        HUB_API_TOKEN: 'hub_static_token',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(failure, null);
    assert.equal(capturedAuth, 'Bearer resolver_secret');
    assert.equal(capturedToken, token);
    assert.equal(capturedResourceHost, 'aaron-outerfields');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authorizeRequest accepts a resolved personal token via x-api-key header', async () => {
  const originalFetch = globalThis.fetch;
  let capturedAuth = '';
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = _input instanceof Request ? _input : new Request(String(_input), init);
    capturedAuth = request.headers.get('authorization') ?? '';
    const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
    capturedToken = body.token ?? '';
    capturedResourceHost = body.resource_host ?? '';
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
      new Request('https://aaron-outerfields.mcp.createsomething.agency/mcp', {
        headers: {
          'x-api-key': 'mlk_personal_token_header',
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
    assert.equal(capturedToken, 'mlk_personal_token_header');
    assert.equal(capturedResourceHost, 'aaron-outerfields');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('normalizeInboundMcpRequest exposes mcp_access_token to downstream account resolution', async () => {
  const originalFetch = globalThis.fetch;
  const token = 'mlk_personal_token_normalized';
  let capturedAuth = '';
  let capturedToken = '';
  let capturedResourceHost = '';

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = _input instanceof Request ? _input : new Request(String(_input), init);
    capturedAuth = request.headers.get('authorization') ?? '';
    const body = JSON.parse(await request.text()) as { token?: string; resource_host?: string | null };
    capturedToken = body.token ?? '';
    capturedResourceHost = body.resource_host ?? '';
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
    const request = normalizeInboundMcpRequest(
      new Request(`https://aaron-outerfields.mcp.createsomething.agency/mcp?mcp_access_token=${token}`),
    );

    assert.equal(request.headers.get('authorization'), `Bearer ${token}`);

    const context = await resolveAccountContext(
      makeExtraFromRequest(request),
      {
        HUB_IDENTITY_MODE: 'session_required',
        HUB_API_TOKEN: 'hub_static_token',
        HUB_SESSION_RESOLVE_URL: 'https://identity.example/resolve',
        HUB_SESSION_RESOLVE_TOKEN: 'resolver_secret',
      } as any,
    );

    assert.equal(capturedAuth, 'Bearer resolver_secret');
    assert.equal(capturedToken, token);
    assert.equal(capturedResourceHost, 'aaron-outerfields');
    assert.equal(context.accountId, 'acct_personal');
    assert.equal(context.tenantId, 'tenant_acme');
    assert.equal(context.identitySource, 'session');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authorizeRequest rejects host-mismatched managed bearer tokens', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (): Promise<Response> =>
    new Response(
      JSON.stringify({
        valid: false,
        reason: 'host_mismatch',
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
      new Request('https://morgan-young-c3-management.mcp.createsomething.agency/mcp', {
        headers: {
          Authorization: 'Bearer mcpu_wrong_host',
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

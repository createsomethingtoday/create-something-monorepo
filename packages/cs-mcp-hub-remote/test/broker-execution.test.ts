import assert from 'node:assert/strict';
import test from 'node:test';

import { buildHubTelemetryMetadata, executeProxyRoute, extractInvocationTrace } from '../index.ts';

const disabledRateLimitPolicy = {
  enabled: false,
  maxCalls: 0,
  windowMs: 60_000,
  windowSeconds: 60,
  scope: 'account' as const,
  exemptServers: new Set<string>(),
};

const disabledQuotaPolicy = {
  enabled: false,
  maxCallsPerPeriod: 0,
  exemptServers: new Set<string>(),
};

const trace = {
  requestId: 'req_1',
  correlationId: 'corr_1',
  transportRequestId: 'req_1',
};

test('extractInvocationTrace reads experiment context from headers, meta, and args', () => {
  const trace = extractInvocationTrace(
    {
      id: 'request_1',
      params: {
        _meta: {
          candidate_id: 'cand_request',
          phase: 'pilot',
          'io.modelcontextprotocol/related-task': {
            taskId: 'corr_related_task',
          },
        },
      },
    },
    {
      requestId: 'transport_1',
      requestInfo: {
        headers: {
          'x-request-id': 'req_header',
          'x-experiment-id': 'exp_header',
          'x-cohort': 'holdout',
        },
      },
      _meta: {
        baselineId: 'base_extra',
      },
    },
    {
      candidateId: 'cand_args',
      phase: 'candidate',
    },
  );

  assert.deepEqual(trace, {
    requestId: 'req_header',
    correlationId: 'corr_related_task',
    transportRequestId: 'transport_1',
    experimentId: 'exp_header',
    candidateId: 'cand_request',
    baselineId: 'base_extra',
    cohort: 'holdout',
    phase: 'pilot',
  });
});

test('buildHubTelemetryMetadata emits canonical governance and experiment fields', () => {
  const metadata = buildHubTelemetryMetadata({
    accountId: 'acct_1',
    trace: {
      requestId: 'req_1',
      correlationId: 'corr_1',
      transportRequestId: 'transport_1',
      experimentId: 'exp_1',
      candidateId: 'cand_1',
      baselineId: 'base_1',
      cohort: 'holdout',
      phase: 'pilot',
    },
    metadata: {
      tenantId: 'tenant_1',
      user_id: 'user_1',
      sessionId: 'session_1',
      policyId: 'policy.hub-route-authorization.v1',
      routeClassification: 'write',
      authzDecision: 'require_human_review',
      laneSlug: 'exp-06',
      boundHost: 'acme',
      entrypoint: 'hub_execute_proxy_tool',
      custom: 'keep-me',
    },
  });

  assert.equal(metadata.account_id, 'acct_1');
  assert.equal(metadata.accountId, 'acct_1');
  assert.equal(metadata.tenant_id, 'tenant_1');
  assert.equal(metadata.tenantId, 'tenant_1');
  assert.equal(metadata.user_id, 'user_1');
  assert.equal(metadata.userId, 'user_1');
  assert.equal(metadata.session_id, 'session_1');
  assert.equal(metadata.sessionId, 'session_1');
  assert.equal(metadata.correlation_id, 'corr_1');
  assert.equal(metadata.correlationId, 'corr_1');
  assert.equal(metadata.request_id, 'req_1');
  assert.equal(metadata.requestId, 'req_1');
  assert.equal(metadata.transport_request_id, 'transport_1');
  assert.equal(metadata.transportRequestId, 'transport_1');
  assert.equal(metadata.policy_id, 'policy.hub-route-authorization.v1');
  assert.equal(metadata.policyId, 'policy.hub-route-authorization.v1');
  assert.equal(metadata.route_classification, 'write');
  assert.equal(metadata.routeClassification, 'write');
  assert.equal(metadata.authz_decision, 'review');
  assert.equal(metadata.authzDecision, 'review');
  assert.equal(metadata.lane_slug, 'exp-06');
  assert.equal(metadata.laneSlug, 'exp-06');
  assert.equal(metadata.bound_host, 'acme');
  assert.equal(metadata.boundHost, 'acme');
  assert.equal(metadata.entrypoint, 'hub_execute_proxy_tool');
  assert.equal(metadata.experiment_id, 'exp_1');
  assert.equal(metadata.experimentId, 'exp_1');
  assert.equal(metadata.candidate_id, 'cand_1');
  assert.equal(metadata.candidateId, 'cand_1');
  assert.equal(metadata.baseline_id, 'base_1');
  assert.equal(metadata.baselineId, 'base_1');
  assert.equal(metadata.cohort, 'holdout');
  assert.equal(metadata.phase, 'pilot');
  assert.equal(metadata.custom, 'keep-me');
});

test('executeProxyRoute executes visible route and returns downstream payload', async () => {
  let callCount = 0;
  let capturedArgs: Record<string, unknown> | null = null;
  const route = {
    proxyToolName: 'server_a__alpha',
    serverName: 'server_a',
    downstreamToolName: 'alpha',
    call: async (args: Record<string, unknown>) => {
      callCount += 1;
      capturedArgs = args;
      return {
        content: [{ type: 'text', text: 'ok' }],
        structuredContent: { ok: true },
      };
    },
  };

  const result = await executeProxyRoute({
    env: { HUB_IDENTITY_MODE: 'compat' } as any,
    route,
    executionArgs: { foo: 'bar' },
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: null,
      userId: null,
      sessionId: null,
      authMode: 'fallback',
      allowedToolPrefixes: null,
      toolMode: 'read_only',
      serviceTier: null,
      entitlementSnapshot: null,
      identitySource: 'fallback',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal(callCount, 1);
  assert.deepEqual(capturedArgs, { foo: 'bar' });
  assert.equal((result as any).isError, undefined);
});

test('executeProxyRoute blocks calls outside session scope', async () => {
  let called = false;
  const route = {
    proxyToolName: 'server_b__gamma',
    serverName: 'server_b',
    downstreamToolName: 'gamma',
    call: async () => {
      called = true;
      return { ok: true };
    },
  };

  const result = await executeProxyRoute({
    env: {} as any,
    route,
    executionArgs: {},
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: 'tenant_acme',
      userId: null,
      sessionId: 'session_1',
      authMode: 'session',
      allowedToolPrefixes: [],
      toolMode: 'read_only',
      serviceTier: null,
      entitlementSnapshot: null,
      identitySource: 'session',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal(called, false);
  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /not enabled for this session/);
});

test('executeProxyRoute surfaces downstream failures as MCP errors', async () => {
  const route = {
    proxyToolName: 'server_a__alpha',
    serverName: 'server_a',
    downstreamToolName: 'alpha',
    call: async () => {
      throw new Error('downstream exploded');
    },
  };

  const result = await executeProxyRoute({
    env: { HUB_IDENTITY_MODE: 'compat' } as any,
    route,
    executionArgs: {},
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: null,
      userId: null,
      sessionId: null,
      authMode: 'fallback',
      allowedToolPrefixes: null,
      toolMode: 'read_only',
      serviceTier: null,
      entitlementSnapshot: null,
      identitySource: 'fallback',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /Tool "server_a__alpha" failed: downstream exploded/);
});

test('executeProxyRoute blocks mutable routes for read-only sessions before downstream execution', async () => {
  let called = false;
  const route = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_update',
    call: async () => {
      called = true;
      return { ok: true };
    },
  };

  const result = await executeProxyRoute({
    env: {} as any,
    route,
    executionArgs: { spreadsheetId: 'sheet_1' },
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: 'tenant_acme',
      userId: 'user_1',
      sessionId: 'session_1',
      authMode: 'session',
      allowedToolPrefixes: null,
      toolMode: 'read_only',
      serviceTier: null,
      entitlementSnapshot: null,
      identitySource: 'session',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal(called, false);
  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /read-only .* write-intent/i);
});

test('executeProxyRoute blocks mutable routes for compat fallback identities', async () => {
  let called = false;
  const route = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_update',
    call: async () => {
      called = true;
      return { ok: true };
    },
  };

  const result = await executeProxyRoute({
    env: { HUB_IDENTITY_MODE: 'compat' } as any,
    route,
    executionArgs: { spreadsheetId: 'sheet_1' },
    trace,
    accountContext: {
      accountId: 'acct_fallback',
      tenantId: null,
      userId: null,
      sessionId: null,
      authMode: 'fallback',
      allowedToolPrefixes: null,
      toolMode: 'read_only',
      serviceTier: null,
      entitlementSnapshot: null,
      identitySource: 'fallback',
    },
    accountId: 'acct_fallback',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal(called, false);
  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /read-only .* write-intent/i);
});

test('executeProxyRoute requires human review for destructive routes', async () => {
  let called = false;
  const route = {
    proxyToolName: 'composio-toolkit-zoom__zoom_delete_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_delete_a_meeting',
    call: async () => {
      called = true;
      return { ok: true };
    },
  };

  const result = await executeProxyRoute({
    env: {} as any,
    route,
    executionArgs: { meetingId: 12345678901 },
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: 'tenant_acme',
      userId: null,
      sessionId: 'session_1',
      authMode: 'session',
      allowedToolPrefixes: null,
      toolMode: 'read_write',
      serviceTier: null,
      entitlementSnapshot: null,
      identitySource: 'session',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal(called, false);
  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /require human review/i);
});

test('executeProxyRoute converts semantic downstream scope failures into actionable auth errors', async () => {
  const route = {
    proxyToolName: 'composio-toolkit-zoom__zoom_create_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_create_a_meeting',
    call: async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            data: {
              code: 4711,
              message:
                'Invalid access token, does not contain scopes:[meeting:write:meeting:admin, meeting:write:meeting].',
              success: false,
            },
            error: null,
            successful: true,
            logId: 'log_123',
          }),
        },
      ],
      structuredContent: {
        data: {
          code: 4711,
          message:
            'Invalid access token, does not contain scopes:[meeting:write:meeting:admin, meeting:write:meeting].',
          success: false,
        },
        error: null,
        successful: true,
        logId: 'log_123',
      },
    }),
  };

  const result = await executeProxyRoute({
    env: {} as any,
    route,
    executionArgs: { meetingId: 12345678901 },
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: 'tenant_acme',
      userId: 'user_1',
      sessionId: 'session_1',
      authMode: 'managed_bearer',
      allowedToolPrefixes: null,
      toolMode: 'read_write',
      serviceTier: 'policy_os_core',
      entitlementSnapshot: {
        service_tier: 'policy_os_core',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
      },
      identitySource: 'session',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /Missing OAuth scopes for toolkit "zoom"/);
  assert.match((result as any).content[0].text, /meeting:write:meeting:admin/);
  assert.match((result as any).content[0].text, /composio-toolkit-zoom__get_connect_link/);
});

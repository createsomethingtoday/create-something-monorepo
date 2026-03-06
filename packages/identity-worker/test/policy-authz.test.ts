import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAuthorizationRequest, type AuthorizationRequest } from '@create-something/mcp-authz';

function selfServiceRequest(): AuthorizationRequest {
  return {
    actor: {
      accountId: 'acct_1',
      tenantId: 'tenant_acme',
      userId: 'user_1',
      role: 'member',
      sessionId: 'sess_1',
      identitySource: 'session',
    },
    action: {
      name: 'mint_session',
      writeIntent: false,
      humanReviewStep: false,
      introspectionOk: true,
    },
    resource: {
      kind: 'mcp_session',
      id: 'acct_1',
      toolName: 'mcp_session_create',
      accessType: 'auth_admin',
    },
  };
}

test('self-service session mint policy allows authenticated callers', async () => {
  const result = await evaluateAuthorizationRequest(
    'policy.mcp-session-self-service.v1',
    selfServiceRequest(),
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' },
  );

  assert.equal(result.final.decision, 'allow');
  assert.equal(result.final.policyId, 'policy.mcp-session-self-service.v1');
});

test('partner admin mint blocks without consent evidence', async () => {
  const request: AuthorizationRequest = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'operator',
    },
    action: {
      name: 'admin_mint_session',
      writeIntent: true,
      humanReviewStep: true,
      introspectionOk: false,
    },
    resource: {
      kind: 'mcp_session',
      id: 'acct_1',
      toolName: 'mcp_session_admin_mint',
      accessType: 'auth_admin',
    },
  };

  const result = await evaluateAuthorizationRequest(
    'policy.partner-auth-governance.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' },
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /consent/i);
});

test('legacy key issuance requires review trace after exception approval', async () => {
  const request: AuthorizationRequest = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'operator',
    },
    action: {
      name: 'issue_legacy_key',
      writeIntent: true,
      humanReviewStep: false,
      introspectionOk: true,
    },
    resource: {
      kind: 'legacy_key',
      id: 'legacy_key_1',
      toolName: 'mcp_legacy_key_issue',
      accessType: 'auth_admin',
    },
  };

  const result = await evaluateAuthorizationRequest(
    'policy.mcp-credential-delivery.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' },
  );

  assert.equal(result.final.decision, 'require_human_review');
  assert.match(result.final.reason, /review trace/i);
});

test('legacy sunset policy allows issuance inside the approved window', async () => {
  const request: AuthorizationRequest = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'operator',
    },
    action: {
      name: 'issue_legacy_key',
      writeIntent: true,
      humanReviewStep: true,
      introspectionOk: true,
    },
    resource: {
      kind: 'legacy_key',
      id: 'legacy_key_1',
      toolName: 'mcp_legacy_key_issue',
      accessType: 'auth_admin',
    },
  };

  const result = await evaluateAuthorizationRequest(
    'policy.legacy-compat-sunset.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' },
  );

  assert.equal(result.final.decision, 'allow');
  assert.match(result.final.reason, /policy compliant/i);
});

test('shadow rollout preserves fallback auditability when Oso is unavailable', async () => {
  const result = await evaluateAuthorizationRequest(
    'policy.mcp-session-self-service.v1',
    selfServiceRequest(),
    { mode: 'shadow', canaryPercent: 100 },
    {
      mode: 'hybrid',
      fallbackEnabled: true,
      oso: {
        bootstrapPolicy: false,
      },
    },
  );

  assert.equal(result.final.decision, 'allow');
  assert.equal(result.final.rolloutMode, 'shadow');
  assert.equal(result.polar.evaluationPath, 'fallback');
  assert.match(result.polar.fallbackReason ?? '', /missing oso config/i);
});

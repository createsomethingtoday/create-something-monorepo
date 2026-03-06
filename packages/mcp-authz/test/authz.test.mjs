import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHubAuthorizationRequest,
  classifyHubRoute,
  evaluateAuthorizationRequest,
  getPolicyManifest,
  listPolicyManifests,
} from '../dist/index.js';

test('policy registry exposes repo-first manifests', () => {
  const manifests = listPolicyManifests();
  assert.ok(manifests.some((manifest) => manifest.policyId === 'policy.hub-route-authorization.v1'));
  const manifest = getPolicyManifest('policy.partner-auth-governance.v1');
  assert.equal(manifest.version, 1);
  assert.equal(typeof manifest.policyHash, 'string');
});

test('hub route classification distinguishes destructive proxy routes', () => {
  const classification = classifyHubRoute({
    proxyToolName: 'composio-toolkit-zoom__zoom_delete_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_delete_a_meeting',
  });

  assert.equal(classification.accessType, 'destructive');
  assert.equal(classification.oauthRequired, true);
  assert.ok(classification.tags.includes('oauth_required'));
});

test('hub route auth blocks mutation discovery for read-only sessions', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    sessionId: 'session_1',
    toolMode: 'read_only',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_update',
    actionName: 'discover',
  });

  const result = await evaluateAuthorizationRequest(
    'policy.hub-route-authorization.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' },
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /read-only sessions/i);
});

test('hub route auth requires human review for destructive execution', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-zoom__zoom_delete_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_delete_a_meeting',
    actionName: 'execute',
  });

  const result = await evaluateAuthorizationRequest(
    'policy.hub-route-authorization.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' },
  );

  assert.equal(result.final.decision, 'require_human_review');
  assert.match(result.final.reason, /human review/i);
});

test('identity admin mint policy allows consent-backed requests', async () => {
  const request = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'operator',
    },
    action: {
      name: 'admin_mint_session',
      writeIntent: true,
      humanReviewStep: true,
      introspectionOk: true,
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

  assert.equal(result.final.decision, 'allow');
});

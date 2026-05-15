import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHubAuthorizationRequest,
  classifyHubRoute,
  evaluateAuthorizationRequest,
  getPolicyManifest,
  listPolicyManifests
} from '../dist/index.js';

test('policy registry exposes repo-first manifests', () => {
  const manifests = listPolicyManifests();
  assert.ok(
    manifests.some((manifest) => manifest.policyId === 'policy.hub-route-authorization.v1')
  );
  assert.ok(
    manifests.some((manifest) => manifest.policyId === 'policy.service-tier-entitlement.v1')
  );
  const manifest = getPolicyManifest('policy.partner-auth-governance.v1');
  assert.equal(manifest.version, 1);
  assert.equal(typeof manifest.policyHash, 'string');
});

test('hub route classification distinguishes destructive proxy routes', () => {
  const classification = classifyHubRoute({
    proxyToolName: 'composio-toolkit-zoom__zoom_delete_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_delete_a_meeting'
  });

  assert.equal(classification.accessType, 'destructive');
  assert.equal(classification.oauthRequired, true);
  assert.ok(classification.tags.includes('oauth_required'));
});

test('hub route classification preserves registry policy_os_only tags', () => {
  const classification = classifyHubRoute({
    proxyToolName: 'create-something__house_policy_tool',
    serverName: 'create-something',
    downstreamToolName: 'house_policy_tool',
    serverTags: ['cs', 'policy_os_only']
  });

  assert.ok(classification.tags.includes('policy_os_only'));
  assert.ok(classification.tags.includes('cs'));
});

test('hub route classification treats reviewer assignment as write access', () => {
  const classification = classifyHubRoute({
    proxyToolName: 'webflow-template-review-mcp__template_review_assign_reviewer',
    serverName: 'webflow-template-review-mcp',
    downstreamToolName: 'template_review_assign_reviewer'
  });

  assert.equal(classification.accessType, 'write');
});

test('hub route classification treats reviewer unassignment as write access', () => {
  const classification = classifyHubRoute({
    proxyToolName: 'webflow-template-review-mcp__template_review_unassign_self',
    serverName: 'webflow-template-review-mcp',
    downstreamToolName: 'template_review_unassign_self'
  });

  assert.equal(classification.accessType, 'write');
});

test('hub route classification treats public capture session start as read access', () => {
  const classification = classifyHubRoute({
    proxyToolName: 'webflow-template-review-mcp__template_review_start_capture_session',
    serverName: 'webflow-template-review-mcp',
    downstreamToolName: 'template_review_start_capture_session'
  });

  assert.equal(classification.accessType, 'read');
});

test('hub route classification ignores control-plane words inside read descriptions', () => {
  const classification = classifyHubRoute(
    {
      proxyToolName: 'composio-toolkit-gmail__gmail_fetch_emails',
      serverName: 'composio-toolkit-gmail',
      downstreamToolName: 'gmail_fetch_emails'
    },
    {
      description:
        'Fetches Gmail messages. The messages field may be absent or empty (valid no-results state).'
    }
  );

  assert.equal(classification.accessType, 'read');
});

test('hub route classification ignores destructive words inside read descriptions', () => {
  const classification = classifyHubRoute(
    {
      proxyToolName: 'composio-toolkit-gmail__gmail_fetch_message_by_message_id',
      serverName: 'composio-toolkit-gmail',
      downstreamToolName: 'gmail_fetch_message_by_message_id'
    },
    {
      description:
        'Fetches a specific message by ID. Spam/trash messages are excluded unless requested upstream.'
    }
  );

  assert.equal(classification.accessType, 'read');
});

test('hub route classification uses invocation action for multiplexed read management calls', () => {
  const classification = classifyHubRoute(
    {
      proxyToolName: 'halfdozen-operator-notion-mcp__operator_notion_sync_contracts',
      serverName: 'halfdozen-operator-notion-mcp',
      downstreamToolName: 'operator_notion_sync_contracts'
    },
    { description: 'Manage Notion sync contracts.' },
    { invocationAction: 'list_contracts' }
  );

  assert.equal(classification.accessType, 'read');
});

test('hub route classification preserves write access for multiplexed mutation actions', () => {
  const classification = classifyHubRoute(
    {
      proxyToolName: 'halfdozen-operator-notion-mcp__operator_notion_sync_contracts',
      serverName: 'halfdozen-operator-notion-mcp',
      downstreamToolName: 'operator_notion_sync_contracts'
    },
    { description: 'Manage Notion sync contracts.' },
    { invocationAction: 'run_sync_contract' }
  );

  assert.equal(classification.accessType, 'write');
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
    actionName: 'discover'
  });

  const result = await evaluateAuthorizationRequest(
    'policy.hub-route-authorization.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
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
    actionName: 'execute'
  });

  const result = await evaluateAuthorizationRequest(
    'policy.hub-route-authorization.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'require_human_review');
  assert.match(result.final.reason, /human review/i);
});

test('hub route auth blocks unresolved protected route context', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: null,
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    introspectionOk: false,
    proxyToolName: 'composio-toolkit-zoom__zoom_create_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_create_a_meeting',
    actionName: 'execute'
  });

  const result = await evaluateAuthorizationRequest(
    'policy.hub-route-authorization.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /resolved actor and tenant context/i);
});

test('service-tier policy blocks paid write execution for mcp-only access', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_update',
    actionName: 'execute',
    context: {
      serviceTier: 'mcp_only',
      entitlementSnapshot: {
        service_tier: 'mcp_only',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /mcp-only access does not include paid governed write/i);
});

test('service-tier policy allows mcp-only read execution for multiplexed management reads', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'halfdozen-operator-notion-mcp__operator_notion_sync_contracts',
    serverName: 'halfdozen-operator-notion-mcp',
    downstreamToolName: 'operator_notion_sync_contracts',
    actionName: 'execute',
    invocationAction: 'list_contracts',
    context: {
      serviceTier: 'mcp_only',
      entitlementSnapshot: {
        service_tier: 'mcp_only',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'allow');
});

test('service-tier policy allows mcp-only gmail read execution despite read-description keywords', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-gmail__gmail_fetch_emails',
    serverName: 'composio-toolkit-gmail',
    downstreamToolName: 'gmail_fetch_emails',
    actionName: 'execute',
    definition: {
      description:
        'Fetches Gmail messages. The messages field may be absent or empty (valid no-results state).'
    },
    context: {
      serviceTier: 'mcp_only',
      entitlementSnapshot: {
        service_tier: 'mcp_only',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'allow');
});

test('service-tier policy blocks paid policy os access without billing', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-slack__slack_send_message',
    serverName: 'composio-toolkit-slack',
    downstreamToolName: 'slack_send_message',
    actionName: 'execute',
    context: {
      serviceTier: 'policy_os_trial',
      entitlementSnapshot: {
        service_tier: 'policy_os_trial',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: false,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /requires active billing/i);
});

test('service-tier policy blocks paid policy os access without contract', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-slack__slack_send_message',
    serverName: 'composio-toolkit-slack',
    downstreamToolName: 'slack_send_message',
    actionName: 'execute',
    context: {
      serviceTier: 'policy_os_trial',
      entitlementSnapshot: {
        service_tier: 'policy_os_trial',
        service_entitled: true,
        policy_accepted: true,
        contract_active: false,
        billing_active: true,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /requires an active contract/i);
});

test('service-tier policy blocks paid policy os access without policy acceptance', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-slack__slack_send_message',
    serverName: 'composio-toolkit-slack',
    downstreamToolName: 'slack_send_message',
    actionName: 'execute',
    context: {
      serviceTier: 'policy_os_core',
      entitlementSnapshot: {
        service_tier: 'policy_os_core',
        service_entitled: true,
        policy_accepted: false,
        contract_active: true,
        billing_active: true,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /requires required policy acceptance/i);
});

test('service-tier policy allows paid policy os execution when commercial gates pass', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'composio-toolkit-slack__slack_send_message',
    serverName: 'composio-toolkit-slack',
    downstreamToolName: 'slack_send_message',
    actionName: 'execute',
    context: {
      serviceTier: 'policy_os_core',
      entitlementSnapshot: {
        service_tier: 'policy_os_core',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'allow');
});

test('service-tier policy blocks policy-os-only discovery for mcp-only access', async () => {
  const request = buildHubAuthorizationRequest({
    accountId: 'acct_1',
    tenantId: 'tenant_1',
    sessionId: 'session_1',
    toolMode: 'read_write',
    identitySource: 'session',
    proxyToolName: 'create-something__house_policy_tool',
    serverName: 'create-something',
    downstreamToolName: 'house_policy_tool',
    serverTags: ['cs', 'policy_os_only'],
    actionName: 'discover',
    context: {
      serviceTier: 'mcp_only',
      entitlementSnapshot: {
        service_tier: 'mcp_only',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
        approved_exception: { present: false }
      }
    }
  });

  const result = await evaluateAuthorizationRequest(
    'policy.service-tier-entitlement.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /policy os-only product surfaces/i);
});

test('identity admin mint policy allows consent-backed requests', async () => {
  const request = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'operator'
    },
    action: {
      name: 'admin_mint_session',
      writeIntent: true,
      humanReviewStep: true,
      introspectionOk: true
    },
    resource: {
      kind: 'mcp_session',
      id: 'acct_1',
      toolName: 'mcp_session_admin_mint',
      accessType: 'auth_admin'
    }
  };

  const result = await evaluateAuthorizationRequest(
    'policy.partner-auth-governance.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'allow');
});

test('partner toolkit auth policy blocks account actions without consent evidence', async () => {
  const request = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'partner_admin',
      identitySource: 'partner_admin_key'
    },
    action: {
      name: 'create_toolkit_connect_link',
      writeIntent: true,
      humanReviewStep: false,
      introspectionOk: false
    },
    resource: {
      kind: 'partner_toolkit_account',
      id: 'client_1:airtable:primary',
      toolName: 'create_toolkit_connect_link',
      accessType: 'auth_admin',
      oauthRequired: true
    }
  };

  const result = await evaluateAuthorizationRequest(
    'policy.partner-auth-governance.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'block');
  assert.match(result.final.reason, /active consent/i);
});

test('partner toolkit auth policy requires review before disabling bindings', async () => {
  const request = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'partner_admin',
      identitySource: 'partner_admin_key'
    },
    action: {
      name: 'disable_toolkit_account',
      writeIntent: true,
      humanReviewStep: false,
      introspectionOk: true
    },
    resource: {
      kind: 'partner_toolkit_account',
      id: 'client_1:airtable:primary',
      toolName: 'disable_toolkit_account',
      accessType: 'destructive'
    }
  };

  const result = await evaluateAuthorizationRequest(
    'policy.partner-auth-governance.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'require_human_review');
  assert.match(result.final.reason, /human review/i);
});

test('partner toolkit auth policy allows reviewed pin operations with consent', async () => {
  const request = {
    actor: {
      accountId: 'acct_1',
      actorId: 'partner:operator',
      role: 'partner_admin',
      identitySource: 'partner_admin_key'
    },
    action: {
      name: 'pin_toolkit_account',
      writeIntent: true,
      humanReviewStep: true,
      introspectionOk: true
    },
    resource: {
      kind: 'partner_toolkit_account',
      id: 'client_1:airtable:primary',
      toolName: 'pin_toolkit_account',
      accessType: 'write'
    }
  };

  const result = await evaluateAuthorizationRequest(
    'policy.partner-auth-governance.v1',
    request,
    { mode: 'legacy_enforce', canaryPercent: 0 },
    { mode: 'legacy' }
  );

  assert.equal(result.final.decision, 'allow');
  assert.match(result.final.reason, /after human review/i);
});

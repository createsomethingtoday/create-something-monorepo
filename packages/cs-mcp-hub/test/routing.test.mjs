import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterDirectRoutesByTenant,
  planAliasRoutes,
  resolveTenantRoutingContext,
} from '../dist/routing.js';

test('tenant policy filters direct tools by server/tag/prefix', () => {
  const directRoutes = [
    {
      route: {
        proxyToolName: 'composio_toolkit_gmail__send',
        serverName: 'composio-toolkit-gmail',
        downstreamToolName: 'send',
        description: 'send email',
        inputSchema: { type: 'object', properties: {} },
      },
      serverTags: ['composio', 'email'],
    },
    {
      route: {
        proxyToolName: 'arcade_gmail__send',
        serverName: 'arcade-gmail',
        downstreamToolName: 'send',
        description: 'send email',
        inputSchema: { type: 'object', properties: {} },
      },
      serverTags: ['arcade', 'email'],
    },
  ];

  const filtered = filterDirectRoutesByTenant(directRoutes, {
    allowTags: ['email'],
    denyServers: ['composio-toolkit-gmail'],
    allowToolPrefixes: ['arcade_'],
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].serverName, 'arcade-gmail');
  assert.equal(filtered[0].proxyToolName, 'arcade_gmail__send');
});

test('explicit unknown tenant fails closed instead of inheriting the default policy', () => {
  const routing = {
    version: 1,
    defaults: {
      tenant: 'default',
    },
    tenants: {
      default: {},
      blondish: {
        allowServers: ['notion-halfdozen-blondish'],
      },
    },
  };

  assert.throws(
    () => resolveTenantRoutingContext(routing, 'blondis'),
    /Unknown tenant "blondis"/,
  );
});

test('alias planner prefers approved routes and skips pending/blocked approvals', () => {
  const routing = {
    version: 1,
    defaults: {
      tenant: 'acme',
      allowPendingOauthApprovals: false,
    },
    tenants: {
      acme: {},
    },
    aliases: {
      gmail_send: {
        description: 'Send email with provider fallback',
        candidates: [
          { server: 'arcade-gmail', tool: 'send_message', provider: 'arcade', oauthApproval: 'pending' },
          { server: 'composio-toolkit-gmail', tool: 'send_message', provider: 'composio', oauthApproval: 'approved' },
          { server: 'legacy-gmail', tool: 'send_message', provider: 'custom', oauthApproval: 'blocked' },
        ],
      },
    },
  };

  const tenant = resolveTenantRoutingContext(routing, undefined, false);
  const directRoutes = [
    {
      proxyToolName: 'composio_toolkit_gmail__send_message',
      serverName: 'composio-toolkit-gmail',
      downstreamToolName: 'send_message',
      description: 'send',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      proxyToolName: 'arcade_gmail__send_message',
      serverName: 'arcade-gmail',
      downstreamToolName: 'send_message',
      description: 'send',
      inputSchema: { type: 'object', properties: {} },
    },
  ];

  const { plans, warnings } = planAliasRoutes(routing, directRoutes, tenant);
  assert.equal(warnings.length, 0);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].aliasToolName, 'gmail_send');
  assert.equal(plans[0].candidates.length, 1);
  assert.equal(plans[0].candidates[0].serverName, 'composio-toolkit-gmail');
  assert.equal(plans[0].skippedCandidates.length, 2);
  assert.ok(plans[0].skippedCandidates.some((candidate) => candidate.reason === 'oauth_pending'));
  assert.ok(plans[0].skippedCandidates.some((candidate) => candidate.reason === 'oauth_blocked'));
});

test('alias planner supports pending approvals when explicitly enabled', () => {
  const routing = {
    version: 1,
    aliases: {
      gmail_send: {
        candidates: [{ server: 'arcade-gmail', tool: 'send_message', oauthApproval: 'pending' }],
      },
    },
  };

  const tenant = resolveTenantRoutingContext(routing, 'default', true);
  const directRoutes = [
    {
      proxyToolName: 'arcade_gmail__send_message',
      serverName: 'arcade-gmail',
      downstreamToolName: 'send_message',
      description: 'send',
      inputSchema: { type: 'object', properties: {} },
    },
  ];

  const { plans } = planAliasRoutes(routing, directRoutes, tenant);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].candidates.length, 1);
  assert.equal(plans[0].candidates[0].serverName, 'arcade-gmail');
});

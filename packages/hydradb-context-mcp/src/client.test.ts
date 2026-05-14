import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRecallPayload, resolveHydraConfig, resolveSubTenantId } from './client.js';

test('resolveHydraConfig defaults allowed sub-tenant to configured default', () => {
  const config = resolveHydraConfig({
    HYDRA_DB_API_KEY: 'secret',
    HYDRA_DB_TENANT_ID: 'create_something',
    HYDRA_DB_SUB_TENANT_ID: 'cs-internal-context'
  });

  assert.equal(config.defaultSubTenantId, 'cs-internal-context');
  assert.deepEqual(config.allowedSubTenantIds, ['cs-internal-context']);
});

test('resolveSubTenantId rejects non-allowlisted sub-tenants', () => {
  const config = resolveHydraConfig({
    HYDRA_DB_API_KEY: 'secret',
    HYDRA_DB_TENANT_ID: 'create_something',
    HYDRA_DB_SUB_TENANT_ID: 'cs-internal-context',
    HYDRA_DB_ALLOWED_SUB_TENANT_IDS: 'cs-internal-context,cs-linear-evidence'
  });

  assert.equal(resolveSubTenantId(config, 'cs-linear-evidence'), 'cs-linear-evidence');
  assert.throws(() => resolveSubTenantId(config, 'client-acme-context'), /not allowed/);
});

test('buildRecallPayload emits only recall parameters', () => {
  const config = resolveHydraConfig({
    HYDRA_DB_API_KEY: 'secret',
    HYDRA_DB_TENANT_ID: 'create_something',
    HYDRA_DB_SUB_TENANT_ID: 'cs-internal-context'
  });

  assert.deepEqual(
    buildRecallPayload(config, {
      graphContext: false,
      maxResults: 3,
      mode: 'fast',
      query: 'bearer token rotation'
    }),
    {
      tenant_id: 'create_something',
      sub_tenant_id: 'cs-internal-context',
      query: 'bearer token rotation',
      max_results: 3,
      mode: 'fast',
      alpha: 0.8,
      recency_bias: 0,
      graph_context: false
    }
  );
});

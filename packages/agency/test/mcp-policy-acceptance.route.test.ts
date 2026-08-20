import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENCY_ACCESS_POLICY_REFERENCE,
  createMcpPolicyAcceptancePostHandler
} from '../src/lib/server/mcp-policy-acceptance-core.ts';
import { recordAgencyMcpPolicyAcceptance } from '../src/lib/server/mcp-entitlements.ts';
import type { AgencyMcpEntitlementRow } from '../src/lib/server/mcp-entitlements.ts';

function createEntitlementRow(overrides: Partial<AgencyMcpEntitlementRow> = {}): AgencyMcpEntitlementRow {
  return {
    auth_subject: 'usr_micah', auth_email: 'micah@createsomething.io', account_id: 'acct_mj', tenant_id: 'tenant_createsomething_io', workspace_account_id: 'acct_mj',
    service_tier: 'policy_os_trial', managed_bearer_allowed: 0, org_membership_active: 1, service_entitled: 0, policy_accepted: 0, contract_active: 0, billing_active: 0,
    denial_reason: 'policy_acceptance_required', metadata_json: '{}', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides
  };
}

test('accepting the access policy records consent without changing commercial or credential gates', async () => {
  let recorded: Record<string, unknown> | null = null;
  const handler = createMcpPolicyAcceptancePostHandler({
    ensureAgencyMcpEntitlement: async () => ({
      row: createEntitlementRow({
        auth_subject: 'usr_micah',
        service_tier: 'policy_os_trial',
        managed_bearer_allowed: 0,
        org_membership_active: 1,
        service_entitled: 0,
        policy_accepted: 0,
        contract_active: 0,
        billing_active: 0
      })
    }),
    recordAgencyMcpPolicyAcceptance: async (_db, input) => {
      recorded = input;
      return createEntitlementRow({ policy_accepted: 1 });
    },
    requireAgencySessionUser: async () => ({
      id: 'usr_micah',
      email: 'micah@createsomething.io',
      source: 'identity'
    }),
    now: () => new Date('2026-08-13T15:00:00.000Z')
  });

  const response = await handler({
    cookies: {},
    platform: { env: { DB: {} } }
  } as never);

  assert.equal(response.status, 200);
  assert.deepEqual(recorded, {
    authSubject: 'usr_micah',
    metadata: {
      policy_accepted_at: '2026-08-13T15:00:00.000Z',
      policy_accepted_via: 'agency_dashboard',
      policy_reference: AGENCY_ACCESS_POLICY_REFERENCE
    }
  });
  assert.deepEqual(await response.json(), {
    success: true,
    message:
      'Access policy accepted. Existing commercial, membership, and credential state is unchanged.',
    entitlement: { auth_subject: 'usr_micah', policy_accepted: 1 }
  });
});

test('policy acceptance storage mutates only policy_accepted and acceptance metadata', async () => {
  const state = {
    auth_subject: 'usr_micah',
    auth_email: 'micah@createsomething.io',
    account_id: 'acct_mj',
    tenant_id: 'tenant_createsomething_io',
    workspace_account_id: 'acct_mj',
    service_tier: 'policy_os_trial',
    managed_bearer_allowed: 0,
    org_membership_active: 1,
    service_entitled: 0,
    policy_accepted: 0,
    contract_active: 0,
    billing_active: 0,
    denial_reason: 'policy_acceptance_required' as string | null,
    metadata_json: JSON.stringify({ existing: 'preserved' }),
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z'
  };
  let updateSql = '';
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              return { ...state };
            },
            async run() {
              updateSql = sql;
              state.policy_accepted = values[0] as number;
              state.metadata_json = values[1] as string;
              state.denial_reason = values[2] as string | null;
              return {};
            }
          };
        }
      };
    }
  };

  const updated = await recordAgencyMcpPolicyAcceptance(db as never, {
    authSubject: 'usr_micah',
    metadata: { policy_accepted_via: 'agency_dashboard' }
  });

  assert.equal(updated?.policy_accepted, 1);
  assert.deepEqual(
    {
      account_id: state.account_id,
      tenant_id: state.tenant_id,
      service_tier: state.service_tier,
      managed_bearer_allowed: state.managed_bearer_allowed,
      org_membership_active: state.org_membership_active,
      service_entitled: state.service_entitled,
      contract_active: state.contract_active,
      billing_active: state.billing_active
    },
    {
      account_id: 'acct_mj',
      tenant_id: 'tenant_createsomething_io',
      service_tier: 'policy_os_trial',
      managed_bearer_allowed: 0,
      org_membership_active: 1,
      service_entitled: 0,
      contract_active: 0,
      billing_active: 0
    }
  );
  assert.equal(state.denial_reason, 'service_not_entitled');
  assert.match(updateSql, /SET policy_accepted = \?,\s*metadata_json = \?,\s*denial_reason = \?/);
  assert.doesNotMatch(
    updateSql,
    /managed_bearer_allowed|contract_active|billing_active|service_entitled/
  );
  assert.deepEqual(JSON.parse(state.metadata_json), {
    existing: 'preserved',
    manual_override: false,
    policy_accepted_via: 'agency_dashboard'
  });
});

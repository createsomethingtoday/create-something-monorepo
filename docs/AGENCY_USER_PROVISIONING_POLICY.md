# Agency User Provisioning Policy

## Goal

Seed `.agency` users before invite, then bind them to their Auth0 subject on first successful login.

## Policy

1. Canonical identity is `{ auth_subject, auth_email, account_id, tenant_id }`.
2. Before first login, the durable seed key is normalized email, not a derived account ID.
3. `account_id` and `tenant_id` must come from an explicit seed manifest.
4. Email may discover a seed row. Auth0 `sub` becomes the permanent identity anchor after first login.
5. Policy acceptance is not part of seeding. Seed rows should default `policy_accepted = 0` unless the user already accepted under a valid commercial process.
6. Internal aliases or exceptions, such as `micah@createsomething.io -> acct_mj`, must live in one canonical resolver and not be reimplemented route-by-route.
7. Self-provisioning is acceptable only for controlled internal/testing lanes. Client-facing access should be seeded first.

## Seed Manifest

Required columns:

- `auth_email`
- `account_id`
- `tenant_id`

Optional columns:

- `workspace_account_id`
- `service_tier`
- `managed_bearer_allowed`
- `org_membership_active`
- `service_entitled`
- `policy_accepted`
- `contract_active`
- `billing_active`
- `status`
- `invited_at`
- `metadata_json`

Recommended defaults:

- `service_tier=agency`
- `managed_bearer_allowed=1`
- `org_membership_active=1`
- `service_entitled=1`
- `policy_accepted=0`
- `contract_active=1`
- `billing_active=1`
- `status=seeded`

## First Login Binding

When a seeded user logs in:

1. `.agency` looks up `agency_identity_seeds.normalized_email`.
2. It materializes or updates `agency_mcp_entitlements` for the actual Auth0 `sub`.
3. It marks the seed row as `bound` and records `bound_at`.
4. Subsequent checks use the bound entitlement row keyed by `auth_subject`.

## Seed Script

Generate SQL from a CSV seed file:

```bash
pnpm exec tsx packages/agency/scripts/prepare-agency-identity-seed.ts docs/examples/agency-user-seed.csv > /tmp/agency_identity_seeds.sql
```

Apply it to the `.agency` D1 database with your normal Wrangler workflow.

## Example

See [agency-user-seed.csv](/Volumes/LaCie/Create%20Something/create-something-monorepo/docs/examples/agency-user-seed.csv).

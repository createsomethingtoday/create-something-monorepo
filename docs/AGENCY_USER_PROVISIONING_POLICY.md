# Agency User Provisioning Policy

## Goal

Seed `.agency` users before invite, then bind them to their CREATE SOMETHING Identity subject as soon as that subject is known.

## Policy

1. Canonical identity is `{ auth_subject, auth_email, account_id, tenant_id }`.
2. Before first login, the durable seed key is normalized email, not a derived account ID.
3. `account_id` and `tenant_id` must come from an explicit seed manifest.
4. Email may discover a seed row. The Identity token `sub` becomes the permanent identity anchor as soon as it is known, whether by first login reconciliation or direct operator binding.
5. When the canonical Identity subject is already known, operators SHOULD bind it immediately instead of waiting for another login event.
6. Policy acceptance is not part of seeding. Seed rows should default `policy_accepted = 0` unless the user already accepted under a valid commercial process.
7. Existing compat bearer tokens MAY be migrated into the managed-token registry without rotating the plaintext secret, provided the user has a canonical Identity subject, a canonical `.agency` account/tenant mapping, and a single active entitlement row.
8. After subject binding or token migration, stale legacy entitlement rows and stale legacy token rows MUST be removed so one email resolves to one canonical subject.
9. Internal aliases or exceptions, such as `micah@createsomething.io -> acct_mj`, must live in one canonical resolver and not be reimplemented route-by-route.
10. Self-provisioning is acceptable only for controlled internal/testing lanes and preprovisioned prospect-claim flows. Client-facing production access should be seeded first.
11. A preprovisioned prospect MAY be claimed by a signed-in `.agency` user only when that claim binds into the canonical seed and entitlement model for the preassigned account/tenant mapping. Prospect claim MUST NOT itself mint customer credentials or bypass graduation controls.
12. Prospect self-service discovery and claim MUST only present workspaces in `initialized` or `active` prospect status as immediately claimable. Paused, sunset, or disabled prospect records require operator action before claim can continue.
13. If Identity subject churn occurs after an account recreation or migration for the same normalized email, remediation MUST follow [`policy.identity-subject-rebind-governance.v1`](./policies/v1/policy.identity-subject-rebind-governance.v1.md) and the linked operator runbook instead of treating the user as a new MCP account.
14. White-glove onboarding MAY deliver an already-governed customer credential before first portal login, but only after the canonical Identity subject, account mapping, entitlement state, and any credential-specific prerequisites are in place.
15. White-glove onboarding MUST NOT rely on runtime worker guardrail tokens, bootstrap secrets, or other operator-only credentials as customer-facing artifacts.
16. After white-glove initial delivery, `.agency` remains the canonical follow-on surface for revoke, regenerate, password rotation, and ongoing credential visibility unless an approved dedicated client shell replaces that surface.

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

When a seeded user logs in and no subject has been bound yet:

1. `.agency` looks up `agency_identity_seeds.normalized_email`.
2. It materializes or updates `agency_mcp_entitlements` for the actual Identity `sub`.
3. It marks the seed row as `bound` and records `bound_at`.
4. Subsequent checks use the bound entitlement row keyed by `auth_subject`.

## Known Subject Binding

When the Identity subject is already known before or after first login:

1. Operators SHOULD write `auth_subject` directly onto the seed row.
2. `.agency` entitlement rows SHOULD be reconciled to that subject immediately.
3. Any older entitlement rows for the same email but a different subject SHOULD be deactivated or removed.
4. The bound subject becomes the only valid source for downstream token issuance and dashboard resolution.
5. Once this canonical binding exists, operator-assisted white-glove credential delivery MAY proceed if the selected credential type is otherwise allowed.

## Compat Token Migration

For existing bearer holders already represented in Infisical or another approved vault:

1. Confirm the user has one canonical `{ auth_subject, auth_email, account_id, tenant_id }` mapping.
2. Confirm `.agency` entitlement state for that subject is active and not duplicated under another subject.
3. Insert or reconcile the existing plaintext bearer value into `identity-db.mcp_long_lived_tokens`.
4. Treat `identity-db.mcp_long_lived_tokens` as the source of truth for token state after migration.
5. Keep the same plaintext value in the runtime vault only when necessary for backward compatibility.
6. Remove stale pre-Identity or legacy-subject token rows and entitlement rows after verification.

This migration path avoids unnecessary token rotation while bringing visibility and governance into the managed-token model.

## Subject Rebind Incident

When a previously mapped user returns with the same normalized email but a different Identity subject:

1. Preserve the canonical `.agency` account context instead of inventing a new MCP account.
2. Rebind the new subject to the preserved mapping.
3. Revoke or deactivate old subject-bound managed bearer artifacts.
4. Update stale delegated partner mappings before partner-admin issuance continues.
5. Follow [`IDENTITY_SUBJECT_REBIND_RUNBOOK`](./IDENTITY_SUBJECT_REBIND_RUNBOOK.md) for operator steps and evidence capture.

## Seed Script

Generate SQL from a CSV seed file:

```bash
pnpm exec tsx packages/agency/scripts/prepare-agency-identity-seed.ts docs/examples/agency-user-seed.csv > /tmp/agency_identity_seeds.sql
```

Apply it to the `.agency` D1 database with your normal Wrangler workflow.

## Example

See [agency-user-seed.csv](/Volumes/LaCie/Create%20Something/create-something-monorepo/docs/examples/agency-user-seed.csv).

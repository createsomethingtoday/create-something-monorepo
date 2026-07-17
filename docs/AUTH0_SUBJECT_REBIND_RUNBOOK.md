# Auth0 Subject Rebind Runbook

> Retired historical migration artifact. Use
> [`IDENTITY_SUBJECT_REBIND_RUNBOOK`](./IDENTITY_SUBJECT_REBIND_RUNBOOK.md) for
> current CREATE SOMETHING Identity incidents.

Use this runbook when an Auth0 user is deleted or recreated and later returns with the same email but a different Auth0 `sub`.

This runbook implements [policy.auth0-subject-rebind-governance.v1](./policies/v1/policy.auth0-subject-rebind-governance.v1.md).

## When To Use This

Open a subject-rebind incident when any of the following occurs:

- a support case reports login succeeded after Auth0 recreation but MCP access is missing or split
- a duplicate-subject pattern is found for one normalized email
- self-service bearer issuance or regeneration behaves as if the user is new after Auth0 re-login
- partner admin review shows a stale `identity_user_id`

## Boundaries

- This runbook is for same-email subject churn only.
- Do not use it when normalized email differs.
- Do not use it when account or tenant mapping is ambiguous.
- Do not disconnect Composio-linked provider accounts unless the business relationship or consent state independently requires revocation.
- Do not treat the `identity-worker` OAuth password as the Auth0 credential.
- This v1 uses existing admin/operator surfaces only. It does not rely on new endpoints, schema changes, or webhook automation.

## Preconditions

Before any mutation:

1. Confirm operator authorization.
2. Capture the old subject and new subject.
3. Confirm the normalized email matches across the incident record and current session user.
4. Confirm the intended `account_id` and `tenant_id`.
5. Open or link an operator incident record so evidence can be attached.

If email does not match, or if the intended account mapping is unclear, stop and escalate to manual identity review outside this runbook.

## Exact Remediation Sequence

### 1. Inspect Current State

Inspect the email and both subjects across the existing governance surfaces.

- Check `.agency` identity seeds:
  - `GET /api/admin/identity-seeds?search=<normalized_email>`
- Check `.agency` MCP entitlements:
  - `GET /api/admin/mcp-entitlements?search=<normalized_email>`
  - `GET /api/admin/mcp-entitlements?search=<old_subject>`
  - `GET /api/admin/mcp-entitlements?search=<new_subject>`
- Check partner client mappings:
  - partner admin/security surfaces or the partner client record keyed by slug
- Check managed bearer state in `identity-worker`:
  - `POST /v1/mcp/long-lived-tokens/admin-get` with `auth_subject=<old_subject>`
  - `POST /v1/mcp/long-lived-tokens/admin-get` with `auth_subject=<new_subject>`
- Check contract/commercial context through the existing `.agency` admin views if the account is commercially governed.

Record:

- normalized email
- old subject
- new subject
- canonical `account_id`
- canonical `tenant_id`
- partner slug, if any
- whether an old managed bearer token exists

### 2. Revoke Old Subject-Bound Credentials

If an old managed bearer token exists:

1. Capture the token metadata from `POST /v1/mcp/long-lived-tokens/admin-get`.
2. Revoke it with `POST /v1/mcp/long-lived-tokens/:id/revoke`.
3. Record the revoke response in the incident evidence.

If no old managed bearer token exists:

- record `no_old_managed_bearer_token=true` and continue

If a stale legacy alias is explicitly known from prior delivery records:

- revoke or disable it using the existing legacy revocation path
- if no explicit legacy artifact is known, record `no_known_legacy_alias_found` and continue

### 3. Rebind The New Subject To The Canonical MCP Account

Use the existing admin identity and entitlement surfaces to make the new subject canonical.

Preferred order:

1. If an identity seed exists for the normalized email, update it so `auth_subject=<new_subject>` using `POST /api/admin/identity-seeds`.
2. Ensure the entitlement row for the new subject carries the canonical `account_id`, `tenant_id`, and `workspace_account_id`.
3. If needed, use `POST /api/admin/mcp-entitlements` to patch the new-subject row so its account context and allow/deny state match the intended canonical record.

The target outcome is:

- the new subject is the only active subject resolving for the canonical email/account
- stale old-subject entitlement rows are deactivated, superseded, or removed from operational use

### 4. Update Partner Mappings

If the user has a partner-linked client record:

1. Update the partner client using `POST /api/partners/half-dozen/clients/:slug/init`.
2. Preserve:
   - `identity_account_id`
   - `identity_tenant_id`
   - `workspace_account_id`
   - `owner_email`
3. Change only `identity_user_id` to the new subject unless a separate business correction is required.

If no partner mapping exists:

- record `partner_mapping_absent=true` and continue

### 5. Leave Provider Accounts Intact

Do not rotate, disconnect, or recreate:

- `composio_user_id`
- toolkit account rows
- notion account rows
- active provider connected accounts

Only change these if there is a separate consent, compromise, or client-lifecycle reason outside this subject-rebind incident.

### 6. Verify New Subject Resolution

Verify the new subject is now the operative identity.

- Confirm `.agency` dashboard resolution shows the expected account context.
- Confirm self-service bearer issuance or regeneration succeeds under the new subject.
- If partner mapping exists, confirm partner-admin issuance now uses the new subject.
- If MCP OAuth host onboarding is active, confirm the user can still manage the OAuth password separately through `.agency` MCP Access.

### 7. Verify Old Subject Is No Longer Operational

Before closing the incident:

- re-run `POST /v1/mcp/long-lived-tokens/admin-get` for the old subject and confirm there is no active token
- verify the old token, if one existed, no longer resolves successfully
- verify stale old-subject entitlement rows no longer act as the active operational identity

### 8. Record And Close

Attach the following evidence to the incident:

- old subject and new subject
- normalized email match confirmation
- canonical `account_id` and `tenant_id`
- token revoke response or no-token proof
- updated seed or entitlement record
- updated partner mapping, if applicable
- verification that only the new subject remains operational

Then close the incident as `subject_rebind_completed`.

## Branch Handling

### Email Mismatch

- Stop immediately.
- Do not auto-rebind.
- Escalate to manual identity review.

### Multiple Conflicting Entitlement Rows

- Stop automated cleanup.
- Decide the canonical account mapping manually.
- After a canonical mapping is chosen, resume this runbook from step 3.

### No Prior Managed Bearer Token

- Skip revoke.
- Still complete rebind and verification.

### No Partner Mapping

- Skip partner update.
- Still complete self-service verification.

### OAuth Password Credential Is In Active Use

- Treat the OAuth password as a separate credential.
- Do not reuse or infer it from Auth0.
- If reset is needed, route the user through the existing `.agency` `MCP Access > MCP OAuth Password` control.

## Verification Scenarios

Use these scenarios for incident-quality review:

1. Same email, new Auth0 subject, existing self-service managed bearer token.
2. Same email, new Auth0 subject, partner-linked delegated MCP access.
3. Same email with duplicate entitlement rows across two subjects.
4. Different email after Auth0 deletion or recreation.
5. Same email with no prior managed bearer token.
6. Same email where MCP OAuth host onboarding is active and password handling must remain separate.

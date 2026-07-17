# CREATE SOMETHING Identity Subject Rebind Runbook

Use this runbook when a user returns with the same normalized email but a
different CREATE SOMETHING Identity token subject. It implements
[`policy.identity-subject-rebind-governance.v1`](./policies/v1/policy.identity-subject-rebind-governance.v1.md).

## Preconditions

Before any mutation:

1. Confirm operator authorization and open an incident record.
2. Capture the old subject, new subject, and normalized email.
3. Confirm the intended `account_id` and `tenant_id` are unambiguous.
4. Stop if email or account mapping does not match.

## Remediation Sequence

1. Inspect identity seeds, MCP entitlements, partner mappings, and managed bearer state for both subjects.
2. Revoke any managed bearer token bound to the old subject; record explicit absence if none exists.
3. Bind the new subject to the canonical seed and entitlement account context.
4. Deactivate, supersede, or remove operational old-subject entitlement and token rows.
5. Update partner `identity_user_id` mappings while preserving account, tenant, workspace, provider-account, and consent state.
6. Leave provider-connected accounts intact unless a separate consent, lifecycle, or compromise decision requires revocation.
7. Verify the new subject resolves to the expected `.agency` account and can use the independently entitled credential flows.
8. Verify the old subject has no active token and no operational entitlement resolution.

## Credential Boundary

The Identity portal password and session token, managed bearer token, OAuth host
password, and runtime guardrail credentials are separate artifacts. Never infer,
copy, or reuse one as another during rebind.

## Required Closeout Evidence

- old and new subjects
- normalized email match
- canonical account and tenant mapping
- token revoke response or no-token proof
- updated seed, entitlement, and partner records as applicable
- successful new-subject resolution
- denied old-subject resolution

Close the incident only after all applicable evidence is attached.

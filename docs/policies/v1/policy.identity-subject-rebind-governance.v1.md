# policy.identity-subject-rebind-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING identity + support + partner operations`
- Effective date: `TBD`

## Purpose

Define the fail-closed governance path when a CREATE SOMETHING Identity account
returns with the same normalized email but a different token subject.

## Scope

- `.agency` managed bearer and MCP OAuth access
- Partner and Half Dozen client mappings that persist `identity_user_id`
- Subject-bound entitlements, tokens, and legacy aliases
- Operator evidence and closeout for manual remediation

## Policy Statements

1. A subject change with the same normalized email MUST be treated as a subject-rebind incident, not an MCP account reset.
2. Rebind is permitted only when normalized email matches and the intended `.agency` account mapping is unambiguous.
3. Rebind MUST preserve `account_id`, `tenant_id`, `workspace_account_id`, provider-connected account bindings, and active partner consent records.
4. Provider-linked toolkit or Notion accounts MUST remain connected unless consent, client lifecycle, or security posture independently requires revocation.
5. The old subject MUST cease to resolve as an active managed bearer or entitlement holder before closeout.
6. Managed bearer tokens bound to the old subject MUST be revoked or rendered inoperative.
7. Duplicate entitlement and token rows MUST be removed, deactivated, or superseded so one canonical subject remains operational.
8. Stale `partner_auth_clients.identity_user_id` values MUST be updated before delegated partner issuance is considered complete.
9. Legacy aliases MAY remain as audit history but MUST NOT continue to resolve as valid client identity.
10. Email mismatch or ambiguous account mapping MUST fail closed and require manual identity review.
11. The Identity portal session, managed bearer token, and MCP OAuth host password are separate credentials and MUST NOT be conflated.
12. A successful incident MUST prove the new subject resolves to the preserved account context and the old subject no longer resolves.
13. Evidence MUST record the old and new subjects, normalized email match, preserved account mapping, token revoke or absence proof, updated entitlement and partner state, and final resolution checks.

## Enforcement Surfaces

- `.agency` identity seeds, MCP entitlements, partner mappings, token controls, and MCP OAuth password controls
- `identity-worker` managed bearer administration, resolution, and OAuth user information

## Implementation Boundaries

- No public bypass endpoints
- No automatic subject reconciliation without the same fail-closed evidence
- No reuse of portal passwords, session tokens, runtime guardrail tokens, or managed bearer tokens across credential boundaries

## Evidence

- Operator incident reference
- Old and new subject values
- Normalized email match
- Preserved account and tenant mapping
- Managed bearer revoke response or explicit absence proof
- Updated seed, entitlement, and partner mapping records as applicable
- Successful new-subject resolution and denied old-subject resolution

## Source Anchors

- `packages/agency/src/lib/server/mcp-token.ts`
- `packages/agency/src/lib/server/mcp-entitlements.ts`
- `packages/agency/src/routes/api/admin/identity-seeds/+server.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `packages/identity-worker/src/index.ts`
- `docs/AGENCY_USER_PROVISIONING_POLICY.md`
- `docs/IDENTITY_SUBJECT_REBIND_RUNBOOK.md`
- `docs/policies/v1/policy.user-bearer-token-governance.v1.md`

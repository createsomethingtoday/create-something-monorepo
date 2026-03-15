# Reviewer Hub Implementation Checklist

**Status:** Working draft  
**Audience:** Senior Systems Architect, Hub operators  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-03-11`

## 1. Purpose

This checklist turns the app-review rollout policy into concrete Hub implementation work for the first two reviewer-specific Hubs.

Use it after the rollout spec and before enabling reviewer writes.

## 2. Current Hub-side facts to account for

As of `2026-03-11`, the target posture is:

- `webflow-app-review-mcp` is deployed as a Worker MCP
- the app-review worker still uses a shared bearer token at the MCP boundary
- reviewer-specific attribution must therefore come from the outer Hub/session layer or a downstream reviewer mapping addition
- reviewer writes are not yet safe to expose broadly

That means the immediate rollout target is a read-only evidence lane until identity, tracing, and authz enforcement are proven in runtime behavior.

## 3. Build the two reviewer-specific Hubs

Create one reviewer-scoped Hub surface per reviewer:

- `wf-app-review-pablo`
- `wf-app-review-shea`

For each Hub:

- bind reviewer identity through the Hub login/session path
- do not rely on a shared reviewer prompt convention for identity
- keep the Hub on broker-first routing
- keep reviewer access separate from operator/admin control-plane access

## 4. Enforce session-resolved identity

Confirm the Hub runs with session-resolved identity rather than a shared generic runtime posture.

Required behavior:

- reviewer requests resolve `account_id`
- reviewer requests resolve `tenant_id`
- reviewer requests resolve `user_id`
- reviewer requests resolve `session_id`
- reviewer requests carry reviewer-scoped `allowed_tool_prefixes`

Do not enable reviewer writes if the Hub is still operating as a generic shared runtime with no resolved actor context.

## 5. Narrow discovery per reviewer Hub

For each reviewer Hub:

1. restrict active discovery to the minimum required app-review server
2. keep discovery compact by default
3. cap visible proxy tools aggressively
4. persist account-scoped discovery preferences

Recommended review-lane active servers:

- `webflow-app-review-mcp`

Recommended reviewer discovery policy:

- `mode`: `compact`
- `activeServers`: `["webflow-app-review-mcp"]`
- `maxProxyTools`: `6`

## 6. Hide all mutable routes during Phase A

Remove these tools from reviewer-facing discovery during alpha:

- `webflow-app-review-mcp__app_review_assign_self`
- `webflow-app-review-mcp__app_review_unassign_self`
- `webflow-app-review-mcp__app_review_save_draft_feedback`
- `webflow-app-review-mcp__app_review_set_review_status`
- `webflow-app-review-mcp__app_review_update_version_review`
- `webflow-app-review-mcp__app_review_set_marketplace_status`
- `webflow-app-review-mcp__app_review_update_asset_metadata`

Only these tools should remain visible in Phase A:

- `webflow-app-review-mcp__app_review_health`
- `webflow-app-review-mcp__app_review_list_queue`
- `webflow-app-review-mcp__app_review_get_asset`
- `webflow-app-review-mcp__app_review_list_versions`
- `webflow-app-review-mcp__app_review_get_version`
- `webflow-app-review-mcp__app_review_get_field_map`

Everything else should remain read-only for reviewers.

## 7. Confirm reviewer attribution model before writes

Before enabling any reviewer-safe write, verify and record exactly how reviewer identity is attached to the write path.

Required implementation posture:

- the reviewer identity must come from the authenticated Hub/session context
- the reviewer identity must map to the intended reviewer account
- reviewer attribution must not rely only on the shared MCP bearer token
- if reviewer identity is missing, the write must fail closed

Recommended implementation options:

- add app-review reviewer directory support similar to the template-review worker
- or prove that the outer Hub injects reviewer identity and that downstream traces preserve it reliably

## 8. Set reviewer Hubs to read-only first

Before any write enablement:

- configure reviewer sessions for read-only discovery and execution posture
- verify that mutable routes do not appear in reviewer discovery
- verify that mutable routes do not execute from reviewer sessions

Treat this as a hard requirement, not an optional UX preference.

## 9. Enable rate limits and quotas before writes

Before reviewer write rollout:

- enable per-account rate limits
- enable per-account monthly quota
- keep reviewer Hubs on account-scoped controls

Suggested initial posture:

- scope: `account`
- rate limits on
- quotas on
- exempt servers: none for reviewer write paths

## 10. Verify policy enforcement in discovery and execution

For each reviewer Hub, confirm:

1. read-only sessions cannot discover mutable routes
2. read-only sessions cannot execute mutable routes
3. blocked actions return policy-linked deny reasons
4. future write-capable routes resolve through actor-aware authorization before execution
5. destructive or control-plane routes remain blocked

This should be validated in runtime behavior, not just by reading policy docs.

## 11. Verify telemetry and trace fields

For every future write-path test, confirm the Hub trace contains:

- `correlation_id`
- `accountId`
- `tenantId`
- `userId`
- `sessionId`
- proxy tool name
- downstream server
- downstream tool
- policy decision metadata

For the app-review rollout specifically, also confirm that you can derive or record:

- reviewer identity
- asset id
- version id
- decision class

If the Hub trace cannot support reviewer-attributed write review, keep reviewer Hubs read-only.

## 12. Write-enable sequence

Enable writes in this order:

1. `app_review_assign_self`
2. `app_review_unassign_self`
3. `app_review_save_draft_feedback`
4. `app_review_set_review_status`
5. `app_review_request_changes`
6. `app_review_approve_version`
7. `app_review_reject_version`

Do not enable the next action until the earlier action passes:

- reviewer-attributed trace verification
- Airtable update verification
- fallback drill verification
- blocked/ambiguous path verification

Keep `app_review_update_asset_metadata` operator-only unless governance is explicitly expanded.

## 13. Runtime verification checklist

Before write enablement for each reviewer Hub:

- session identity resolves correctly
- reviewer discovery is limited to app-review read surfaces
- broad mutation tools are hidden
- reviewer-owned workflow tools are hidden until Phase B
- read-only sessions block write discovery
- read-only sessions block write execution
- telemetry rows appear in `cs-telemetry`
- `hub_trace_lookup` returns broker and downstream records for the same run
- fallback to manual Airtable handling is rehearsed

After write enablement for each action:

- trace shows reviewer-attributed execution
- Airtable record shows correct state change
- retry behavior is understood
- unsupported fields fail closed
- rollback to read-only mode is documented and fast

## 14. Operational stop conditions

Revert a reviewer Hub to read-only immediately if:

- actor context is missing or inconsistent
- mutable tools appear in a reviewer read-only discovery surface
- reviewer identity cannot be recovered from traces
- a write occurs without clear reviewer attribution
- policy-denied actions are executing anyway
- quota or rate-limit behavior is not functioning as configured

If this affects more than one reviewer Hub, revert both to read-only and triage centrally.

## 15. Suggested operator workflow

1. Create the two reviewer-specific Hub surfaces.
2. Put both in read-only mode.
3. Narrow discovery to `webflow-app-review-mcp`.
4. Verify hidden write surfaces.
5. Turn on rate limits and quotas.
6. Run discovery and execution authz checks with a reviewer session.
7. Confirm trace visibility in `cs-telemetry`.
8. Confirm reviewer identity mapping for Pablo and Shea.
9. Enable `app_review_update_version_review` for one reviewer Hub first.
10. Review traces and Airtable result.
11. Expand to `app_review_set_marketplace_status` only after clean results.
12. Expand reviewer-by-reviewer only after clean results.

## 16. Deliverable output for signoff

Before production write enablement, produce:

- reviewer identity evidence for both reviewer Hubs
- discovery policy evidence for both reviewer Hubs
- trace evidence for at least one successful and one blocked write-path test
- Airtable verification evidence for any enabled reviewer write
- rollback instructions to return both Hubs to read-only mode

No broader rollout should proceed until the Marketplace review lead and Senior Systems Architect approve those artifacts.

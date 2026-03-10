# Reviewer Hub Implementation Checklist

**Status:** Working draft  
**Audience:** Senior Systems Architect, Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This checklist turns the reviewer rollout policy into concrete Hub implementation work for the first five reviewer-specific Hubs.

Use it after the rollout spec and before enabling reviewer writes.

## 2. Current Hub-side facts to account for

As of `2026-03-10`, the live Hub surface shows:

- `webflow-template-review-mcp` is enabled
- the service exposes `16` proxy tools
- Hub rate limits are disabled
- Hub quotas are disabled

That means the Hub already has the needed downstream server connected, but its default posture is still broader and looser than the reviewer rollout requires.

## 3. Build the five reviewer-specific Hubs

Create one reviewer-scoped Hub surface per reviewer:

- `wf-template-review-natalia`
- `wf-template-review-sudiksha`
- `wf-template-review-eric`
- `wf-template-review-vicki`
- `wf-template-review-mariana`

For each Hub:

- bind reviewer identity through the Hub login/session path
- do not rely on a shared reviewer prompt convention for identity
- keep the Hub on broker-first routing
- keep reviewer access separate from operator/admin control-plane access

## 4. Enforce session-resolved identity

Confirm the Hub runs with session-resolved identity rather than legacy fallback behavior.

Required behavior:

- reviewer requests resolve `account_id`
- reviewer requests resolve `tenant_id`
- reviewer requests resolve `user_id`
- reviewer requests resolve `session_id`
- reviewer requests carry reviewer-scoped `allowed_tool_prefixes`

Do not enable reviewer writes if the Hub is still operating as a generic shared runtime with no resolved actor context.

## 5. Narrow discovery per reviewer Hub

For each reviewer Hub:

1. restrict active discovery to the minimum required review servers
2. keep discovery compact by default
3. cap visible proxy tools aggressively
4. persist account-scoped discovery preferences

Recommended review-lane active servers:

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`
- `webflow-local`

If the review lane does not yet need all three, start with the smallest usable set.

Recommended reviewer discovery policy:

- `mode`: `compact`
- `activeServers`: review-only servers
- `maxProxyTools`: low enough that reviewers do not receive a broad catalog by accident

## 6. Hide broad mutation tools from reviewer discovery

Remove these tools from reviewer-facing discovery during alpha:

- `webflow-template-review-mcp__template_review_update_asset_metadata`
- `webflow-template-review-mcp__template_review_update_asset_publishing`
- `webflow-template-review-mcp__template_review_update_version_review`

Only these write tools should be candidates for later enablement:

- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_approve_version`
- `webflow-template-review-mcp__template_review_reject_version`
- `webflow-template-review-mcp__template_review_complete_publishing`

Everything else should remain read-only for reviewers.

## 7. Set reviewer Hubs to read-only first

Before any write enablement:

- configure reviewer sessions for read-only discovery and execution posture
- verify that mutable routes do not appear in reviewer discovery
- verify that mutable routes do not execute from reviewer sessions

The Hub policy and authz layer already support this model. Treat that as a hard requirement, not an optional UX preference.

## 8. Enable rate limits and quotas before writes

The live Hub currently has both disabled. Turn on at least minimal controls before reviewer write rollout.

Minimum recommended controls:

- enable per-account rate limits
- enable per-account monthly quota
- keep stricter limits for write-capable reviewer Hubs than for read-only analysis use

Suggested initial posture:

- scope: `account`
- rate limits on
- quotas on
- exempt servers: none for reviewer write paths unless there is a deliberate exception

If you need more granularity later, move to `account_server` or `account_server_tool`.

## 9. Verify policy enforcement in discovery and execution

For each reviewer Hub, confirm:

1. read-only sessions cannot discover mutable routes
2. read-only sessions cannot execute mutable routes
3. blocked actions return policy-linked deny reasons
4. write-capable routes resolve through actor-aware authorization before execution
5. destructive or control-plane routes require review or remain blocked

This should be validated in runtime behavior, not just by reading policy docs.

## 10. Verify telemetry and trace fields

For every write-path test, confirm the Hub trace contains:

- `correlation_id`
- `accountId`
- `tenantId`
- `userId`
- `sessionId`
- proxy tool name
- downstream server
- downstream tool
- policy decision metadata

For the reviewer rollout specifically, also confirm that you can derive or record:

- reviewer identity
- asset id
- version id
- decision class

If the Hub trace cannot support reviewer-attributed write review, keep reviewer Hubs read-only.

## 11. Write-enable sequence

Enable writes in this order:

1. `request_changes`
2. `approve_version`
3. `reject_version`
4. `complete_publishing`

Do not enable the next action until the earlier action passes:

- reviewer-attributed trace verification
- Airtable update verification
- fallback drill verification
- blocked/ambiguous path verification

Publishing completion should be last because it couples review state with release resolution.

## 12. Runtime verification checklist

Before write enablement for each reviewer Hub:

- session identity resolves correctly
- reviewer discovery is limited to review surfaces
- broad mutation tools are hidden
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

## 13. Operational stop conditions

Revert a reviewer Hub to read-only immediately if:

- actor context is missing or inconsistent
- mutable tools appear in a reviewer read-only discovery surface
- reviewer identity cannot be recovered from traces
- a write occurs without clear reviewer attribution
- policy-denied actions are executing anyway
- quota or rate-limit behavior is not functioning as configured

If this affects more than one reviewer Hub, revert all five to read-only and triage centrally.

## 14. Suggested operator workflow

1. Create the five reviewer-specific Hub surfaces.
2. Put all five in read-only mode.
3. Narrow discovery to review-only servers.
4. Verify hidden write surfaces.
5. Turn on rate limits and quotas.
6. Run discovery and execution authz checks with a reviewer session.
7. Confirm trace visibility in `cs-telemetry`.
8. Enable `request_changes` for one reviewer Hub first.
9. Review traces and Airtable result.
10. Expand action-by-action and reviewer-by-reviewer only after clean results.

## 15. Deliverable output for signoff

Before broader rollout, operators should be able to hand the workflow owner:

- the five Hub names
- the active server set per Hub
- the visible tool list per Hub
- the enabled write actions per Hub
- one trace example per write action
- one fallback example
- the current rollback procedure

If that package cannot be produced, the reviewer rollout is not yet implementation-ready.

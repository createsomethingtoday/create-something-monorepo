# Reviewer Hub Runtime Posture

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This document gives the exact Hub posture to use for the first two reviewer-specific app-review Hub surfaces.

It answers:

- which downstream server must be enabled
- which discovery settings to apply
- what the initial reviewer-visible surface should be
- when write posture can be expanded

## 2. Important current-state note

As of `2026-03-10`, the codebase posture is:

- `webflow-app-review-mcp` exists and is implementation-ready
- the MCP worker boundary still uses one shared bearer token
- reviewer-specific attribution therefore must come from the outer Hub/session layer, not from the MCP server itself

That means the only safe exact runtime posture today is an **app-review read-only evidence lane** unless the outer Hub layer can prove reviewer identity and trace it on writes.

## 3. Reviewer Hub identities

Use one reviewer-specific Hub surface or account-scoped Hub posture per reviewer:

| Reviewer | Email | Hub slug |
| --- | --- | --- |
| Pablo Miranda | `pablo.miranda@webflow.com` | `wf-app-review-pablo` |
| Shea Sisco | `shea.sisco@webflow.com` | `wf-app-review-shea` |

If these are implemented as separate custom-domain Hubs, keep the same posture across both. If they are implemented as one remote runtime with per-account state, persist discovery preferences separately per reviewer account.

## 4. Phase A: current-live-safe posture

Use this immediately, because it only depends on the app-review MCP and does not assume reviewer-attributed writes.

### Active servers

- `webflow-app-review-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-app-review-mcp"]`
- `maxProxyTools`: `8`

### Reviewer-visible tool target

Visible tools should be limited to:

- `webflow-app-review-mcp__app_review_health`
- `webflow-app-review-mcp__app_review_list_queue`
- `webflow-app-review-mcp__app_review_get_asset`
- `webflow-app-review-mcp__app_review_list_versions`
- `webflow-app-review-mcp__app_review_get_version`
- `webflow-app-review-mcp__app_review_get_field_map`

### Reviewer action

Reads, recommendations, and feedback drafting only. All official state changes remain manual in Airtable during Phase A.

## 5. Phase B: reviewer-owned write posture

Use this only after reviewer attribution and trace requirements are verified in the live Hub runtime.

### Active servers

- `webflow-app-review-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-app-review-mcp"]`
- `maxProxyTools`: `10`

### Reviewer-visible tool target

Phase B should still default to a narrow review surface:

- all Phase A read tools
- `webflow-app-review-mcp__app_review_update_version_review`
- optionally `webflow-app-review-mcp__app_review_set_marketplace_status` after separate validation

Do not expose general metadata mutation tools if the reviewer workflow only needs review-state actions.

## 6. Reviewer discovery posture

For each reviewer-specific Hub/account, apply this Phase A discovery posture first:

```json
{
  "mode": "compact",
  "activeServers": ["webflow-app-review-mcp"],
  "maxProxyTools": 8
}
```

Apply it through `hub_set_discovery`.

Move to Phase B only after trace validation:

```json
{
  "mode": "compact",
  "activeServers": ["webflow-app-review-mcp"],
  "maxProxyTools": 10
}
```

## 7. Reviewer write enablement posture

Do not widen discovery to expose broad mutation tools.

The only reviewer-facing write actions that may be enabled later are:

- `webflow-app-review-mcp__app_review_update_version_review`
- `webflow-app-review-mcp__app_review_set_marketplace_status`

Keep these out of reviewer use until:

- reviewer identity is visible in traces
- `correlation_id` links recommendation and write
- Airtable writes are validated
- fallback is rehearsed

## 8. Tools that should stay hidden from reviewers

Hide these from reviewer-facing discovery in both Phase A and Phase B:

- `webflow-app-review-mcp__app_review_update_asset_metadata`

This tool is too broad for the current reviewer playbook and should remain operator-only unless the policy pack is explicitly expanded.

## 9. Policy posture

Use this reviewer policy posture:

- read-only reviewer sessions cannot discover mutable routes
- read-only reviewer sessions cannot execute mutable routes
- reviewer write routes remain approval-gated
- metadata mutation remains blocked from reviewer surfaces
- control-plane and destructive routes remain blocked or review-only
- policy-denied routes must fail closed

This should be enforced by the Hub authz layer, not by UI convention alone.

## 10. Rate-limit and quota posture

Before enabling reviewer writes, set:

- rate limits: enabled
- quotas: enabled
- scope: `account`

Recommended starting point:

- modest per-account rate limit for reviewer Hubs
- modest monthly per-account quota for reviewer Hubs
- no exemptions for `webflow-app-review-mcp` write paths

## 11. Reviewer-by-reviewer rollout order

Recommended order:

1. Pablo Miranda
2. Shea Sisco

Reason:

- Pablo appears to be the primary app reviewer in current marketplace volume data
- start with one reviewer
- validate traces and fallback
- expand only after clean evidence

## 12. Recommended operator sequence

1. Enable `webflow-app-review-mcp` in the reviewer Hub runtime.
2. Apply Phase A compact discovery posture to both reviewer Hubs.
3. Confirm write tools are not visible in reviewer discovery.
4. Confirm reviewer sessions are read-only and actor-resolved.
5. Turn on Hub rate limits and quotas.
6. Enable `app_review_update_version_review` for one reviewer only after trace validation.
7. Validate Airtable writes and rollback behavior.
8. Expand to the second reviewer.
9. Consider `app_review_set_marketplace_status` only after clean evidence.

## 13. Stop conditions

Revert a reviewer Hub to Phase A immediately if:

- actor context is missing
- mutable tools appear unexpectedly
- traces do not identify the reviewer cleanly
- write behavior is ambiguous
- fallback is too slow or unclear

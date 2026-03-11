# Reviewer Hub Runtime Posture

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This document gives the exact Hub posture to use for the first five reviewer-specific Hub surfaces.

It is intended to answer:

- which downstream servers must be enabled
- which discovery settings to apply
- what the initial reviewer-visible surface should be
- when write posture can be expanded

## 2. Important current-state note

As of `2026-03-10`, the live remote Hub currently shows:

- `webflow-template-review-mcp` connected
- `webflow-site-analyzer-mcp` not connected
- `webflow-local` not connected

That means the only safe exact runtime posture today is a **template-review-context-only** lane unless the other Webflow servers are enabled and verified first.

## 3. Reviewer Hub identities

Use one reviewer-specific Hub surface or account-scoped Hub posture per reviewer:

| Reviewer | Email | Hub slug |
| --- | --- | --- |
| Natalia Ledford | `natalia.ledford@webflow.com` | `wf-template-review-natalia` |
| Sudiksha Khanduja | `sudiksha.khanduja@webflow.com` | `wf-template-review-sudiksha` |
| Eric Unger | `eric.unger@webflow.com` | `wf-template-review-eric` |
| Vicki Chen | `vicki.chen@webflow.com` | `wf-template-review-vicki` |
| Mariana Segura | `mariana.segura@webflow.com` | `wf-template-review-mariana` |

If these are implemented as separate custom-domain Hubs, keep the same posture across all five. If they are implemented as one remote runtime with per-account state, persist discovery preferences separately per reviewer account.

## 4. Phase A: current-live-safe posture

Use this immediately, because it only depends on the server that is already connected.

### Active servers

- `webflow-template-review-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp"]`
- `maxProxyTools`: `12`

### Reviewer-visible tool target

Visible tools should be limited to:

- `webflow-template-review-mcp__template_review_health`
- `webflow-template-review-mcp__template_review_list_queue`
- `webflow-template-review-mcp__template_review_search_assets`
- `webflow-template-review-mcp__template_review_search_versions`
- `webflow-template-review-mcp__template_review_get_asset`
- `webflow-template-review-mcp__template_review_list_versions`
- `webflow-template-review-mcp__template_review_get_version`
- `webflow-template-review-mcp__template_review_get_review_context`
- `webflow-template-review-mcp__template_review_list_releases`
- `webflow-template-review-mcp__template_review_get_field_map`
- `webflow-template-review-mcp__template_review_assign_self`

Do not expose broad write tools in Phase A. The only permitted mutation is reviewer self-assignment on the Asset Version.

### Reviewer action

Reads plus narrow self-assignment. Broader review-state changes remain manual in Airtable.

## 5. Phase B: full reviewer lane posture

Use this only after the missing Webflow analysis servers are enabled and verified in the live Hub.

### Required servers

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`
- `webflow-local`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp", "webflow-site-analyzer-mcp", "webflow-local"]`
- `maxProxyTools`: `30`

### Reviewer-visible tool target

Phase B should still default to a narrow review surface:

- all Phase A read tools
- selected analysis tools from `webflow-site-analyzer-mcp`
- selected originality/plagiarism tools from `webflow-local`

Do not expose entire raw tool catalogs if the reviewer workflow only needs a few actions.

### Reviewer write posture

Even in Phase B, reviewer Hubs should begin read-only and move to write enablement later by action.

## 6. Server enablement sequence

If the live remote Hub is missing the analysis servers, use this operator sequence first.

### Enable required servers

Use `hub_update_state` with:

```json
{
  "enableServers": [
    "webflow-template-review-mcp",
    "webflow-site-analyzer-mcp",
    "webflow-local"
  ]
}
```

### Verify connections

Then verify:

- `hub_status`
- `hub_list_services`
- `hub_search_proxy_tools` with `serverName` set to each of:
  - `webflow-template-review-mcp`
  - `webflow-site-analyzer-mcp`
  - `webflow-local`

Do not move to Phase B until all three resolve and return usable proxy tools.

## 7. Reviewer discovery posture

For each reviewer-specific Hub/account, apply this Phase A discovery posture first:

```json
{
  "mode": "compact",
  "activeServers": ["webflow-template-review-mcp"],
  "maxProxyTools": 12
}
```

Apply it through `hub_set_discovery`.

After the other Webflow servers are connected and tested, move the reviewer to Phase B:

```json
{
  "mode": "compact",
  "activeServers": [
    "webflow-template-review-mcp",
    "webflow-site-analyzer-mcp",
    "webflow-local"
  ],
  "maxProxyTools": 30
}
```

## 8. Reviewer write enablement posture

Do not widen discovery to expose general mutation tools.

The only write actions that may be enabled later are:

- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_approve_version`
- `webflow-template-review-mcp__template_review_reject_version`
- `webflow-template-review-mcp__template_review_complete_publishing`

Reviewer self-assignment is already allowed as a narrow write:

- `webflow-template-review-mcp__template_review_assign_self`

Keep these out of reviewer use until:

- reviewer identity is visible in traces
- `correlation_id` links recommendation and write
- Airtable writes are validated
- fallback is rehearsed

## 9. Tools that should stay hidden from reviewers

Hide these from reviewer-facing discovery in both Phase A and Phase B:

- `webflow-template-review-mcp__template_review_update_asset_metadata`
- `webflow-template-review-mcp__template_review_update_asset_publishing`
- `webflow-template-review-mcp__template_review_update_version_review`

These are too broad for the current reviewer playbook and should remain operator-only unless the policy pack is explicitly expanded.

## 10. Policy posture

Use this reviewer policy posture:

- read-only reviewer sessions cannot discover mutable routes
- read-only reviewer sessions cannot execute mutable routes
- reviewer write routes remain approval-gated
- control-plane and destructive routes remain blocked or review-only
- policy-denied routes must fail closed

This should be enforced by the Hub authz layer, not by UI convention alone.

## 11. Rate-limit and quota posture

The live Hub currently reports rate limits and quotas as disabled. Before enabling reviewer writes, set:

- rate limits: enabled
- quotas: enabled
- scope: `account`

Recommended starting point:

- modest per-account rate limit for reviewer Hubs
- modest monthly per-account quota for reviewer Hubs
- no exemptions for `webflow-template-review-mcp` write paths

If you need tighter control later, move to `account_server` or `account_server_tool`.

## 12. Reviewer-by-reviewer rollout order

Recommended order:

1. Natalia Ledford
2. Sudiksha Khanduja
3. Eric Unger
4. Vicki Chen
5. Mariana Segura

Reason:

- start with one reviewer
- validate traces and fallback
- expand gradually instead of enabling all five write-capable at once

## 13. Recommended operator sequence

1. Enable missing Webflow analysis servers in the Hub.
2. Verify they are connected and searchable.
3. Apply Phase A compact discovery posture to all five reviewer Hubs.
4. Confirm write tools are not visible in reviewer discovery.
5. Confirm reviewer sessions are read-only and actor-resolved.
6. Turn on Hub rate limits and quotas.
7. Move one reviewer to Phase B discovery once the analysis servers are healthy.
8. Enable `request_changes` for one reviewer only after trace validation.
9. Expand action-by-action.
10. Expand reviewer-by-reviewer.

## 14. Stop conditions

Revert a reviewer Hub to Phase A immediately if:

- actor context is missing
- mutable tools appear unexpectedly
- traces do not identify the reviewer cleanly
- write behavior is ambiguous
- fallback is too slow or unclear

If more than one reviewer Hub hits the same issue, revert all five to Phase A and pause write rollout.

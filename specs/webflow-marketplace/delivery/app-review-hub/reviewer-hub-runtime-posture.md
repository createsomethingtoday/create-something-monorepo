# Reviewer Hub Runtime Posture

**Status:** Live production posture  
**Audience:** Hub operators  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-04-17`

## 1. Purpose

This document gives the exact Hub posture for the two live reviewer-specific app-review Hub surfaces and the rollback posture to use if production writes need to be withdrawn.

It answers:

- which downstream server must be enabled
- which discovery settings to apply
- what the initial reviewer-visible surface should be
- when write posture can be expanded

## 2. Important current-state note

As of `2026-04-17`, the live posture is:

- `webflow-app-review-mcp` is deployed and connected in both reviewer hubs
- reviewer identity is resolved through the outer Hub account context plus `REVIEWER_DIRECTORY_JSON`
- both reviewer hubs currently expose the full downstream app-review tool surface
- reviewer hubs are bearer-based and use reviewer-specific Infisical-managed bearer tokens
- OAuth discovery is disabled on reviewer custom domains
- the Hub runtime is aligned to `webflow-marketplace-app-review-phase-b`

That means the production-safe exact runtime posture today is:

- keep `webflow-app-review-mcp` as the only active downstream server
- run full discovery over that server
- preserve reviewer-specific bearer-token lanes
- treat the old compact 6-tool Phase A posture as the rollback mode

## 3. Reviewer Hub identities

Use one reviewer-specific Hub surface or account-scoped Hub posture per reviewer:

| Reviewer | Email | Hub slug |
| --- | --- | --- |
| Pablo Miranda | `pablo.miranda@webflow.com` | `wf-app-review-pablo` |
| Shea Sisco | `shea.sisco@webflow.com` | `wf-app-review-shea` |

If these are implemented as separate custom-domain Hubs, keep the same posture across both. If they are implemented as one remote runtime with per-account state, persist discovery preferences separately per reviewer account.

## 4. Current production reviewer-write posture

### Active servers

- `webflow-app-review-mcp`

### Discovery mode

- `mode`: `full`
- `activeServers`: `["webflow-app-review-mcp"]`
- `maxProxyTools`: `18`

### Reviewer-visible tool target

Visible tools should currently include the full downstream app-review surface:

- `webflow-app-review-mcp__app_review_health`
- `webflow-app-review-mcp__app_review_list_queue`
- `webflow-app-review-mcp__app_review_get_asset`
- `webflow-app-review-mcp__app_review_list_versions`
- `webflow-app-review-mcp__app_review_get_version`
- `webflow-app-review-mcp__app_review_get_field_map`
- `webflow-app-review-mcp__app_review_my_queue`
- `webflow-app-review-mcp__app_review_get_review_context`
- `webflow-app-review-mcp__app_review_assign_self`
- `webflow-app-review-mcp__app_review_unassign_self`
- `webflow-app-review-mcp__app_review_save_draft_feedback`
- `webflow-app-review-mcp__app_review_set_review_status`
- `webflow-app-review-mcp__app_review_request_changes`
- `webflow-app-review-mcp__app_review_approve_version`
- `webflow-app-review-mcp__app_review_reject_version`
- `webflow-app-review-mcp__app_review_update_version_review`
- `webflow-app-review-mcp__app_review_update_asset_metadata`
- `webflow-app-review-mcp__app_review_set_marketplace_status`

### Reviewer action

All app-review tools are currently available. The preferred reviewer workflow still mirrors the template-review lane:

- self-assign first
- use draft feedback and controlled status writes during in-progress review
- use dedicated decision verbs for changes requested, approve, and reject
- use broader version or asset routes deliberately, not by default

## 5. Read-only rollback posture

### Active servers

- `webflow-app-review-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-app-review-mcp"]`
- `maxProxyTools`: `6`

### Reviewer-visible tool target

Rollback should hide all write tools and return the reviewer lane to the original 6 read/context tools:

- `webflow-app-review-mcp__app_review_health`
- `webflow-app-review-mcp__app_review_list_queue`
- `webflow-app-review-mcp__app_review_get_asset`
- `webflow-app-review-mcp__app_review_list_versions`
- `webflow-app-review-mcp__app_review_get_version`
- `webflow-app-review-mcp__app_review_get_field_map`

## 6. Reviewer discovery posture

For each reviewer-specific Hub/account, the current production discovery posture is:

```json
{
  "mode": "full",
  "activeServers": ["webflow-app-review-mcp"],
  "maxProxyTools": 18
}
```

Apply it through `hub_set_discovery`.

If rollback is required, apply:

```json
{
  "mode": "compact",
  "activeServers": ["webflow-app-review-mcp"],
  "maxProxyTools": 6
}
```

## 7. Reviewer write enablement posture

The default reviewer-facing write actions are:

- `webflow-app-review-mcp__app_review_assign_self`
- `webflow-app-review-mcp__app_review_unassign_self`
- `webflow-app-review-mcp__app_review_save_draft_feedback`
- `webflow-app-review-mcp__app_review_set_review_status`
- `webflow-app-review-mcp__app_review_request_changes`
- `webflow-app-review-mcp__app_review_approve_version`
- `webflow-app-review-mcp__app_review_reject_version`

Reviewer-owned flow should mirror the template-review lane:

- self-assign before review writes
- save draft feedback or controlled status changes while the review is in progress
- use dedicated decision verbs for changes requested, approve, and reject

The broader routes are also visible in the current production surface:

- `webflow-app-review-mcp__app_review_update_version_review`
- `webflow-app-review-mcp__app_review_set_marketplace_status`

## 8. Tools that should stay hidden from reviewers

No downstream app-review tools are intentionally hidden in the current production reviewer surface. Roll back to the compact 6-tool posture if reviewer-safe writes need to be withdrawn.

## 9. Policy posture

Use this reviewer policy posture:

- full reviewer sessions may discover the full downstream app-review surface
- reviewer write routes remain deliberate reviewer-owned actions
- rollback to the compact 6-tool posture is the default containment action
- control-plane and destructive non-app-review routes remain blocked or review-only
- policy-denied routes must fail closed

This should be enforced by the Hub authz layer, not by UI convention alone.

## 10. Rate-limit and quota posture

Keep these enabled in production:

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

1. Keep `webflow-app-review-mcp` as the only enabled downstream server.
2. Apply full discovery posture to both reviewer Hubs.
3. Verify all 18 app-review proxy tools are visible.
4. Keep Hub rate limits and quotas enabled.
5. If reviewer attribution or write safety degrades, revert discovery to the compact 6-tool rollback posture immediately.

## 13. Stop conditions

Revert a reviewer Hub to Phase A immediately if:

- actor context is missing
- traces do not identify the reviewer cleanly
- write behavior is ambiguous
- fallback is too slow or unclear
- fallback is too slow or unclear

# Reviewer Hub Implementation Checklist

**Status:** Live production checklist
**Audience:** Senior Systems Architect, Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-17`

## 1. Purpose

This checklist verifies and maintains the current production template-review reviewer lane.

Use it when:

- auditing the six live reviewer hubs
- validating bearer-token posture
- confirming direct analyzer visibility
- preparing rollback to the old compact pack

## 2. Current production facts to account for

As of `2026-04-17`, the intended reviewer posture is:

- `webflow-template-review-mcp` enabled
- `webflow-site-analyzer-mcp` enabled
- compact discovery with a 30-tool cap
- reviewer-specific bearer-based lanes using `compat` identity mode
- OAuth discovery disabled on reviewer custom domains
- `webflow-local` excluded from the reviewer pack

## 3. Reviewer Hub inventory

Confirm these six reviewer-specific Hub surfaces exist and stay aligned:

- `wf-template-review-natalia`
- `wf-template-review-sudiksha`
- `wf-template-review-eric`
- `wf-template-review-vicki`
- `wf-template-review-mariana`
- `wf-template-review-micah`

For each Hub:

- keep reviewer access separate from operator control-plane access
- keep the reviewer lane broker-first
- keep reviewer auth tied to the reviewer-scoped bearer secret

## 4. Bearer auth verification

Confirm all of the following:

- reviewer secrets still exist in Infisical as `CS_HUB_WF_TEMPLATE_REVIEW_<REVIEWER>_API_TOKEN`
- tokens remain in the original managed bearer format
- `compat` identity mode is configured on the Hub runtime
- `/.well-known/oauth-authorization-server` returns `404`
- unauthorized MCP requests return a plain bearer challenge without OAuth resource metadata

If any reviewer Hub starts advertising OAuth discovery again, redeploy the runtime before doing anything else.

## 5. Discovery verification

Current production discovery policy:

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp", "webflow-site-analyzer-mcp"]`
- `maxProxyTools`: `30`

Confirm:

- `hub_list_services` shows both active servers
- `hub_search_proxy_tools` succeeds for `webflow-template-review-mcp`
- `hub_search_proxy_tools` succeeds for `webflow-site-analyzer-mcp`
- `webflow-local` does not appear in reviewer discovery

## 6. Reviewer-visible tool policy

Keep these template-review reviewer tools visible:

- queue, asset, version, and review-context reads
- analyzer bridge tools
- assignment and self-assignment tools
- bounded draft-feedback and review-status tools

Keep these broad template-review mutation tools hidden:

- `webflow-template-review-mcp__template_review_update_asset_metadata`
- `webflow-template-review-mcp__template_review_update_asset_publishing`
- `webflow-template-review-mcp__template_review_update_version_review`

Direct analyzer visibility is allowed. `webflow-local` is not.

## 7. Field mapping verification

Before any reviewer-write expansion or smoke testing, confirm:

- reviewer feedback field id: `fldHxIGHMHn4xb9U4`
- `📝Review Status` field id: `flde8Huk5NRIdm2wZ`
- missing or ambiguous field mappings fail closed
- `template_review_get_field_map` still exposes the operator verification surface needed for debugging

## 8. Rate limits and quotas

Keep these enabled in production:

- per-account rate limits
- per-account quota
- no exemptions for reviewer write paths unless there is a deliberate incident response reason

If rate limits or quotas drift off, fix that before widening reviewer-visible write behavior.

## 9. Trace and telemetry verification

For reviewer write-path validation, confirm traces include:

- `correlation_id`
- `accountId`
- `tenantId`
- `userId`
- `sessionId`
- proxy tool name
- downstream server
- downstream tool
- policy decision metadata
- reviewer attribution
- asset id
- version id

If reviewer attribution is missing, keep the lane in its current bounded posture and do not widen writes.

## 10. Runtime verification checklist

For each reviewer Hub, verify:

- bearer token from Infisical authenticates successfully
- `/health` returns successfully
- `/health` reports `oauth_discovery_enabled: false`
- `hub_list_services` returns the two production servers
- `webflow-reviewer-demo-verify.sh` succeeds with `EXPECT_DIRECT_ANALYZER_SERVER=true`
- direct analyzer visibility is present
- `webflow-local` is absent

## 11. Rollback readiness

Be ready to move all six reviewer hubs back to rollback posture if:

- reviewer auth is broken
- OAuth discovery reappears
- analyzer visibility disappears inconsistently
- broad mutation tools leak into reviewer discovery
- `webflow-local` appears in the reviewer surface

Rollback target:

- `webflow-template-review-mcp` only
- analyzer bridge tools only
- compact 22-tool discovery pack

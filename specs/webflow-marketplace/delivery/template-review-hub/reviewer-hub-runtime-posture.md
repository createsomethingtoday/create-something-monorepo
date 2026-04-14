# Reviewer Hub Runtime Posture

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-14`

## 1. Purpose

This document records the production Hub posture for the six reviewer-specific Webflow Marketplace template review surfaces.

It answers:

- which downstream servers are part of the reviewer lane
- which discovery settings to apply
- what reviewer-visible surface is allowed
- which servers stay out of the remote Hub runtime

## 2. Current production state

As of `2026-04-14`, the production reviewer lane is:

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`

`webflow-local` is intentionally excluded from the remote reviewer Hub posture because the remote Hub only supports HTTP downstream servers and `webflow-local` does not currently satisfy that boundary.

## 3. Reviewer Hub identities

Use one reviewer-specific Hub surface or account-scoped Hub posture per reviewer:

| Reviewer | Email | Hub slug |
| --- | --- | --- |
| Natalia Ledford | `natalia.ledford@webflow.com` | `wf-template-review-natalia` |
| Sudiksha Khanduja | `sudiksha.khanduja@webflow.com` | `wf-template-review-sudiksha` |
| Eric Unger | `eric.unger@webflow.com` | `wf-template-review-eric` |
| Vicki Chen | `vicki.chen@webflow.com` | `wf-template-review-vicki` |
| Mariana Segura | `mariana.segura@webflow.com` | `wf-template-review-mariana` |
| Micah Johnson | `micah@webflow.com` | `wf-template-review-micah` |

If these are implemented as separate custom-domain Hubs, keep the same posture across all six. If they are implemented as one remote runtime with per-account state, persist discovery preferences separately per reviewer account.

## 4. Production reviewer posture

### Active servers

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp", "webflow-site-analyzer-mcp"]`
- `maxProxyTools`: `30`

### Reviewer-visible tool target

Visible tools should be limited to:

- `webflow-template-review-mcp__template_review_workflow`
- reviewer queue, asset, version, release, and review-context reads from `webflow-template-review-mcp`
- reviewer-safe write verbs from `webflow-template-review-mcp`
- selected read-only analysis tools from `webflow-site-analyzer-mcp`

Do not expose:

- broad template metadata mutation
- approval or publishing completion routes outside the reviewer-safe workflow
- raw analyzer catalogs that are not relevant to reviewer decisions
- unsupported local or stdio-only services

### Reviewer action posture

The reviewer lane remains narrow:

- official reviewer assignment and review-state writes come from `webflow-template-review-mcp`
- analysis evidence from `webflow-site-analyzer-mcp` is read-only input to reviewer judgment
- broader Marketplace state changes remain intentionally controlled outside generic update routes

## 5. Required telemetry posture

Production reviewer Hubs must emit:

- Hub telemetry to `cs-telemetry`
- Hub Braintrust traces
- downstream `webflow-template-review-mcp` telemetry to `cs-telemetry`
- downstream `webflow-template-review-mcp` Braintrust traces

`webflow-site-analyzer-mcp` remains part of the reviewer lane, but it still needs fleet telemetry parity work if the standard is end-to-end `cs-telemetry` plus Braintrust for every server in the lane.

## 6. Operator posture

Use these production artifacts:

- discovery pack: `webflow-marketplace-review`
- bundle: `webflow-marketplace-review`
- deploy script: `scripts/cs-hub-webflow-reviewers-deploy.sh`
- operator runbook: `reviewer-hub-operator-runbook.md`

## 7. Recovery

If a reviewer Hub drifts:

1. redeploy the worker
2. rerun normalization
3. rerun verification

If a downstream dependency fails:

- keep reviewer-safe writes narrow
- continue official reviewer actions through `webflow-template-review-mcp`
- treat missing analyzer evidence as degraded read-only signal, not a reason to widen write scope

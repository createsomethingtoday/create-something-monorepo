# Onboarding Skills

**Status:** Working draft  
**Audience:** Marketplace reviewers, Hub operators  
**Workflow:** `template_review_hub_lane`

This document defines the skill-led onboarding path for the Webflow Template Review Hub delivery.

The goal is to keep reviewer onboarding aligned with the actual live runtime, not the broadest planned workflow.

## Why this exists

The delivery pack already explains policy, workflow, and fallback in prose.

That is not enough for reliable MCP usage.

Onboarding should use reusable skills so hosts and operators apply the same defaults every time:

- safe Phase B queue, context, and price-handoff flow
- consistent evidence framing for the remote analyzer lane
- exact fallback behavior
- explicit separation between reviewer and operator responsibilities

## Included now

### Reviewer onboarding

Use:

1. `$webflow-template-review-reviewer`
2. `$webflow-template-review-analysis-calibration`
3. `$webflow-template-review-pilot-triage`

Reviewer onboarding should cover the current Phase B baseline:

- queue -> assign -> context
- analyzer evidence through `webflow-site-analyzer-mcp`
- Set Price updates through `template_review_set_price` and `template_review_bulk_set_price`
- returning `mrp_id` for the Admin handoff

Do not expose Hub control-plane skills to Marketplace reviewers.

### Operator onboarding

Use:

1. `$webflow-template-review-pilot-triage`
2. `$hub-mcp`
3. `$webflow-template-review-write-guardrails`

Use `$hub-mcp` only for internal operators and Hub owners. It is the operator skill for:

- checking live Hub posture
- narrowing discovery
- verifying proxy tools
- troubleshooting connections
- tracing brokered runs
- containment and rollout actions

## Additional gating

`$webflow-template-review-analysis-calibration` is in-scope now because Phase B reviewer hubs include the remote analyzer lane via `webflow-site-analyzer-mcp`.

`$webflow-template-review-write-guardrails` should remain operator-led until each broader review action is individually enabled and validated:

- `request_changes`
- `approve_version`
- `reject_version`
- `complete_publishing`

Price changes are already part of the current reviewer lane because `template_review_set_price` and `template_review_bulk_set_price` are narrow asset-publishing handoff tools.

## Onboarding sequence

### Current reviewer sequence

1. teach queue -> assign -> context -> my_queue -> unassign
2. teach the remote analyzer lane via `webflow-site-analyzer-mcp`
3. teach `Auto` vs `Partial` vs `Manual`
4. teach the Set Price -> Admin `mrp_id` handoff workflow
5. teach override and escalation rules
6. teach exact manual fallback behavior

### Pilot operator sequence

1. teach pilot triage and containment rules
2. teach `hub-mcp` for posture, discovery, and trace verification
3. teach `webflow-template-review-write-guardrails` for price and broader write verification
4. keep reviewer-facing tool exposure aligned to the remote-only Phase B baseline

### Future add-ons

If a future remote originality service is added, extend analysis calibration only after the service is connected, verified, and documented in the reviewer Hub baseline.

## Source material

The skills above are delivered as Codex-native skills under `$CODEX_HOME/skills`.

The repo-tracked export lives under:

- [packages/dotfiles/codex/skills](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/dotfiles/codex/skills)

The source material for those skills is:

- [reviewer-playbook.md](./reviewer-playbook.md)
- [runbook.md](./runbook.md)
- [mcp_contract.yaml](./mcp_contract.yaml)
- [reviewer-hub-runtime-posture.md](./reviewer-hub-runtime-posture.md)
- [reviewer-hub-rollout-spec.md](./reviewer-hub-rollout-spec.md)
- [reviewer-hub-implementation-checklist.md](./reviewer-hub-implementation-checklist.md)
- [resources.ts](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-template-review-mcp/src/resources.ts)

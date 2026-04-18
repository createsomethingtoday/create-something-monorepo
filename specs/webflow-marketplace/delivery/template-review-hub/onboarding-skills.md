# Onboarding Skills

**Status:** Active guidance  
**Audience:** Marketplace reviewers, Hub operators  
**Workflow:** `template_review_hub_lane`

This document defines the skill-led onboarding path for the Webflow Template Review Hub delivery.

The goal is to keep reviewer onboarding aligned with the live analyzer-backed reviewer runtime, not with stale rollout phases.

## Why this exists

The delivery pack already explains policy, workflow, and fallback in prose.

That is not enough for reliable MCP usage.

Onboarding should use reusable skills so hosts and operators apply the same defaults every time:

- queue, context, and analyzer-backed review flow
- consistent evidence framing
- exact fallback behavior
- explicit separation between reviewer and operator responsibilities

Historical "Phase A-only" language is deprecated for reviewer onboarding and should not be used as the current posture.

## Included now

### Reviewer onboarding

Use:

1. `$webflow-template-review-reviewer`
2. `$webflow-template-review-analysis-calibration`
3. `$webflow-template-review-pilot-triage`

Do not expose Hub control-plane skills to Marketplace reviewers.

### Operator onboarding

Use:

1. `$webflow-template-review-pilot-triage`
2. `$hub-mcp`

Use `$hub-mcp` only for internal operators and Hub owners. It is the operator skill for:

- checking live Hub posture
- narrowing discovery
- verifying proxy tools
- troubleshooting connections
- tracing brokered runs
- containment and rollout actions

## Later-gated skills

Create now, include later:

1. `$webflow-template-review-write-guardrails`

### Write guardrails gate

Include `$webflow-template-review-write-guardrails` only after each write action is individually enabled and validated:

- `request_changes`
- `approve_version`
- `reject_version`
- `complete_publishing`

Do not onboard reviewers into write behavior that still depends on manual Airtable fallback.

## Onboarding sequence

### Reviewer sequence

1. teach queue -> context -> analyzer -> assign -> reviewer-safe writes
2. teach `Auto` vs `Partial` vs `Manual`
3. teach override and escalation rules
4. teach exact manual fallback behavior

### Pilot operator sequence

1. teach pilot triage and containment rules
2. teach `hub-mcp` for posture, discovery, and trace verification
3. keep reviewer-facing tool exposure narrow

### Later add-ons

Add write guardrails only after reviewer-attributed traces and fallback drills are already passing.

## Source material

The skills above are delivered as Codex-native skills under `$CODEX_HOME/skills`.

The repo-tracked export lives under:

- [packages/dotfiles/codex/skills](/Users/micahjohnson/Code/worktrees/natalia-webflow-template-review-hub-3vb/packages/dotfiles/codex/skills)

The source material for those skills is:

- [reviewer-playbook.md](./reviewer-playbook.md)
- [runbook.md](./runbook.md)
- [mcp_contract.yaml](./mcp_contract.yaml)
- [reviewer-hub-runtime-posture.md](./reviewer-hub-runtime-posture.md)
- [reviewer-hub-rollout-spec.md](./reviewer-hub-rollout-spec.md)
- [reviewer-hub-implementation-checklist.md](./reviewer-hub-implementation-checklist.md)
- [resources.ts](/Users/micahjohnson/Code/worktrees/natalia-webflow-template-review-hub-3vb/packages/webflow-template-review-mcp/src/resources.ts)

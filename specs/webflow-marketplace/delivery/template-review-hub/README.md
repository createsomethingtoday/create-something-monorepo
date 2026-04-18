# Webflow Marketplace Template Review Hub Delivery Pack

**Status:** Live production pack
**Prepared:** 2026-04-17
**Audience:** Webflow Marketplace team

This folder packages the current Webflow template-review Hub lane into a delivery-ready handoff for reviewer operations and operator maintenance.

The goal is to define:

- what the live reviewer Hub lane is
- which reviewer actions are currently exposed
- how the bearer-based reviewer lanes are operated
- what the rollback posture is if production writes or analyzer visibility must be withdrawn

## Important current-state note

As of `2026-04-17`, the live template-review reviewer posture is:

- six reviewer-specific bearer-based Hub surfaces
- reviewer bearer tokens remain Infisical-managed in the original bearer format
- OAuth discovery is disabled on reviewer custom domains
- direct `webflow-site-analyzer-mcp` visibility is part of the production reviewer surface
- `webflow-local` is not part of the reviewer lane

The older compact Phase A posture is now rollback-only. Some historical delivery artifacts in this folder still preserve the original rollout planning context; use the runtime posture, policy records, and operator runbook below as the source of truth for the current live lane.

## Contents

1. `delivery-package.md`
Executive summary of the original delivery motion and reviewer workflow scope.

2. `mcp_contract.yaml`
Historical contract baseline for the template-review lane.

3. `agent_contract.yaml`
Behavioral rules, approval boundaries, escalation triggers, and runtime guardrails.

4. `outcome_contract.md`
Pilot scope, business objective, ownership boundary, release gates, risks, and assumptions.

5. `golden-task-checks.md`
Must-pass scenarios that prove the workflow is safe and useful.

6. `runbook.md`
Operator procedures for approvals, exceptions, fallback, containment, and recovery.

7. `reviewer-playbook.md`
Day-to-day reviewer instructions for using the Hub during template review.

8. `team-walkthrough.md`
Brief for the original walkthrough covering scope, demo flow, and decisions.

9. `pilot-kickoff-checklist.md`
Historical kickoff checklist for the original reviewer alpha.

10. `checklist-map.md`
Operational map of objective review coverage as `auto`, `partial`, or `manual`.

11. `launch-scorecard.md`
Launch metrics for adoption, quality, governance, and reliability.

12. `reviewer-hub-rollout-spec.md`
Reviewer-specific Hub plan, mapping, tool exposure, write gates, and containment rules.

13. `reviewer-hub-implementation-checklist.md`
Current production maintenance checklist for Hub identity, discovery, trace validation, rate limits, and rollback readiness.

14. `reviewer-hub-runtime-posture.md`
Exact live Hub server, discovery, and bearer-auth posture for the six reviewer-specific Hub surfaces.

15. `reviewer-hub-policy-records.yaml`
Reviewer-specific production policy records for the six live reviewer hubs.

16. `reviewer-hub-phase-a-operator-runbook.md`
Rollback operator path for restoring the old compact Phase A posture if needed.

17. `onboarding-skills.md`
Reviewer/operator onboarding notes, including historical rollout context.

## Reading order

1. `reviewer-hub-runtime-posture.md`
2. `reviewer-hub-policy-records.yaml`
3. `reviewer-hub-implementation-checklist.md`
4. `reviewer-hub-phase-a-operator-runbook.md`
5. `reviewer-playbook.md`
6. `runbook.md`

## Related source material

- `specs/webflow-marketplace/OVERVIEW.md`
- `docs/webflow-template-checklist-mcp-coverage.md`
- `docs/MCP_HUB_CONTROL_PLANE.md`
- `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
- `packages/webflow-template-review-mcp/README.md`
- `packages/webflow-site-analyzer-mcp/README.md`

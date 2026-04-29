# Webflow Marketplace Template Review Hub Delivery Pack

**Status:** Working draft  
**Prepared:** 2026-03-09  
**Audience:** Webflow Marketplace team

This folder packages the current Webflow review MCP work into a delivery-ready handoff for the Marketplace template review workflow.

The goal is not to explain every underlying system. The goal is to give the Marketplace team one operational pack that defines:

- what the Hub lane is
- what it is allowed to do
- what remains human-owned
- how pilot rollout should be validated
- what operators and reviewers should do when the workflow fails or becomes uncertain

## Contents

1. `delivery-package.md`
Executive summary of what is being delivered to the Marketplace team.

2. `mcp_contract.yaml`
Connectivity, systems, resources, tools, and operational scope for the template review lane.

3. `agent_contract.yaml`
Behavioral rules, approval boundaries, escalation triggers, and runtime guardrails.

4. `outcome_contract.md`
Pilot scope, business objective, ownership boundary, release gates, risks, and assumptions.

5. `golden-task-checks.md`
Must-pass scenarios that prove the workflow is safe and useful before broader rollout.

6. `runbook.md`
Operator procedures for approvals, exceptions, fallback, containment, and recovery.

7. `reviewer-playbook.md`
Day-to-day reviewer instructions for using the Hub during template review.

8. `team-walkthrough.md`
Brief for the Tuesday team walkthrough covering scope, demo flow, pilot posture, and meeting decisions.

9. `pilot-kickoff-checklist.md`
Readiness checklist for the Monday reviewer alpha, including safety, connectivity, and feedback capture.

10. `checklist-map.md`
Condensed operational map of the current objective review coverage as `auto`, `partial`, or `manual`.

11. `launch-scorecard.md`
Pilot and launch metrics for adoption, quality, governance, and reliability.

12. `reviewer-hub-rollout-spec.md`
Concrete rollout plan for six reviewer-specific Hubs, including mapping, tool exposure, write gates, and containment rules.

13. `reviewer-hub-implementation-checklist.md`
Operator checklist for Hub identity, discovery, trace validation, rate limits, quotas, and phased write enablement.

14. `reviewer-hub-runtime-posture.md`
Exact Hub server, discovery, and rollout posture for the six reviewer-specific Hub surfaces.

15. `reviewer-hub-policy-records.yaml`
Six separate reviewer-specific policy records for the authoritative Phase A rollout.

16. `reviewer-hub-phase-a-operator-runbook.md`
Exact deploy, normalize, and verify path for the six Phase A reviewer Hub surfaces.

17. `onboarding-skills.md`
Skill-led onboarding sequence for reviewers and operators, including what is included now versus gated for later rollout phases.

18. `notion-agent-prompt.md`
Minimal Notion agent instruction prompt for reviewer-specific Webflow template review Hubs, including discovery refresh, claim/version-id lookup, visibility-vs-capability language, and trace reporting.

## Reading order

1. `delivery-package.md`
2. `outcome_contract.md`
3. `reviewer-playbook.md`
4. `runbook.md`
5. `pilot-kickoff-checklist.md`
6. `team-walkthrough.md`
7. `golden-task-checks.md`
8. `mcp_contract.yaml`
9. `agent_contract.yaml`
10. `checklist-map.md`
11. `launch-scorecard.md`
12. `reviewer-hub-rollout-spec.md`
13. `reviewer-hub-implementation-checklist.md`
14. `reviewer-hub-runtime-posture.md`
15. `reviewer-hub-policy-records.yaml`
16. `reviewer-hub-phase-a-operator-runbook.md`
17. `onboarding-skills.md`
18. `notion-agent-prompt.md`

## Related source material

- `specs/webflow-marketplace/OVERVIEW.md`
- `docs/webflow-template-checklist-mcp-coverage.md`
- `docs/MCP_HUB_CONTROL_PLANE.md`
- `docs/HUB_EXECUTION_GOVERNANCE_PLAN.md`
- `packages/webflow-template-review-mcp/README.md`
- `packages/webflow-site-analyzer-mcp/README.md`
- `packages/webflow-mcp/README.md`

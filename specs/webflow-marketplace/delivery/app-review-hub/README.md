# Webflow Marketplace App Review Hub Delivery Pack

**Status:** Working draft  
**Prepared:** 2026-03-10  
**Audience:** Webflow Marketplace team

This folder packages the current Webflow app review MCP work into a delivery-ready rollout and policy pack for the initial app reviewer cohort.

The goal is to make the app-review lane operationally safe before wider rollout by defining:

- what the app-review Hub lane is
- which reviewer actions stay human-owned
- which tools may be exposed in reviewer-facing discovery
- what must be true before writes are enabled
- how reviewers and operators fall back when the workflow is uncertain

## Important current-state note

The codebase contains a dedicated app-review MCP server:

- `packages/webflow-app-review-mcp`

But the current worker auth model is still a shared bearer token at the MCP boundary. That means reviewer-specific attribution is not yet guaranteed by the MCP server itself.

Until reviewer identity is injected and traced by the outer Hub layer, this pack treats the app-review lane as a **read-only evidence lane** with manual Airtable fallback for official state changes.

## Contents

1. `reviewer-hub-rollout-spec.md`
Concrete rollout plan for the first two app reviewers, including mapping, tool exposure, write gates, and containment rules.

2. `reviewer-hub-runtime-posture.md`
Exact Hub posture to use for reviewer-facing app-review access based on the current MCP implementation.

3. `reviewer-hub-policy-records.yaml`
Reviewer-specific Phase A policy records for the two-reviewer pilot.

4. `reviewer-playbook.md`
Day-to-day instructions for app reviewers using the Hub lane.

5. `runbook.md`
Operator procedures for exception handling, fallback, containment, and recovery.

## Reading order

1. `reviewer-hub-rollout-spec.md`
2. `reviewer-hub-runtime-posture.md`
3. `reviewer-hub-policy-records.yaml`
4. `reviewer-playbook.md`
5. `runbook.md`

## Related source material

- `packages/webflow-app-review-mcp/README.md`
- `packages/webflow-app-review-mcp/src/tools.ts`
- `packages/webflow-app-review-mcp/src/prompts.ts`
- `packages/webflow-app-review-mcp/src/resources.ts`
- `packages/webflow-app-review-mcp/worker/index.ts`
- `specs/webflow-marketplace/use-cases.md`
- `specs/webflow-marketplace/volume-analysis.md`

# Webflow Marketplace App Review Hub Delivery Pack

**Status:** Live production pack  
**Prepared:** 2026-03-13  
**Audience:** Webflow Marketplace team

This folder packages the current Webflow app review MCP work into a delivery-ready rollout and policy pack for the initial app reviewer cohort.

The goal is to keep the live app-review lane operationally safe by defining:

- what the app-review Hub lane is
- which reviewer actions stay human-owned
- which tools are currently exposed in reviewer-facing discovery
- how production posture is maintained
- how reviewers and operators fall back when the workflow is uncertain

## Important current-state note

The codebase contains a dedicated app-review MCP server:

- `packages/webflow-app-review-mcp`

But the current worker auth model is still a shared bearer token at the MCP boundary. Reviewer-specific attribution therefore depends on the outer Hub account context plus `REVIEWER_DIRECTORY_JSON`.

As of `2026-03-13`, both reviewer hubs are live in production with the full downstream `webflow-app-review-mcp` tool surface visible. The old compact 6-tool Phase A posture is now the rollback mode, not the default.

## Contents

1. `reviewer-hub-rollout-spec.md`
Concrete rollout plan for the first two app reviewers, including mapping, tool exposure, write gates, and containment rules.

2. `reviewer-hub-runtime-posture.md`
Exact Hub posture to use for reviewer-facing app-review access based on the current MCP implementation.

3. `reviewer-hub-policy-records.yaml`
Reviewer-specific production policy records for the two live reviewer hubs.

4. `reviewer-playbook.md`
Day-to-day instructions for app reviewers using the Hub lane.

5. `runbook.md`
Operator procedures for exception handling, fallback, containment, and recovery.

6. `auth0-reviewer-user-manifest.json`
Auth0 invite manifest for the two-reviewer app-review pilot.

7. `reviewer-hub-phase-a-operator-runbook.md`
Rollback/read-only operator path for restoring the original compact reviewer posture if production writes must be withdrawn.

8. `confirmed-field-inventory.md`
Reviewer-confirmed Airtable field inventory from Pablo Miranda for the app-review workflow.

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
- `docs/WEBFLOW_APP_REVIEW_AUTH0_PROVISIONING_CHECKLIST.md`
- `docs/examples/webflow-app-review-user-seed.csv`
- `specs/webflow-marketplace/delivery/app-review-hub/auth0-reviewer-user-manifest.json`
- `specs/webflow-marketplace/delivery/app-review-hub/confirmed-field-inventory.md`
- `specs/webflow-marketplace/delivery/app-review-hub/reviewer-hub-phase-a-operator-runbook.md`
- `specs/webflow-marketplace/use-cases.md`
- `specs/webflow-marketplace/volume-analysis.md`

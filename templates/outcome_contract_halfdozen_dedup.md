# Outcome Contract v1 — Half Dozen Dedup

## 1) Engagement
- Client: `half-dozen`
- Engagement ID: `hd-dedup-v1`
- Package Name: `Policy OS`
- Approved Workflows: `notion-contact-dedup`
- Approval Mode: `hybrid`
- Escalation Policy: `HD-DEDUP-POLICY`
- Review Cadence: `weekly review + monthly tuning`
- Primary Interface: `Codex` (portable artifacts required)

## 2) Target Workflows

1. Nightly duplicate-cluster detection in target Notion data sources.
2. Canonical merge execution with relation repair before archive.
3. Ambiguous-cluster escalation when confidence is below policy threshold.

For each workflow, define:
- Trigger event: scheduled nightly run and manual replay trigger.
- Required systems: `halfdozen-notion-mcp`, `halfdozen-gmail-sync`, telemetry resources.
- Expected output artifact: `dedupe_report.json`, `merge_plan.md`, escalation record.
- Human approval requirement: required for destructive archive operations.

## 3) Success Metrics

- Time to first autonomous outcome: `<= 14 days`
- Golden task pass rate: `>= 90%`
- Manual effort reduction: `>= 60%` reduction in monthly manual dedupe effort
- Error/escalation rate ceiling: `<= 15%` of clusters escalated due to ambiguity

## 4) Fallback and Manual Path

- If policy confidence is below threshold: route cluster to human owner with ranked candidates.
- If write operation is blocked: return merge draft artifact and escalation ticket.
- If dependency fails: freeze archive step; preserve all records; route remediation to operator.

## 5) Ownership Boundaries

- Client owns canonical tie-break decisions and approval of destructive actions.
- CREATE SOMETHING owns tool orchestration, quality gates, and rollback workflow.
- Both parties review merge precision drift monthly.

## 6) Handoff Bundle

- [ ] `mcp_contract_halfdozen_dedup.yaml`
- [ ] `agent_contract_halfdozen_dedup.yaml`
- [ ] `outcome_contract_halfdozen_dedup.md`
- [ ] `golden_tasks_halfdozen_dedup.yaml`
- [ ] Endpoint inventory and auth scope matrix
- [ ] Tool/resource/prompt registry
- [ ] Incident and rollback runbook

## 7) Change Control

- Policy threshold changes require explicit owner approval.
- New destructive tools require security review.
- Contract/pricing-affecting decisions are always human approved.

## 8) Review Cadence
- Weekly: dedupe pass rate + escalation summary
- Monthly: merge precision calibration
- Quarterly: portability and architecture review

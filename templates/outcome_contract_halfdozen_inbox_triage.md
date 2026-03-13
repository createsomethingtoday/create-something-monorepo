# Outcome Contract v1 — Half Dozen Inbox Triage

## 1) Engagement
- Client: `half-dozen`
- Engagement ID: `hd-inbox-triage-v1`
- Package Name: `Policy OS`
- Approved Workflows: `gmail-inbox-triage`
- Approval Mode: `hybrid`
- Escalation Policy: `HD-INBOX-TRIAGE-POLICY`
- Review Cadence: `weekly review + monthly tuning`
- Primary Interface: `Codex` (portable artifacts required)

## 2) Target Workflows

1. Continuous inbox triage and sync of eligible threads to Notion interactions.
2. Contact resolution and enrichment during sync workflow.
3. Automation health management (preview, create, pause/resume, incident escalation).

For each workflow, define:
- Trigger event: 15-minute polling window plus manual replay.
- Required systems: `halfdozen-gmail-sync`, Notion workspace, telemetry resources.
- Expected output artifact: triage summary JSON, sync report, contact enrichment log.
- Human approval requirement: required for sensitive threads and policy-triggered writes.

## 3) Success Metrics

- Time to first autonomous outcome: `<= 14 days`
- Golden task pass rate: `>= 90%`
- Manual effort reduction: `>= 50%` reduction in manual inbox-to-CRM processing
- Error/escalation rate ceiling: `<= 20%` for high-risk/sensitive thread escalations

## 4) Fallback and Manual Path

- If policy confidence is below threshold: queue thread for human triage.
- If write operation is blocked: return draft triage note with recommended action.
- If dependency fails: pause automation and route thread IDs to manual queue.

## 5) Ownership Boundaries

- Client owns sensitive handling decisions and final contact/link approval.
- CREATE SOMETHING owns integration reliability, approval policy enforcement, and runbook.
- Both parties review triage quality and false-positive escalations monthly.

## 6) Handoff Bundle

- [ ] `mcp_contract_halfdozen_inbox_triage.yaml`
- [ ] `agent_contract_halfdozen_inbox_triage.yaml`
- [ ] `outcome_contract_halfdozen_inbox_triage.md`
- [ ] `golden_tasks_halfdozen_inbox_triage.yaml`
- [ ] Endpoint inventory and auth scope matrix
- [ ] Tool/resource/prompt registry
- [ ] Incident and rollback runbook

## 7) Change Control

- Escalation trigger changes require explicit owner approval.
- Tool scope expansion requires security and compliance review.
- Pricing/commercial terms remain human approved.

## 8) Review Cadence
- Weekly: triage SLA, approval rate, and escalation incidents
- Monthly: contact-link accuracy review and policy tuning
- Quarterly: portability and architecture review

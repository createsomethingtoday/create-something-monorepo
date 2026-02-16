# Outcome Contract v1 — Half Dozen Fleet Watchdog

## 1) Engagement
- Client: `half-dozen`
- Engagement ID: `hd-fleet-watchdog-v1`
- Delivery Model: `Agent Outcome Stack`
- Primary Interface: `Codex` (portable artifacts required)

## 2) Target Workflows

1. Hourly MCP fleet health scan and anomaly flagging.
2. Error pattern triage and incident-ready summary generation.
3. Period trend reporting for reliability and usage drift.

For each workflow, define:
- Trigger event: hourly schedule plus event-driven high-error spike trigger.
- Required systems: `halfdozen-telemetry-mcp`, `halfdozen-feedback` D1 telemetry.
- Expected output artifact: health snapshot JSON, incident report, remediation plan.
- Human approval requirement: required for cleanup and any destructive maintenance operation.

## 3) Success Metrics

- Time to first autonomous outcome: `<= 14 days`
- Golden task pass rate: `>= 90%`
- Manual effort reduction: `>= 70%` reduction in manual fleet health checks
- Error/escalation rate ceiling: `<= 10%` false-positive incident escalations

## 4) Fallback and Manual Path

- If policy confidence is below threshold: route incident draft to on-call owner.
- If write operation is blocked: return remediation draft without mutation.
- If dependency fails: fall back to manual health prompt workflow and raise incident.

## 5) Ownership Boundaries

- Client owns incident severity decisions and production remediation approvals.
- CREATE SOMETHING owns telemetry analysis logic, monitoring thresholds, and rollback playbook.
- Both parties review threshold tuning and incident quality monthly.

## 6) Handoff Bundle

- [ ] `mcp_contract_halfdozen_fleet_watchdog.yaml`
- [ ] `agent_contract_halfdozen_fleet_watchdog.yaml`
- [ ] `outcome_contract_halfdozen_fleet_watchdog.md`
- [ ] `golden_tasks_halfdozen_fleet_watchdog.yaml`
- [ ] Endpoint inventory and auth scope matrix
- [ ] Tool/resource/prompt registry
- [ ] Incident and rollback runbook

## 7) Change Control

- Threshold changes require technical owner approval.
- SQL/tool permission changes require security review.
- Commercial-impacting decisions are always human approved.

## 8) Review Cadence
- Weekly: incident summary + degraded service count
- Monthly: trend analysis and threshold recalibration
- Quarterly: portability and architecture review

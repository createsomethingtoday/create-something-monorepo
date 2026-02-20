# Outcome Contract v1

## 1) Engagement
- Client: `<client-name>`
- Engagement ID: `<engagement-id>`
- Delivery Model: `Agent Outcome Stack` (default) or `MCP-only` (exception)
- Primary Interface: `Codex` (portable artifacts required)

## 2) Target Workflows
List the workflows that must improve.

1. `<workflow-1>`
2. `<workflow-2>`
3. `<workflow-3>`

For each workflow, define:
- Trigger event
- Required systems
- Expected output artifact
- Human approval requirement
- Broker path (`search -> describe -> invoke`) and allowed tool refs

## 3) Success Metrics
Define measurable outcomes.

- Time to first autonomous outcome: `<= 14 days`
- Golden task pass rate: `>= 90%`
- Manual effort reduction: `<target-%>`
- Error/escalation rate ceiling: `<target-%>`

## 4) Fallback and Manual Path
Define safe fallback behavior.

- If policy confidence is below threshold: route to human owner.
- If write operation is blocked: return draft artifact and escalation ticket.
- If dependency fails: use documented manual workflow and capture incident.
- If quota is exceeded: pause autonomous retries and escalate with correlation id.

## 5) Ownership Boundaries
Clarify who owns what.

- Client owns business decisions, approvals, and policy sign-off.
- CREATE SOMETHING owns integration architecture, quality gates, and runbook maintenance.
- Both parties review model behavior drift on agreed cadence.

## 6) Handoff Bundle
All items are required for completion.

- [ ] `mcp_contract.yaml`
- [ ] `agent_contract.yaml`
- [ ] `outcome_contract.md`
- [ ] `golden_tasks.yaml`
- [ ] Endpoint inventory and auth scope matrix
- [ ] Broker scope matrix (allowed tool refs, connectors, server routes)
- [ ] Tenant policy defaults + quota defaults
- [ ] Tool/resource/prompt registry
- [ ] Incident and rollback runbook
- [ ] Correlation and trace lookup instructions (`x-correlation-id`, `hub_trace_lookup`)

## 7) Change Control
How changes are approved.

- Policy change requests require explicit owner approval.
- Tool scope expansions require security review.
- Direct proxy exposure (`compat` mode) requires migration expiry date and owner sign-off.
- Pricing/commercial logic changes are always human approved.

## 8) Review Cadence
- Weekly: golden task report + incident summary
- Monthly: policy tuning and roadmap update
- Quarterly: architecture and portability review

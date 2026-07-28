# Outcome Contract v1

## 1) Engagement
- Client: `<client-name>`
- Engagement ID: `<engagement-id>`
- Package Name: `Policy OS` (default) or `MCP-only` (exception)
- Approved Workflows:
  - `<workflow-1>`
- Approval Mode: `hybrid`
- Escalation Policy: `<policy-id-or-runbook-section>`
- Review Cadence: `weekly review + monthly tuning`
- Billing and Entitlement Assumptions:
  - service tier: `policy_os_trial`
  - service entitled: `true`
  - policy accepted: `true`
  - contract active: `true`
  - billing active: `true`
- Delivery Vector Canonical Phrase: `Skills on MCP`
- Delivery Vector (Client-Facing): `Skills + MCP`
- Delivery Vector (Technical): `MCP + Skills`
- Primary Interface: `Codex` (portable artifacts required)

### Managed AI Operations boundary

- Managed production environment: `<environment-name>`
- Managed AI Operations starts at `$900 per month` for standard-risk operation after launch.
- Agent count is not metered.
- AI usage remains client-funded or separately metered.
- At 75% of forecasted monthly coverage, open a capacity review; do not apply an automatic charge.
- New workflows and integrations require a separately scoped Build.
- Higher-risk, regulated, multi-environment, and priority-response operation requires custom scope.

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
- [ ] `runbook.md`
- [ ] Endpoint inventory and auth scope matrix
- [ ] Tool/resource/prompt registry
- [ ] Incident and rollback runbook

## 7) Change Control
How changes are approved.

- Policy change requests require explicit owner approval.
- Tool scope expansions require security review.
- Pricing/commercial logic changes are always human approved.

## 8) Messaging and Trust
Positioning rules that remain aligned across sales, delivery, and technical proof.

- Operator-facing pages and outreach lead with `Skills + MCP`.
- Technical architecture, security, and compliance surfaces use `MCP + Skills`.
- Technical positioning statement: `MCP is the substrate for auth, trust boundaries, portability, and governance; Skills are the behavior layer.`
- Context-bloat objection handling: `We scope tool access by bundle and workflow so only relevant capabilities enter context.`
- Moat emphasis order: custom MCP creation, auth/security boundary design, policy artifacts, approval/escalation runbooks, monthly tuning.

## 9) Review Cadence
- Weekly: golden task report + incident summary
- Monthly: policy tuning and roadmap update
- Quarterly: architecture and portability review

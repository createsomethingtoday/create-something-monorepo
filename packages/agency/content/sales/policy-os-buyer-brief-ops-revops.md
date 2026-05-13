# Workflow Infrastructure Buyer Brief (Ops/RevOps)

- **Audience:** Ops and RevOps leaders
- **Read time:** ~3 minutes
- **Core phrase:** Trusted workflow infrastructure
- **Thesis:** A connected agent is not a trusted workflow.
- **Delivery vector language:** client-facing `Skills + MCP`; technical proof `MCP + Skills`

---

## What this solves

Most teams can now connect agents to tools. That does not make those agents trustworthy workflow owners.

The bottleneck is no longer "Can we connect systems?"
The bottleneck is "Can we govern actions, approvals, and risk while keeping execution fast?"

This operating model closes that gap.

---

## Outcome in plain terms

You get:

- Fewer unsafe actions in live workflows.
- Faster execution on safe actions.
- Clear approvals for risky actions.
- Auditable decision trails for operations and leadership.

This is how automation scales without creating hidden operational risk.

---

## Offer ladder (how engagements scale)

### 1) Workflow Infrastructure
Build the workflow substrate: trusted integrations, tool contracts, and deterministic execution paths.

### 2) Policy OS
Add governed execution controls: policy envelopes, release gates, approval rules, blocked-state UX, and incident loops.

### 3) Enterprise Extension
Extend into high-stakes operations: cross-system orchestration, strict governance controls, and custom trust boundaries.

---

## What ships every engagement

- `mcp_contract.yaml`  
  Tool schemas, resources, auth scopes, error model.
- `agent_contract.yaml`  
  Allowed actions, approval mode, escalation triggers, budget/latency guardrails.
- `outcome_contract.md`  
  Workflow targets, success criteria, fallback/manual path, ownership boundaries.
- `golden_tasks.yaml` + runbook
  Regression gates, incident response, rollback path.

---

## Operating model (how this works)

1. Safe actions are auto-allowed.
2. Risky actions route to an approval inbox.
3. Disallowed actions are blocked with explicit reason.
4. Every decision is logged for audit and tuning.

This keeps operational speed where risk is low, and control where risk is high.

---

## Reliability KPIs to track

- **Unreviewed risky actions prevented**
- **Approval turnaround time**
- **Incident rate trend**
- **Governed workflow coverage**

These metrics are the health signal for production autonomy.

---

## Common objections (short answers)

### "We already have automations."
Most automations fail at governance boundaries. This model adds approvals, policy control, and auditability so automation can scale safely.

### "This sounds heavy."
It is phased. Start with one high-value workflow, govern only the risky actions, then expand coverage with evidence.

### "Why not MCP-only?"
MCP-only is a valid entry wedge for discovery/compliance. A connected agent is not a trusted workflow; Policy OS is what makes autonomous outcomes dependable in production.

---

## Next step

### Workflow Mapping Session

Output from session:

1. Pilot workflow scope.
2. Policy boundary (auto-allow vs approval vs block).
3. 30-day implementation plan.

If the map is not convincing, do not proceed.

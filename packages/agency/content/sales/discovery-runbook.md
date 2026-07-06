# Workflow Discovery Runbook

**Audience:** CREATE SOMETHING `.agency` operators  
**Purpose:** run discovery as workflow diagnosis and trust-boundary mapping, not tool intake

---

## Outcome

A successful discovery yields:

- one workflow candidate
- one business owner
- one proposed trust boundary
- one recommended package path
- one dated next action

The runbook is complete only when those are written down.

---

## Phase 1: Pre-call preparation

Review before the call:

- company context
- likely workflow category
- likely systems involved
- current automation footprint
- probable risk profile

Prepare a working hypothesis in this format:

`[team] is struggling with [workflow] because [handoff/risk/failure], and the cost likely appears as [delay/rework/incidents/revenue leakage].`

Do not prepare a solution architecture before hearing the workflow.

---

## Phase 2: Discovery call

### Opening objective

State that the call is for workflow diagnosis and fit determination.

Default opening:

> "I want to understand where the workflow is breaking down, what actions need to stay governed, and whether there is a clear wedge to map."

### Minimum questions

Ask these before talking about implementation:

1. What business outcome matters in the next 30 days?
2. Which workflow breaks most often or costs the most when it breaks?
3. What systems must stay in sync for that workflow to work?
4. Which actions can run automatically today?
5. Which actions still require a human gate?
6. What is the cost of one bad failure?
7. Who owns the workflow operationally?

### Three-Tier mapping

During the call, classify answers live:

- `Database`: source systems, records, state, freshness
- `Automation`: actions, tool paths, handoffs, retries
- `Judgment`: approvals, exceptions, escalation, blocked actions

### Playback

Use this structure:

> "Here is the workflow I think matters, where it breaks, what systems are involved, and where the trust boundary actually is."

If the buyer disagrees, correct the map before discussing any package.

---

## Phase 3: Policy boundary definition

For the selected workflow, classify actions into:

- `auto-allow`
- `approval-required`
- `block`

Then capture:

- escalation trigger
- fallback/manual path
- audit expectation
- release-gate condition

This is the handoff point between workflow discovery and Policy OS scope.

---

## Phase 4: Package routing

Use these routing rules:

- `MCP-only wedge` if trusted connectivity is the primary need
- `Workflow Infrastructure` if the workflow needs deterministic execution paths
- `Policy OS` if action governance is required
- `Enterprise Extension` if stakes, regulation, or orchestration depth are high

Default rule:

If the buyer describes write actions, approvals, or incident risk, do not stop at MCP-only.

---

## Phase 5: Post-call artifacts

Every discovery must result in:

1. Completed discovery note
2. Fit classification
3. Recommended next step
4. Proposal-ready implications for:
   `mcp_contract.yaml`
   `agent_contract.yaml`
   `outcome_contract.md`

Use the proposal template only after the discovery note is complete.

---

## Workflow Mapping Session standard

If discovery is high-fit, the next step is a paid Workflow Mapping Session.

That session must deliver:

1. Pilot workflow scope
2. Policy boundary
3. 30-day implementation plan

If you cannot confidently state those three outputs, do not position the session as complete.

---

## Langfuse usage standard

When Langfuse appears in the conversation, frame it correctly:

- Langfuse provides traces, evals, and observability
- Langfuse helps inspect policy outcomes and runtime behavior
- Langfuse does not replace policy artifacts or approval logic

Use it as evidence infrastructure, not as the governance mechanism itself.

---

## Red flags

Slow down or re-scope when:

- the buyer only wants a list of integrations
- no workflow owner exists
- no failure cost can be named
- approval boundaries are vague
- onboarding/setup is being confused with operational design
- a regulated workflow is being treated as a generic automation request

---

## Close states

End every discovery in one of three states:

1. `Advance`
Workflow Mapping Session or scoped wedge booked

2. `Park`
Re-entry condition defined

3. `Refer`
Outside scope or better served by a partner
